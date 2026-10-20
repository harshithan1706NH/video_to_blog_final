
import os
from flask import Flask, jsonify, request, session, send_file
from flask_cors import CORS
from db import get_db_connection
from export_docx import make_docx
from export_pdf import make_pdf

app = Flask(__name__)

app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "development-secret-key"
)


    origin.strip()
    for origin in os.getenv(
        "EDITOR_ALLOWED_ORIGINS",
        "http://127.0.0.1:5500,http://localhost:5500"
    ).split(",")
    if origin.strip()
]

CORS(
    app,
    origins=allowed_origins,
    supports_credentials=True
)


def fetch_blog(blog_id, user_id):
    """Fetch only a blog owned by the logged-in user."""
    connection = get_db_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT blog_id, user_id, title, content,
                   created_at, updated_at
            FROM blog_contents
            WHERE blog_id = %s AND user_id = %s
            """,
            (blog_id, user_id)
        )

        row = cursor.fetchone()
        cursor.close()

        if row is None:
            return None

        return {
            "blog_id": row[0],
            "user_id": row[1],
            "title": row[2] or "",
            "content": row[3] or "",
            "created_at": row[4].isoformat() if row[4] else None,
            "updated_at": row[5].isoformat() if row[5] else None
        }
    finally:
        connection.close()


def require_user():
    return session.get("user_id")


@app.get("/api/blogs/<int:blog_id>")
def get_blog(blog_id):
    user_id = require_user()

    if user_id is None:
        return jsonify({"error": "Please log in first."}), 401

    try:
        blog = fetch_blog(blog_id, user_id)

        if blog is None:
            return jsonify({"error": "Blog not found."}), 404

        return jsonify({"blog": blog})
    except Exception:
        app.logger.exception("Failed to load blog")
        return jsonify({"error": "Unable to load the blog."}), 500


@app.put("/api/blogs/<int:blog_id>")
def save_blog(blog_id):
    user_id = require_user()

    if user_id is None:
        return jsonify({"error": "Please log in first."}), 401

    data = request.get_json(silent=True) or {}
    title = data.get("title")
    content = data.get("content")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Please enter a title."}), 400

    if not isinstance(content, str) or not content.strip():
        return jsonify({"error": "Please enter blog content."}), 400

    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE blog_contents
            SET title = %s,
                content = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE blog_id = %s AND user_id = %s
            RETURNING blog_id, user_id, title, content,
                      created_at, updated_at
            """,
            (title.strip(), content, blog_id, user_id)
        )

        row = cursor.fetchone()

        if row is None:
            connection.rollback()
            return jsonify({"error": "Blog not found."}), 404

        connection.commit()
        cursor.close()

        blog = {
            "blog_id": row[0],
            "user_id": row[1],
            "title": row[2] or "",
            "content": row[3] or "",
            "created_at": row[4].isoformat() if row[4] else None,
            "updated_at": row[5].isoformat() if row[5] else None
        }

        return jsonify({
            "success": True,
            "message": "Blog saved successfully.",
            "blog": blog
        })
    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Failed to save blog")
        return jsonify({"error": "Unable to save the blog."}), 500
    finally:
        if connection:
            connection.close()


@app.get("/api/blogs/<int:blog_id>/export/docx")
def export_word(blog_id):
    user_id = require_user()

    if user_id is None:
        return jsonify({"error": "Please log in first."}), 401

    try:
        blog = fetch_blog(blog_id, user_id)

        if blog is None:
            return jsonify({"error": "Blog not found."}), 404

        return send_file(
            make_docx(blog),
            as_attachment=True,
            download_name=f"blog_{blog_id}.docx",
            mimetype=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            )
        )
    except Exception:
        app.logger.exception("Word export failed")
        return jsonify({"error": "Unable to export Word document."}), 500


@app.get("/api/blogs/<int:blog_id>/export/pdf")
def export_pdf_file(blog_id):
    user_id = require_user()

    if user_id is None:
        return jsonify({"error": "Please log in first."}), 401

    try:
        blog = fetch_blog(blog_id, user_id)

        if blog is None:
            return jsonify({"error": "Blog not found."}), 404

        return send_file(
            make_pdf(blog),
            as_attachment=True,
            download_name=f"blog_{blog_id}.pdf",
            mimetype="application/pdf"
        )
    except Exception:
        app.logger.exception("PDF export failed")
        return jsonify({"error": "Unable to export PDF."}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
