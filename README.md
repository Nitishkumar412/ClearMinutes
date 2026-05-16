# ClearMinutes 🎙️

> Transform meeting recordings into structured, actionable minutes using AI — in seconds.

<img width="1919" height="938" alt="image" src="https://github.com/user-attachments/assets/7264492f-bcea-4604-b90c-bb7c47f29551" />

---

## What is ClearMinutes?

ClearMinutes is an AI-powered web application that accepts uploaded meeting audio files and automatically generates:

- **Meeting Overview** — a concise 2-4 sentence summary
- **Key Discussion Points** — the most important topics covered
- **Decisions Made** — explicitly confirmed outcomes
- **Open Questions** — unresolved topics
- **Action Items** — tasks with assignee and deadline detection

No manual note-taking. No missed action items. Just upload your recording and get structured minutes instantly.

---

## Demo

1. Upload a meeting recording (MP3, WAV, M4A, OGG — up to 25MB)
2. Wait 30–60 seconds while the AI processes it
3. Review your structured minutes and export as Markdown

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, React Router |
| **Backend** | FastAPI (Python), SQLite, SQLAlchemy |
| **Transcription** | Groq Whisper Large V3 |
| **Summarization** | Groq LLaMA 3.3 70B |
| **HTTP Client** | Axios |

---

## Project Structure

```
clearminutes/
├── backend/
│   ├── main.py                  # FastAPI app, all endpoints
│   ├── database.py              # SQLite connection setup
│   ├── models.py                # SQLAlchemy database models
│   ├── .env                     # API keys (not committed)
│   ├── requirements.txt
│   └── services/
│       ├── transcription.py     # Groq Whisper integration
│       ├── summarization.py     # LLaMA summarization + extraction
│       └── storage.py           # File upload handling
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx              # Root component + routing
        ├── main.jsx             # Entry point
        ├── api/
        │   └── client.js        # Axios API wrappers
        └── pages/
            ├── Upload.jsx       # File upload page
            ├── Processing.jsx   # Polling / loading page
            └── Results.jsx      # Minutes display + export
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/clearminutes.git
cd clearminutes/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Add your API key
echo GROQ_API_KEY=your_key_here > .env

# Start the server
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`
Interactive API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd clearminutes/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload audio file, returns job_id |
| `GET` | `/api/jobs/{job_id}` | Poll job status and get results |
| `GET` | `/api/jobs/{job_id}/export` | Download minutes as Markdown |
| `DELETE` | `/api/jobs/{job_id}` | Delete a job and its data |
| `GET` | `/api/health` | Health check |

---

## How the AI Pipeline Works

```
Audio File
    ↓
Groq Whisper Large V3 → Raw Transcript
    ↓
LLaMA 3.3 70B (Summarization Prompt) → Overview, Key Points, Decisions, Questions
    ↓
LLaMA 3.3 70B (Extraction Prompt) → Action Items with confidence scoring
    ↓
Structured JSON → Stored in SQLite → Displayed in UI
```

**Anti-hallucination measures:**
- Temperature set to `0` on all AI calls for deterministic output
- Every action item includes an `evidence` field — a verbatim quote from the transcript
- Confidence scoring (`high/medium/low`) — low confidence items hidden by default
- Strict JSON schema enforced via prompts + response validation

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get your free key at [console.groq.com](https://console.groq.com)

---

## Supported Audio Formats

| Format | Extension |
|---|---|
| MP3 | `.mp3` |
| WAV | `.wav` |
| M4A | `.m4a` |
| OGG | `.ogg` |
| WebM | `.webm` |
| MP4 | `.mp4` |

Maximum file size: **25MB** (Groq Whisper API limit)

---

## Known Limitations

- No speaker diarization — transcript is a single block with no speaker labels
- Background tasks don't survive a server restart
- No user authentication on the MVP
- 25MB file size cap from Groq's Whisper API

---

## Roadmap

- [ ] Speaker diarization (identify who said what)
- [ ] PDF export
- [ ] Job history page
- [ ] User authentication
- [ ] Support for longer recordings via audio chunking
- [ ] Live meeting integration

---

## License

MIT License — free to use, modify, and distribute.

---

## Acknowledgements

- [Groq](https://groq.com) for blazing fast inference
- [FastAPI](https://fastapi.tiangolo.com) for the backend framework
- [Tailwind CSS](https://tailwindcss.com) for styling
