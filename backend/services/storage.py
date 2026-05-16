import os
import uuid
import aiofiles

UPLOAD_DIR = "uploads"

def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)

async def save_upload(file_bytes: bytes, filename: str) -> str:
    ensure_upload_dir()
    unique_name = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_bytes)
    return file_path

def delete_file(file_path: str):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass