import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from db import get_db_connection

load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv("FLASK_SECRET_KEY")

if not app.secret_key:
    raise RuntimeError("FLASK_SECRET_KEY is missing from the .env file")

CORS(
    app,
    supports_credentials=True,
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
            "message": "All fields are required"
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters"
        }), 400

    conn = None

    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT user_id FROM users WHERE email = %s",
                (email,)
            )

            if cursor.fetchone():
                return jsonify({
                    "success": False,
                    "message": "Email is already registered"
                }), 409

            password_hash = generate_password_hash(password)

            cursor.execute(
                """
                INSERT INTO users (name, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING user_id
                """,
                (name, email, password_hash)
            )

            user_id = cursor.fetchone()[0]

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Registration successful",
            "user": {
                "user_id": user_id,
                "name": name,
                "email": email
            }
        }), 201

    except Exception:
        if conn:
            conn.rollback()

        

        return jsonify({
            "success": False,
            "message": "Registration failed. Please try again."
        }), 500

    finally:
        if conn:
            conn.close()


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required"
        }), 400

    conn = None

    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id, name, email, password_hash
                FROM users
                WHERE email = %s
                """,
                (email,)
            )

            user = cursor.fetchone()

        if not user or not check_password_hash(user[3], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        session["user_id"] = user[0]
        session["user_name"] = user[1]
        session["user_email"] = user[2]

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "user_id": user[0],
                "name": user[1],
                "email": user[2]
            }
        }), 200

    except Exception:
        

        return jsonify({
            "success": False,
            "message": "Login failed. Please try again."
        }), 500

    finally:
        if conn:
            conn.close()


@app.route("/session", methods=["GET"])
def check_session():
    if "user_id" not in session:
        return jsonify({
            "success": True,
            "authenticated": False,
            "user": None
        }), 200

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "user_id": session["user_id"],
            "name": session["user_name"],
            "email": session["user_email"]
        }
    }), 200


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "message": "Logout successful"
    }), 200