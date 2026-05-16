from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from typing import Optional
import os
import httpx
from jose import jwt
from sqlalchemy.orm import Session
import json

from database import engine, get_db, Base
import models
from services.transcription import validate_audio_file, transcribe_audio
from services.summarization import summarize_transcript, extract_action_items, detect_risks
from services.storage import save_upload, delete_file

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ClearMinutes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://clearminutes.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ─────────────────────────────────────────────────────────────────────

security = HTTPBearer(auto_error=False)
_jwks_cache = None

CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API_URL", "https://moral-whale-49.clerk.accounts.dev")

async def get_jwks():
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    jwks_url = f"{CLERK_FRONTEND_API}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url)
        data = resp.json()
        _jwks_cache = data
    return _jwks_cache

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Optional[str]:
    if not credentials:
        print("DEBUG: No credentials provided")
        return None
    try:
        token = credentials.credentials
        print(f"DEBUG: Token received, length={len(token)}")
        jwks = await get_jwks()
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks["keys"] if k["kid"] == header["kid"]),
            None
        )
        if not key:
            print("DEBUG: No matching key found")
            return None
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Clerk tokens don't always include aud
        )
        print(f"DEBUG: Auth success, user={payload['sub'][:8]}...")
        return payload["sub"]
    except Exception as e:
        print(f"DEBUG: Auth error: {e}")
        return None


# ── Background processing task ───────────────────────────────────────────────

def process_meeting(job_id: str, file_path: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        job.status = "processing"
        db.commit()

        transcript = transcribe_audio(file_path)
        summary = summarize_transcript(transcript)
        action_items = extract_action_items(transcript)
        risks = detect_risks(transcript)

        result = models.Result(
            job_id=job_id,
            transcript=transcript,
            overview=summary.get("overview", ""),
            key_points=json.dumps(summary.get("key_points", [])),
            decisions=json.dumps(summary.get("decisions", [])),
            open_questions=json.dumps(summary.get("open_questions", [])),
            action_items=json.dumps(action_items),
            risks=json.dumps(risks),
        )
        db.add(result)
        job.status = "completed"
        db.commit()
        delete_file(file_path)

    except Exception as e:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        job.status = "failed"
        job.error_msg = str(e)
        db.commit()
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user)
):
    file_bytes = await file.read()

    valid, error = validate_audio_file(file.filename, len(file_bytes))
    if not valid:
        raise HTTPException(status_code=400, detail=error)

    file_path = await save_upload(file_bytes, file.filename)

    job = models.Job(
        filename=file.filename,
        file_path=file_path,
        status="pending",
        user_id=user_id
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(process_meeting, job.id, file_path)
    return {"job_id": job.id, "status": "pending"}


@app.get("/api/jobs/{job_id}")
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_demo = job_id == "demo-meeting-clearminutes"
    is_owner = user_id and job.user_id == user_id
    is_unowned = job.user_id is None

    if not (is_demo or is_owner or is_unowned):
        raise HTTPException(status_code=403, detail="Access denied")

    response = {
        "job_id": job.id,
        "status": job.status,
        "filename": job.filename,
        "created_at": job.created_at,
        "error_msg": job.error_msg,
        "result": None
    }

    if job.status == "completed":
        result = db.query(models.Result).filter(models.Result.job_id == job_id).first()
        if result:
            response["result"] = {
                "transcript": result.transcript,
                "overview": result.overview,
                "key_points": json.loads(result.key_points),
                "decisions": json.loads(result.decisions),
                "open_questions": json.loads(result.open_questions),
                "action_items": json.loads(result.action_items),
                "risks": json.loads(result.risks or "[]"),
            }

    return response


@app.get("/api/jobs/{job_id}/export")
def export_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.status != "completed":
        raise HTTPException(status_code=404, detail="Job not found or not completed")

    result = db.query(models.Result).filter(models.Result.job_id == job_id).first()
    key_points = json.loads(result.key_points)
    decisions = json.loads(result.decisions)
    open_questions = json.loads(result.open_questions)
    action_items = json.loads(result.action_items)

    decisions_lines = [f"- {d}" for d in decisions] if decisions else ["- None recorded"]
    questions_lines = [f"- {q}" for q in open_questions] if open_questions else ["- None recorded"]

    lines = [
        f"# Meeting Minutes — {job.filename}",
        "",
        "## Overview",
        result.overview,
        "",
        "## Key Discussion Points",
        *[f"- {p}" for p in key_points],
        "",
        "## Decisions Made",
        *decisions_lines,
        "",
        "## Open Questions",
        *questions_lines,
        "",
        "## Action Items",
    ]

    for item in action_items:
        assignee = f" — Assignee: {item['assignee']}" if item.get("assignee") else ""
        deadline = f" — Deadline: {item['deadline']}" if item.get("deadline") else ""
        lines.append(f"- [ ] {item['task']}{assignee}{deadline}")

    lines += ["", "---", "## Full Transcript", "", result.transcript]

    return PlainTextResponse(
        content="\n".join(lines),
        headers={"Content-Disposition": f"attachment; filename=minutes_{job_id[:8]}.md"}
    )


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"deleted": True}


