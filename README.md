# Video to Blog Content

Convert an uploaded video into usable, structured blog content. The application extracts audio from the video using FFmpeg, transcribes it with NVIDIA NeMo's pretrained Parakeet model, cleans the transcript, and uses the Llama 3.2 3B language model through Ollama to generate blog content based on the transcript.

## Features

- User registration, login, session handling, and logout
- MP4 video upload with a maximum duration of 30 minutes
- Cloudinary storage for uploaded videos
- Audio extraction and conversion to mono, 16 kHz WAV using FFmpeg
- Audio chunking for transcription
- Speech-to-text transcription using NVIDIA NeMo ASR and Parakeet TDT 0.6B v2
- Transcript cleaning
- Blog content generation using Llama 3.2 3B through Ollama
- Storage and management of generated blog content
- View and edit saved blog content
- Export generated content as PDF and DOCX

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend/API | Python, Flask, Flask-CORS |
| Database | PostgreSQL (Neon can be used as the hosted database) |
| Video storage | Cloudinary |
| Audio processing | FFmpeg and ffprobe |
| Speech recognition | NVIDIA NeMo ASR, Parakeet TDT 0.6B v2 |
| Blog content generation | Ollama running `llama3.2:3b` |
| Document export | ReportLab for PDF, `python-docx` for DOCX |

## Processing Pipeline

1. **Video upload:** The user uploads an MP4 video through the frontend.
2. **Validation:** Flask checks the file type and uses `ffprobe` to determine the video's duration. Videos longer than 30 minutes are rejected.
3. **Video storage:** The video is uploaded to Cloudinary, and its metadata and URL are stored in PostgreSQL.
4. **Audio extraction:** FFmpeg extracts the audio and converts it to mono, 16 kHz WAV format.
5. **Audio chunking:** The extracted audio is divided into smaller chunks for transcription.
6. **Speech-to-text:** The pretrained Parakeet TDT 0.6B v2 model transcribes each audio chunk into text.
7. **Transcript storage:** The individual chunk transcripts are saved in the `transcripts` table.
8. **Transcript combination and cleaning:** The chunk transcripts are combined in order. The application cleans the combined transcript and stores both the combined and cleaned versions in the `videos` table.
9. **Blog content generation:** The cleaned transcript is sent to Llama 3.2 3B through Ollama. The model generates structured blog content, including a title, introduction, main sections, important points, and conclusion.
10. **Saving and export:** The generated content is stored in PostgreSQL and can be viewed, edited, or exported as PDF or DOCX.

## Prerequisites

- Python
- FFmpeg, including `ffprobe`, available on the system PATH
- PostgreSQL database
- Cloudinary account and API credentials
- Ollama installed and running
- The `llama3.2:3b` model available in Ollama
- A separate Python environment with compatible NVIDIA NeMo ASR dependencies for Parakeet

Parakeet is run using a separate Python interpreter because its machine-learning dependencies differ from those of the Flask backend.

## Database

The application uses PostgreSQL to store user accounts, video metadata, audio chunk details, transcripts, and generated blog content.

| Table | Purpose |
|---|---|
| `users` | Stores user account details and password hashes. |
| `videos` | Stores video metadata, Cloudinary URL, duration, combined transcript, and cleaned transcript. |
| `audio_chunks` | Stores information about the audio chunks created from each video, including chunk number and timing. |
| `transcripts` | Stores the transcript text for each individual audio chunk. |
| `blog_contents` | Stores the generated blog title and content, linked to the relevant video and user. |

The `transcripts` table stores per-chunk transcript text. The full combined transcript and the cleaned transcript are stored in the corresponding row of the `videos` table. The generated title and blog content are stored in `blog_contents`.