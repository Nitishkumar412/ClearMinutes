import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


SUMMARY_PROMPT = """You are a professional meeting analyst. Produce structured, factual meeting minutes from a raw transcript.
Be concise and precise. Never invent information not present in the transcript.

Return ONLY a valid JSON object with exactly this structure, no extra text, no markdown:

{
  "overview": "<2-4 sentence summary of the meeting purpose and outcome. After summarizing, append ONE of these signals if detected: '⚠️ Unclear ownership detected on some action items.' or '⚠️ Several decisions lack a confirmed deadline.' or '⚠️ One or more topics were left unresolved.' or '✓ All action items have clear owners and deadlines.' Only append the most relevant one. If none apply, omit it.>",
  "key_points": ["<point 1>", "<point 2>"],
  "decisions": ["<decision 1>"],
  "open_questions": ["<question 1>"]
}

Rules:
- overview: What was discussed and what was concluded. No filler phrases.
- key_points: Max 8 items. Each a standalone informative sentence of 10-20 words.
- decisions: Only explicitly confirmed decisions. Omit proposals still under consideration.
- open_questions: Questions raised but NOT resolved during the meeting.
- If a section has nothing, return an empty array [].
"""

EXTRACTION_PROMPT = """You are a task extraction specialist. Extract only explicit action items from meeting transcripts.
Never infer or assume tasks. If something is vague, omit it.

Return ONLY a valid JSON array, no extra text, no markdown:

[
  {
    "task": "<clear verb-led description e.g. Send Q3 budget report to finance team>",
    "assignee": "<name or role if explicitly stated, else null>",
    "deadline": "<date or timeframe if explicitly stated, else null>",
    "confidence": "<high|medium|low>",
    "evidence": "<verbatim quote under 20 words that supports this task>"
  }
]

Rules:
- task must start with an action verb (Send, Create, Review, Schedule, Fix, etc.)
- Only include items where someone clearly volunteered or was assigned work
- 'We should look into X' = low confidence at most
- 'I will do X by Friday' = high confidence
- If no action items exist, return an empty array []
"""

RISKS_PROMPT = """You are a meeting quality analyst. Analyze this transcript and identify risks and gaps that participants may have missed.

Return ONLY a valid JSON array, no extra text, no markdown:

[
  {
    "type": "<missing_owner | no_deadline | unresolved_topic | conflicting_statements | no_followup>",
    "title": "<short 5-8 word title>",
    "description": "<one sentence explaining the specific risk or gap>",
    "severity": "<high | medium | low>"
  }
]

Type definitions — use ONLY these types:
- missing_owner: An action item or task was discussed but nobody was assigned to own it
- no_deadline: A task was assigned to someone but no timeframe or deadline was mentioned
- unresolved_topic: A topic was raised and discussed but never concluded or decided upon
- conflicting_statements: Two participants said contradictory things about the same topic
- no_followup: An important decision was made but no follow-up action or check-in was planned

Severity rules:
- high: Likely to cause the project or task to fail or be delayed
- medium: Could cause confusion or rework if not addressed
- low: Minor gap, good to fix but not urgent

Rules:
- Only report genuine gaps. Do not invent issues.
- Max 6 items. Focus on the most impactful ones.
- Each description must reference something specific from the transcript.
- If no risks or gaps exist, return an empty array [].
"""


def _call(system_prompt: str, transcript: str):
    """Shared helper for all LLM calls."""
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ]
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def summarize_transcript(transcript: str) -> dict:
    result = _call(SUMMARY_PROMPT, transcript)
    return result if isinstance(result, dict) else {}


def extract_action_items(transcript: str) -> list:
    result = _call(EXTRACTION_PROMPT, transcript)
    return result if isinstance(result, list) else []


def detect_risks(transcript: str) -> list:
    result = _call(RISKS_PROMPT, transcript)
    return result if isinstance(result, list) else []