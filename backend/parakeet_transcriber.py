
import os
import sys
import logging
import nemo.collections.asr as nemo_asr

MODEL_NAME = "nvidia/parakeet-tdt-0.6b-v2"


def load_model():
    print("Loading Parakeet model...", flush=True)

    logging.disable(logging.CRITICAL)

    model = nemo_asr.models.ASRModel.from_pretrained(
        model_name=MODEL_NAME
    )

    print("Parakeet model loaded.", flush=True)
    return model


def transcribe_audio(audio_path, model=None):
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    if model is None:
        model = load_model()

    print(f"Transcribing: {audio_path}", flush=True)

    output = model.transcribe([audio_path])
    result = output[0]

    if hasattr(result, "text"):
        transcript = result.text
    else:
        transcript = str(result)

    return transcript.strip()


def transcribe_chunks(chunks_folder, transcripts_folder):
    if not os.path.isdir(chunks_folder):
        raise FileNotFoundError(
            f"Chunks folder not found: {chunks_folder}"
        )

    os.makedirs(transcripts_folder, exist_ok=True)

    chunk_files = sorted(
        filename
        for filename in os.listdir(chunks_folder)
        if filename.lower().endswith(".wav")
    )

    if not chunk_files:
        raise RuntimeError("No audio chunks found.")

    model = load_model()

    for index, filename in enumerate(chunk_files):
        chunk_path = os.path.join(chunks_folder, filename)

        print(
            f"Transcribing {filename} "
            f"({index + 1}/{len(chunk_files)})...",
            flush=True
        )

        transcript = transcribe_audio(chunk_path, model)

        transcript_filename = f"chunk_{index + 1:03d}.txt"
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

        print(f"Saved: {transcript_path}", flush=True)

    print("All chunks transcribed.", flush=True)


if __name__ == "__main__":
    if len(sys.argv) == 3:
        transcribe_chunks(sys.argv[1], sys.argv[2])
    else:
        audio_path = "processing/chunks/chunk_000.wav"
        transcript = transcribe_audio(audio_path)

        print("\n========== TRANSCRIPT ==========")
        print(transcript)
        print("================================")
