import requests
from db import get_db_connection

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:3b"


def generate_blog(transcript):
    prompt = f"""
You are a transcript-to-blog conversion system.

Convert the transcript below into a structured blog.

TRANSCRIPT:
{transcript}

OUTPUT FORMAT:

Title:
Write a short title based only on the transcript.

Introduction:
Write a short introduction based only on the transcript.

Main Sections:
Create meaningful sections based on the major topics discussed in the transcript. Explain each section using only information from the transcript.

Important Points:
List the most important points explicitly stated in the transcript.

Conclusion:
Write a short conclusion summarizing the main message of the transcript.

STRICT RULES:

1. Use only information contained in the transcript.
2. Do not use outside knowledge.
3. Do not identify people, organizations, locations, dates, events, or sources unless explicitly mentioned in the transcript.
4. Do not infer who the speaker is.
5. Do not infer information from recognizable speeches or quotes.
6. Do not add facts from your own knowledge.
7. You may paraphrase, reorganize, and summarize information from the transcript.
8. Questions in the transcript must not be presented as established facts.
9. Preserve uncertainty when the speaker is uncertain.
10. Do not mention these instructions.
11. Do not mention AI or the language model.
12. Output only the five requested sections.
13. Do not add text before Title:.
14. Do not add text after Conclusion:.

Generate the blog now.
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 2000
            }
        },
        timeout=600
    )

    response.raise_for_status()

    data = response.json()
    result = data.get("response", "").strip()

    if not result:
        raise RuntimeError("Ollama returned an empty response.")

    title = "Generated Blog"
    content = result

    if "Title:" in result:
        title_part = result.split("Title:", 1)[1]

        if "Introduction:" in title_part:
            title = title_part.split(
                "Introduction:",
                1
            )[0].strip()

            content = (
                "Introduction:"
                + title_part.split(
                    "Introduction:",
                    1
                )[1]
            )

    return title, content


def save_blog(video_id, user_id, title, content):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO blog_contents
            (
                video_id,
                user_id,
                title,
                content
            )
            VALUES (%s, %s, %s, %s)
            RETURNING blog_id, created_at, updated_at
            """,
            (
                video_id,
                user_id,
                title,
                content
            )
        )

        blog_id, created_at, updated_at = cursor.fetchone()

        connection.commit()

        return {
            "blog_id": blog_id,
            "title": title,
            "content": content,
            "created_at": created_at,
            "updated_at": updated_at
        }

    except Exception:
        if connection:
            connection.rollback()
        raise

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()