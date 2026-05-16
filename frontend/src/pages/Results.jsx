import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJob, exportJob, getTaskStatuses, updateTaskStatus } from "../api/client";

function Section({ title, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 p-6 mb-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const colors = {
    high: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[level] || colors.low}`}>
      {level}
    </span>
  );
}

// ── Action Item Card with trust layer + checkbox + badges ──────────────────
function ActionItem({ item, index, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        checked
          ? "bg-gray-50 border-gray-200 opacity-60"
          : "bg-white border-blue-100 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* ── Checkbox ── */}
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(index)}
          className="mt-1 accent-indigo-600 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          {/* ── Task text ── */}
          <p className={`text-sm font-medium ${checked ? "line-through text-gray-400" : "text-gray-800"}`}>
            {item.task}
          </p>

          {/* ── Badges row ── */}
          <div className="flex flex-wrap gap-2 mt-2">
            {item.assignee ? (
              <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                👤 {item.assignee}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                ⚠️ No owner
              </span>
            )}

            {item.deadline ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                📅 {item.deadline}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                ⚠️ No deadline
              </span>
            )}

            <ConfidenceBadge level={item.confidence} />

            {/* ── Trust layer toggle ── */}
            {item.evidence && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 px-2 py-0.5 rounded-full font-medium transition-colors"
              >
                {expanded ? "▲ Hide source" : "▼ View source"}
              </button>
            )}
          </div>

          {/* ── Evidence snippet (trust layer) ── */}
          {expanded && item.evidence && (
            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-xs text-indigo-600 font-medium mb-0.5">
                From transcript:
              </p>
              <p className="text-xs text-indigo-800 italic">
                "{item.evidence}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState({
    action_items: [],
    key_points: [],
    decisions: [],
    open_questions: [],
    risks: [],
  });
  const [filename, setFilename] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [showLowConf, setShowLowConf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── DB-ready checkbox state ──
  // Structure mirrors future DB shape: { index: { checked: bool, completedAt: iso_string | null } }
  // To persist to DB later:
  //   - Init: replace {} with await getTaskStatuses(jobId)
  //   - Toggle: add await updateTaskStatus(jobId, index, updated[index]) after setCheckedItems
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
  getJob(jobId)
    .then((res) => {
      setResult(res.data.result);
      setFilename(res.data.filename);
      setLoading(false);
    })
    .catch((err) => {
      console.error("API ERROR:", err);
      setLoading(false);
    });

  // ✅ Load persisted task statuses from DB
  getTaskStatuses(jobId)
    .then((res) => setCheckedItems(res.data))
    .catch(() => {}); // silently fail for demo job or unauthenticated users
}, [jobId]);

  const toggleItem = async (index) => {
  const isChecked = !checkedItems[index]?.checked;
  const updated = {
    checked: isChecked,
    completedAt: isChecked ? new Date().toISOString() : null,
  };

  // Optimistic update — UI updates instantly without waiting for DB
  setCheckedItems((prev) => ({ ...prev, [index]: updated }));

  // Persist to DB
  try {
    await updateTaskStatus(jobId, index, updated);
  } catch {
    // silently fail for demo job or unauthenticated users
  }
};

  const copyToClipboard = () => {
    const r = result;
    const text = [
      `MEETING MINUTES — ${filename}`,
      "",
      "OVERVIEW",
      r.overview,
      "",
      "KEY POINTS",
      ...r.key_points.map((p) => `• ${p}`),
      "",
      "DECISIONS",
      ...(r.decisions.length ? r.decisions.map((d) => `• ${d}`) : ["None recorded"]),
      "",
      "OPEN QUESTIONS",
      ...(r.open_questions.length ? r.open_questions.map((q) => `• ${q}`) : ["None recorded"]),
      "",
      "ACTION ITEMS",
      ...(r.action_items.length
        ? r.action_items.map(
            (a) =>
              `• ${a.task}${a.assignee ? ` (${a.assignee})` : " (No owner)"}${
                a.deadline ? ` — ${a.deadline}` : " — No deadline"
              }`
          )
        : ["None recorded"]),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-24">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) {
    return <div className="text-center mt-10 text-gray-400">No data available</div>;
  }

  const visibleActions = result.action_items.filter(
    (a) => showLowConf || a.confidence !== "low"
  );

  const completedCount = Object.values(checkedItems).filter((v) => v.checked).length;
  const totalVisible = visibleActions.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meeting Minutes</h1>
          <p className="text-gray-400 text-sm mt-1">{filename}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? "✓ Copied!" : "Copy as Text"}
          </button>
          <button
            onClick={() => exportJob(jobId)}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Export Markdown
          </button>
        </div>
      </div>

      {/* Overview */}
      <Section title="Overview">
        <p className="text-gray-700 leading-relaxed">{result.overview}</p>
      </Section>

      {/* Key Points */}
      <Section title="Key Discussion Points">
        {result.key_points.length ? (
          <ul className="space-y-2">
            {result.key_points.map((p, i) => (
              <li key={i} className="flex gap-2 text-gray-700 text-sm">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">None recorded</p>
        )}
      </Section>

      {/* Decisions */}
      {result.decisions && result.decisions.length > 0 && (
        <Section title="Decisions Made">
          <ul className="space-y-2">
            {result.decisions.map((d, i) => (
              <li key={i} className="flex gap-2 text-gray-700 text-sm">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Open Questions */}
      {result.open_questions && result.open_questions.length > 0 && (
        <Section title="Open Questions">
          <ul className="space-y-2">
            {result.open_questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-gray-700 text-sm">
                <span className="text-yellow-500 mt-0.5">?</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Action Items */}
      <Section title={`Action Items${totalVisible > 0 ? ` — ${completedCount}/${totalVisible} done` : ""}`}>
        {result.action_items.length === 0 ? (
          <p className="text-gray-400 text-sm">No action items found</p>
        ) : (
          <>
            <div className="space-y-3">
              {visibleActions.map((item, i) => (
                <ActionItem
                  key={i}
                  item={item}
                  index={i}
                  checked={checkedItems[i]?.checked || false}
                  onToggle={toggleItem}
                />
              ))}
            </div>
            {result.action_items.some((a) => a.confidence === "low") && (
              <button
                onClick={() => setShowLowConf(!showLowConf)}
                className="mt-3 text-xs text-gray-400 underline"
              >
                {showLowConf ? "Hide" : "Show"} low-confidence items
              </button>
            )}
          </>
        )}
      </Section>

      {/* Risks & Gaps */}
      {result.risks && result.risks.length > 0 && (
        <Section title="⚠️ Risks & Gaps Detected">
          <div className="space-y-3">
            {result.risks.map((risk, i) => {
              const severityStyles = {
                high: "bg-red-50 border-red-200 text-red-700",
                medium: "bg-amber-50 border-amber-200 text-amber-700",
                low: "bg-gray-50 border-gray-200 text-gray-600",
              };
              const typeLabels = {
                missing_owner: "Missing Owner",
                no_deadline: "No Deadline",
                unresolved_topic: "Unresolved Topic",
                conflicting_statements: "Conflicting Statements",
                no_followup: "No Follow-up",
              };
              return (
                <div
                  key={i}
                  className={`border rounded-lg p-3 ${severityStyles[risk.severity] || severityStyles.low}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {typeLabels[risk.type] || risk.type}
                    </span>
                    <span className="text-xs font-medium opacity-70">
                      {risk.severity} severity
                    </span>
                  </div>
                  <p className="text-sm font-medium">{risk.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{risk.description}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Transcript */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 p-6 shadow-sm mb-4">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Full Transcript
          </h3>
          <span className="text-gray-400 text-sm">{showTranscript ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showTranscript && (
          <p className="mt-4 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            {result.transcript}
          </p>
        )}
      </div>

      <div className="mt-6 text-center">
        <a href="/" className="text-indigo-600 text-sm hover:underline">
          ← Process another meeting
        </a>
      </div>
    </div>
  );
}