import os
import uuid
import subprocess
from pathlib import Path

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app, supports_credentials=True)
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
