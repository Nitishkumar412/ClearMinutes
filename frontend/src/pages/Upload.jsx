import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { uploadAudio } from "../api/client";

const ACCEPTED = ["mp3", "wav", "m4a", "ogg", "webm", "mp4"];

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const validate = (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!ACCEPTED.includes(ext))
      return `Unsupported format .${ext}. Allowed: ${ACCEPTED.join(", ")}`;
    if (f.size > 25 * 1024 * 1024)
      return "File too large. Maximum size is 25MB.";
    return "";
  };

  const handleFile = (f) => {
    const err = validate(f);
    if (err) { setError(err); setFile(null); return; }
    setError("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    try {
      const res = await uploadAudio(file, (percent) => {
        setProgress(percent);
      });
      navigate(`/processing/${res.data.job_id}`);
    } catch (e) {
      setError(e.response?.data?.detail || "Upload failed. Is the backend running?");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800">
          Never rewatch a meeting again.
        </h1>
        <p className="text-gray-500 mt-2">
          Upload your recording. Know exactly what was decided, who owns what,
          and what's at risk — in 30 seconds.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => !loading && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
          ${loading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
          ${dragging
            ? "border-blue-500 bg-blue-50"
            : "border-blue-200 hover:border-blue-400 hover:bg-white/60 bg-white/40"
          }`}
      >
        <div className="text-5xl mb-4">🎙️</div>
        {file ? (
          <div>
            <p className="text-indigo-600 font-semibold text-lg">{file.name}</p>
            <p className="text-gray-400 text-sm mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">
              Drag & drop your audio file here
            </p>
            <p className="text-gray-400 text-sm mt-1">
              or click to browse — MP3, WAV, M4A, OGG up to 25MB
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.ogg,.webm,.mp4"
          className="hidden"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Demo banner — only show when not signed in */}
      {!isSignedIn && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">No audio file?</span>
          <button
            onClick={() => navigate("/results/demo-meeting-clearminutes")}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline transition-colors"
          >
            Try a sample meeting →
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {loading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="mt-6 w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-xl
          hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? `Uploading... ${progress}%` : "Generate Meeting Minutes"}
      </button>

      {/* Sign in nudge — show after upload button for non signed in users */}
      {!isSignedIn && (
        <p className="text-center text-xs text-gray-400 mt-3">
          Your minutes won't be saved.{" "}
          <span
            className="text-indigo-500 underline cursor-pointer"
            onClick={() => document.querySelector("[data-clerk-sign-in]")?.click()}
          >
            Sign in to save and track your meetings.
          </span>
        </p>
      )}

      <p className="text-center text-xs text-gray-400 mt-4">
        Powered by Groq Whisper + LLaMA 3.3 · Private & Secure · No account needed
      </p>
    </div>
  );
}