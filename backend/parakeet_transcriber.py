import nemo.collections.asr as nemo_asr


def transcribe_audio(audio_path):
    print("Loading Parakeet model...")

    model = nemo_asr.models.ASRModel.from_pretrained(
        model_name="nvidia/parakeet-tdt-0.6b-v2"
    )

    print("Transcribing:", audio_path)

    output = model.transcribe([audio_path])

    # NeMo versions may return objects containing the text.
    result = output[0]

    if hasattr(result, "text"):
        transcript = result.text
    else:
        transcript = str(result)

    return transcript


if __name__ == "__main__":
    audio_path = "processing/chunks/chunk_000.wav"

    transcript = transcribe_audio(audio_path)

    print("\n========== TRANSCRIPT ==========")
    print(transcript)
    print("================================")