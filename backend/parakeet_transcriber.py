import os
import sys
import logging
import nemo.collections.asr as nemo_asr

MODEL_NAME = "nvidia/parakeet-tdt-0.6b-v2"


def transcribe_chunks(chunks_folder, transcripts_folder):
    if not os.path.exists(chunks_folder):
        raise FileNotFoundError(
            f"Chunks folder not found: {chunks_folder}"
        )

    os.makedirs(
        transcripts_folder,
        exist_ok=True
    )

    chunk_files = sorted(
        filename
        for filename in os.listdir(chunks_folder)
        if filename.endswith(".wav")
    )

    if not chunk_files:
        raise RuntimeError(
            "No audio chunks found"
        )

    logging.disable(logging.CRITICAL)

    print(
        "Loading Parakeet model...",
        flush=True
    )

    model = nemo_asr.models.ASRModel.from_pretrained(
        MODEL_NAME
    )

    print(
        f"Parakeet model loaded. "
        f"{len(chunk_files)} chunks found.",
        flush=True
    )

    for index, filename in enumerate(chunk_files):
        chunk_path = os.path.join(
            chunks_folder,
            filename
        )

        print(
            f"Transcribing {filename} "
            f"({index + 1}/{len(chunk_files)})...",
            flush=True
        )

        output = model.transcribe(
            [chunk_path]
        )

        transcript = output[0].text.strip()

        transcript_filename = (
            f"chunk_{index:03d}.txt"
        )

        transcript_path = os.path.join(
            transcripts_folder,
            transcript_filename
        )

        with open(
            transcript_path,
            "w",
            encoding="utf-8"
        ) as file:
            file.write(transcript)

        print(
            f"Completed {filename}",
            flush=True
        )

    print(
        "All chunks transcribed.",
        flush=True
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python parakeet_transcriber.py "
            "<chunks_folder> <transcripts_folder>"
        )
        sys.exit(1)

    chunks_folder = sys.argv[1]
    transcripts_folder = sys.argv[2]

    transcribe_chunks(
        chunks_folder,
        transcripts_folder
    )