@app.get("/api/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    jobs = db.query(models.Job).filter(models.Job.user_id == user_id).all()
    completed = [j for j in jobs if j.status == "completed"]
    failed = [j for j in jobs if j.status == "failed"]
    processing = [j for j in jobs if j.status in ("pending", "processing")]

    total_action_items = 0
    total_decisions = 0
    pending_tasks = 0  # ✅ defined here
    recent_meetings = []

    for job in completed:
        result = db.query(models.Result).filter(models.Result.job_id == job.id).first()
        if not result:
            continue

        action_items = json.loads(result.action_items)
        decisions = json.loads(result.decisions)

        total_action_items += len(action_items)
        total_decisions += len(decisions)

        # Count pending tasks for this job
        checked_count = db.query(models.TaskStatus).filter(
            models.TaskStatus.job_id == job.id,
            models.TaskStatus.checked == True
        ).count()
        job_pending = max(0, len(action_items) - checked_count)  # ✅ defined here
        pending_tasks += job_pending

        recent_meetings.append({
            "job_id": job.id,
            "filename": job.filename,
            "created_at": job.created_at,
            "action_items": len(action_items),
            "decisions": len(decisions),
            "pending_tasks": job_pending,  # ✅ now defined before use
            "overview": result.overview[:120] + "..." if len(result.overview) > 120 else result.overview,
        })

    recent_meetings.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "stats": {
            "total_meetings": len(jobs),
            "completed": len(completed),
            "failed": len(failed),
            "processing": len(processing),
            "total_action_items": total_action_items,
            "total_decisions": total_decisions,
            "pending_tasks": pending_tasks,  # ✅ now defined before use
        },
        "recent_meetings": recent_meetings[:10],
    }


@app.get("/api/jobs/{job_id}/tasks")
def get_task_statuses(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user)
):
    statuses = db.query(models.TaskStatus).filter(
        models.TaskStatus.job_id == job_id
    ).all()
    return {
        s.task_index: {
            "checked": s.checked,
            "completedAt": s.completed_at
        }
        for s in statuses
    }


@app.patch("/api/jobs/{job_id}/tasks/{task_index}")
def update_task_status(
    job_id: str,
    task_index: int,
    payload: dict,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user)
):
    status = db.query(models.TaskStatus).filter(
        models.TaskStatus.job_id == job_id,
        models.TaskStatus.task_index == str(task_index)
    ).first()

    if status:
        status.checked = payload.get("checked", False)
        status.completed_at = payload.get("completedAt")
    else:
        status = models.TaskStatus(
            job_id=job_id,
            task_index=str(task_index),
            checked=payload.get("checked", False),
            completed_at=payload.get("completedAt")
        )
        db.add(status)
    db.commit()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/debug/{job_id}")
def debug_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": job.status,
        "error_msg": job.error_msg
    }