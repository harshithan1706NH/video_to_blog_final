
import os
import subprocess

CHUNK_DURATION = 15 * 60  # 15-minute chunks


def chunk_audio(audio_path, output_folder, duration_seconds=None):
    if not os.path.exists(audio_path):
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    os.makedirs(output_folder, exist_ok=True)

    output_pattern = os.path.join(
        output_folder,
        "chunk_%03d.wav"
    )

    command = [
        "ffmpeg",
        "-y",
        "-i", audio_path,
        "-f", "segment",
        "-segment_time", str(CHUNK_DURATION),
        "-reset_timestamps", "1",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        output_pattern
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Audio chunking failed:\n{result.stderr}"
        )

    chunk_files = sorted(
        filename
        for filename in os.listdir(output_folder)
        if filename.endswith(".wav")
    )

    if not chunk_files:
        raise RuntimeError("No audio chunks were created")

    chunks = []

    for index, filename in enumerate(chunk_files):
        start_time = index * CHUNK_DURATION
        end_time = start_time + CHUNK_DURATION

        if duration_seconds is not None:
            end_time = min(end_time, duration_seconds)

        chunks.append({
            "chunk_number": index + 1,
            "filename": filename,
            "path": os.path.join(output_folder, filename),
            "start_time_seconds": start_time,
            "end_time_seconds": end_time
        })

    return chunks


if __name__ == "__main__":
    audio_path = "processing/audio.wav"
    output_folder = "processing/chunks"

    chunks = chunk_audio(audio_path, output_folder)

    print("\nChunks created:")
    for chunk in chunks:
        print(chunk)
