import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SUPPORTED_FORMATS = {"mp3", "wav", "m4a", "ogg", "webm", "mp4"}
MAX_FILE_SIZE_MB = 25  # Groq Whisper limit


def validate_audio_file(filename: str, file_size_bytes: int) -> tuple[bool, str]:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_FORMATS:
        return False, f"Unsupported format '.{ext}'. Allowed: {', '.join(SUPPORTED_FORMATS)}"
    if file_size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
        return False, f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB."
    return True, ""


def transcribe_audio(file_path: str) -> str:
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            response_format="text"
        )
    return transcription