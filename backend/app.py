from flask import Flask, request, jsonify, session
from flask_cors import CORS
from db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import subprocess
import os
import uuid
import shutil
from transcript_cleaner import clean_transcript
from audio_chunker import chunk_audio
from blog_generator import generate_blog, save_blog

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

app = Flask(__name__)

app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "development-secret-key"
)

CORS(app, supports_credentials=True)

FFMPEG_PATH = "ffmpeg"
FFPROBE_PATH = "ffprobe"

PARAKEET_PYTHON = os.getenv("PARAKEET_PYTHON")

PARAKEET_TRANSCRIBER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "parakeet_transcriber.py"
)

MAX_VIDEO_DURATION = 30 * 60


@app.route("/")
def home():
    return "Backend is running!"


@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No registration data received"
        }), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required"
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required"
        }), 400

    if not password:
        return jsonify({
            "success": False,
            "message": "Password is required"
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must be at least 6 characters long"
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT user_id FROM users WHERE email = %s",
            (email,)
        )

        if cursor.fetchone():
            return jsonify({
                "success": False,
                "message": "An account with this email already exists"
            }), 409

        password_hash = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users
            (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING user_id
            """,
            (name, email, password_hash)
        )

        user_id = cursor.fetchone()[0]

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Registration successful",
            "user_id": user_id
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "message": "Registration failed",
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No login data received"
        }), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required"
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT user_id, name, email, password_hash
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        user_id, name, stored_email, password_hash = user

        if not check_password_hash(password_hash, password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        session["user_id"] = user_id
        session["user_name"] = name
        session["user_email"] = stored_email

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "user_id": user_id,
                "name": name,
                "email": stored_email
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Login failed",
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.route("/session", methods=["GET"])
def get_session():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "authenticated": False
        }), 401

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "user_id": session.get("user_id"),
            "name": session.get("user_name"),
            "email": session.get("user_email")
        }
    }), 200


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    }), 200


def get_video_duration(video_path):
    command = [
        FFPROBE_PATH,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        video_path
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise Exception(
            f"Could not determine video duration: {result.stderr}"
        )

    return float(result.stdout.strip())


def extract_audio(video_path, output_path):
    command = [
        FFMPEG_PATH,
        "-y",
        "-i",
        video_path,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        output_path
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise Exception(
            f"Audio extraction failed: {result.stderr}"
        )


def transcribe_audio_chunks(
    chunks_folder,
    transcripts_folder
):
    if not PARAKEET_PYTHON:
        raise Exception(
            "PARAKEET_PYTHON is not configured in .env"
        )

    if not os.path.exists(PARAKEET_PYTHON):
        raise Exception(
            f"Parakeet Python environment not found: "
            f"{PARAKEET_PYTHON}"
        )

    if not os.path.exists(PARAKEET_TRANSCRIBER):
        raise Exception(
            f"Parakeet transcriber not found: "
            f"{PARAKEET_TRANSCRIBER}"
        )

    os.makedirs(
        transcripts_folder,
        exist_ok=True
    )

    command = [
        PARAKEET_PYTHON,
        PARAKEET_TRANSCRIBER,
        chunks_folder,
        transcripts_folder
    ]

    print(
        "Starting Parakeet transcription...",
        flush=True
    )

    result = subprocess.run(
        command,
        text=True
    )

    if result.returncode != 0:
        raise Exception(
            "Parakeet transcription failed"
        )

    print(
        "Parakeet transcription completed.",
        flush=True
    )


@app.route("/upload", methods=["POST"])
def upload_video():
    if not session.get("user_id"):
        return jsonify({
            "success": False,
            "message": "Please log in before uploading a video"
        }), 401

    if "video" not in request.files:
        return jsonify({
            "success": False,
            "message": "No video file received"
        }), 400

    video = request.files["video"]

    if video.filename == "":
        return jsonify({
            "success": False,
            "message": "No video file selected"
        }), 400

    filename = video.filename

    if not filename.lower().endswith(".mp4"):
        return jsonify({
            "success": False,
            "message": "Only MP4 videos are supported"
        }), 400

    backend_folder = os.path.dirname(
        os.path.abspath(__file__)
    )

    upload_folder = os.path.join(
        backend_folder,
        "uploads"
    )

    processing_folder = os.path.join(
        backend_folder,
        "processing"
    )

    os.makedirs(
        upload_folder,
        exist_ok=True
    )

    os.makedirs(
        processing_folder,
        exist_ok=True
    )

    unique_id = str(uuid.uuid4())

    temp_path = os.path.join(
        upload_folder,
        f"{unique_id}.mp4"
    )

    connection = None
    cursor = None

    video_processing_folder = None
    audio_path = None
    chunks_folder = None
    transcripts_folder = None

    try:
        video.save(temp_path)

        duration = get_video_duration(
            temp_path
        )

        duration_seconds = int(
            round(duration)
        )

        if duration_seconds > MAX_VIDEO_DURATION:
            os.remove(temp_path)

            return jsonify({
                "success": False,
                "message": "Video duration must not exceed 30 minutes",
                "duration_seconds": duration_seconds
            }), 400

        cloudinary_result = cloudinary.uploader.upload(
            temp_path,
            resource_type="video",
            folder="blog_videos"
        )

        video_url = cloudinary_result.get(
            "secure_url"
        )

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO videos
            (
                user_id,
                filename,
                format,
                duration_seconds,
                cloudinary_url
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING video_id, uploaded_at
            """,
            (
                session.get("user_id"),
                filename,
                "mp4",
                duration_seconds,
                video_url
            )
        )

        video_id, uploaded_at = cursor.fetchone()

        connection.commit()

        video_processing_folder = os.path.join(
            processing_folder,
            f"video_{video_id}"
        )

        os.makedirs(
            video_processing_folder,
            exist_ok=True
        )

        audio_path = os.path.join(
            video_processing_folder,
            "audio.wav"
        )

        extract_audio(
            temp_path,
            audio_path
        )

        os.remove(temp_path)

        chunks_folder = os.path.join(
            video_processing_folder,
            "chunks"
        )

        chunks = chunk_audio(
            audio_path,
            chunks_folder,
            duration_seconds
        )

        for chunk in chunks:
            cursor.execute(
                """
                INSERT INTO audio_chunks
                (
                    video_id,
                    chunk_number,
                    start_time_seconds,
                    end_time_seconds,
                    chunk_filename
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING audio_chunk_id
                """,
                (
                    video_id,
                    chunk["chunk_number"],
                    chunk["start_time_seconds"],
                    chunk["end_time_seconds"],
                    chunk["filename"]
                )
            )

            chunk["audio_chunk_id"] = cursor.fetchone()[0]

        connection.commit()

        transcripts_folder = os.path.join(
            video_processing_folder,
            "transcripts"
        )

        transcribe_audio_chunks(
            chunks_folder,
            transcripts_folder
        )

        transcript_parts = []

        for chunk in chunks:
            transcript_filename = (
                f"chunk_{chunk['chunk_number']:03d}.txt"
            )

            transcript_path = os.path.join(
                transcripts_folder,
                transcript_filename
            )

            if not os.path.exists(
                transcript_path
            ):
                raise Exception(
                    f"Transcript not created for "
                    f"{chunk['filename']}"
                )

            with open(
                transcript_path,
                "r",
                encoding="utf-8"
            ) as file:
                transcript_text = file.read().strip()

            cursor.execute(
                """
                INSERT INTO transcripts
                (
                    video_id,
                    transcript_text,
                    audio_chunk_id
                )
                VALUES (%s, %s, %s)
                """,
                (
                    video_id,
                    transcript_text,
                    chunk["audio_chunk_id"]
                )
            )

            transcript_parts.append(
                transcript_text
            )

        connection.commit()

        combined_transcript = "\n\n".join(
            transcript_parts
        )

        combined_path = os.path.join(
            transcripts_folder,
            "combined_transcript.txt"
        )

        with open(
            combined_path,
            "w",
            encoding="utf-8"
        ) as file:
            file.write(combined_transcript)

        cleaned_transcript = clean_transcript(
            combined_transcript
        )

        cursor.execute(
            """
            UPDATE videos
            SET combined_transcript = %s,
                cleaned_transcript = %s
            WHERE video_id = %s
            """,
            (
                combined_transcript,
                cleaned_transcript,
                video_id
            )
        )

        connection.commit()

        print(
            "Generating blog with Ollama...",
            flush=True
        )

        title, content = generate_blog(
            cleaned_transcript
        )

        print(
            "Saving generated blog...",
            flush=True
        )

        blog = save_blog(
            video_id,
            session.get("user_id"),
            title,
            content
        )

        print(
            "Blog generation completed.",
            flush=True
        )

        return jsonify({
            "success": True,
            "message": (
                "Video uploaded, processed, transcribed, "
                "cleaned and blog generated successfully"
            ),
            "video": {
                "video_id": video_id,
                "filename": filename,
                "format": "mp4",
                "duration_seconds": duration_seconds,
                "cloudinary_url": video_url,
                "uploaded_at": uploaded_at.isoformat()
            },
            "audio_path": audio_path,
            "chunks": [
                {
                    "audio_chunk_id": chunk["audio_chunk_id"],
                    "chunk_number": chunk["chunk_number"],
                    "start_time_seconds": chunk["start_time_seconds"],
                    "end_time_seconds": chunk["end_time_seconds"],
                    "chunk_filename": chunk["filename"]
                }
                for chunk in chunks
            ],
            "transcript_path": combined_path,
            "transcript": combined_transcript,
            "cleaned_transcript": cleaned_transcript,
            "blog": {
                "blog_id": blog["blog_id"],
                "title": blog["title"],
                "content": blog["content"],
                "created_at": blog["created_at"].isoformat(),
                "updated_at": blog["updated_at"].isoformat()
            }
        }), 200

    except Exception as e:
        if connection:
            connection.rollback()

        if os.path.exists(temp_path):
            os.remove(temp_path)

        if video_processing_folder and os.path.exists(
            video_processing_folder
        ):
            shutil.rmtree(
                video_processing_folder
            )

        return jsonify({
            "success": False,
            "message": "Video processing failed",
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


if __name__ == "__main__":
    app.run(
        debug=True,
        port=5000
    )