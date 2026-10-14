import re


FILLERS = [
    "um",
    "uh",
    "hmm",
    "you know",
    "i mean"
]

CONTEXTUAL_FILLERS = [
    "like",
    "actually",
    "basically"
]


def remove_fillers(text):
    for filler in FILLERS:
        text = re.sub(
            rf"\b{re.escape(filler)}\b[,]?",
            "",
            text,
            flags=re.IGNORECASE
        )

    return text


def remove_contextual_fillers(text):
    for filler in CONTEXTUAL_FILLERS:
        text = re.sub(
            rf"\b{re.escape(filler)}\b[,]?\s+",
            "",
            text,
            flags=re.IGNORECASE
        )

    return text


def remove_repeated_words(text):
    words = text.split()
    cleaned_words = []

    for word in words:
        if not cleaned_words or word.lower() != cleaned_words[-1].lower():
            cleaned_words.append(word)

    return " ".join(cleaned_words)


def clean_text_format(text):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.!?])", r"\1", text)

    return text.strip()


def clean_transcript(transcript):
    transcript = remove_fillers(transcript)
    transcript = remove_contextual_fillers(transcript)
    transcript = remove_repeated_words(transcript)
    transcript = clean_text_format(transcript)

    return transcript