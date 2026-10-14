import os
import uuid
import subprocess
from pathlib import Path

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from flask import Flask, request, jsonify,session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

UPLOAD_DIR = BASE_DIR / "uploads"
AUDIO_DIR = BASE_DIR / "processing"
UPLOAD_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() 

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Name, email and password are required.",
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 8 characters.",
        }), 400

    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT user_id FROM users WHERE email = %s",
            (email,),
        )

        if cursor.fetchone():
            cursor.close()
            return jsonify({
                "success": False,
                "message": "An account with this email already exists.",
            }), 409

        password_hash = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING user_id
            """,
            (name, email, password_hash),
        )

        user_id = cursor.fetchone()[0]
        connection.commit()
        cursor.close()

        return jsonify({
            "success": True,
            "message": "Account created successfully.",
            "user_id": user_id,
        }), 201

    except Exception:
        if connection:
            connection.rollback()

       

        return jsonify({
            "success": False,
            "message": "Registration failed. Please try again.",
        }), 500

    finally:
        if connection:
            connection.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required.",
        }), 400

    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT user_id, name, email, password_hash
            FROM users
            WHERE email = %s
            """,
            (email,),
        )

        user = cursor.fetchone()
        cursor.close()

        if not user or not check_password_hash(user[3], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password.",
            }), 401

        session.clear()
        session["user_id"] = user[0]
        session["user_name"] = user[1]
        session["user_email"] = user[2]

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {
                "user_id": user[0],
                "name": user[1],
                "email": user[2],
            },
        }), 200

    except Exception:
        

        return jsonify({
            "success": False,
            "message": "Login failed. Please try again.",
        }), 500

    finally:
        if connection:
            connection.close()


@app.route("/session", methods=["GET"])
def check_session():
    if "user_id" not in session:
        return jsonify({
            "success": False,
            "logged_in": False,
            "message": "User is not logged in.",
        }), 401

    return jsonify({
        "success": True,
        "logged_in": True,
        "user": {
            "user_id": session["user_id"],
            "name": session["user_name"],
            "email": session["user_email"],
        },
    }), 200

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully.",
    }), 200

@app.route("/upload", methods=["POST"])
def upload_video():
    video_path = None

    try:
        required = [
            "CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
        ]
        if not all(os.getenv(k) for k in required):
            return jsonify({
                "success": False,
                "message": "Cloudinary settings missing in backend/.env",
            }), 500

        if "video" not in request.files:
            return jsonify({
                "success": False,
                "message": "No video file provided.",
            }), 400

        file = request.files["video"]
        if not file.filename:
            return jsonify({
                "success": False,
                "message": "Please select a video.",
            }), 400

        if Path(file.filename).suffix.lower() != ".mp4":
            return jsonify({
                "success": False,
                "message": "Only MP4 videos are supported.",
            }), 400

        video_id = uuid.uuid4().hex
        filename = secure_filename(file.filename) or "video.mp4"
        video_path = UPLOAD_DIR / f"{video_id}.mp4"
        audio_path = AUDIO_DIR / f"{video_id}.wav"

        file.save(video_path)

        probe = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            capture_output=True, text=True, check=True,
        )
        duration = float(probe.stdout.strip())

        if duration <= 0 or duration > 1800:
            return jsonify({
                "success": False,
                "message": "Video duration must not exceed 30 minutes.",
            }), 400

        result = cloudinary.uploader.upload(
            str(video_path),
            resource_type="video",
            folder="video_to_blog",
            public_id=video_id,
        )

        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(video_path),
                "-vn", "-ac", "1", "-ar", "16000",
                "-c:a", "pcm_s16le", str(audio_path),
            ],
            capture_output=True, text=True, check=True,
        )

        return jsonify({
            "success": True,
            "message": "Video uploaded and audio extracted.",
            "filename": filename,
            "duration_seconds": duration,
            "public_id": result["public_id"],
            "video_url": result["secure_url"],
            "audio_file": str(audio_path),
        })

    except subprocess.CalledProcessError:
        app.logger.exception("FFmpeg/FFprobe error")
        return jsonify({
            "success": False,
            "message": "Video processing failed. Check FFmpeg installation.",
        }), 400
    except Exception:
        app.logger.exception("Upload error")
        return jsonify({
            "success": False,
            "message": "Upload failed. Check backend settings and logs.",
        }), 500
    finally:
        if video_path and video_path.exists():
            video_path.unlink(missing_ok=True)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
