import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJob } from "../api/client";

const steps = ["Uploading file", "Transcribing audio", "Generating summary", "Extracting action items"];

export default function Processing() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    // Cycle through steps for visual feedback
    const stepTimer = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 4000);

    // Poll job status every 3 seconds
    const pollTimer = setInterval(async () => {
      try {
        const res = await getJob(jobId);
        const { status } = res.data;
        setStatus(status);
        if (status === "completed") {
          clearInterval(pollTimer);
          clearInterval(stepTimer);
          navigate(`/results/${jobId}`);
        }
        if (status === "failed") {
          clearInterval(pollTimer);
          clearInterval(stepTimer);
          setError(res.data.error_msg || "Processing failed.");
        }
      } catch {
        setError("Could not reach the server.");
        clearInterval(pollTimer);
        clearInterval(stepTimer);
      }
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(stepTimer);
    };
  }, [jobId, navigate]);

  return (
    <div className="max-w-lg mx-auto mt-24 px-4 text-center">
      {error ? (
        <div>
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Failed</h2>
          <p className="text-red-500 text-sm mb-6">{error}</p>
          <a href="/" className="text-indigo-600 underline">Try again</a>
        </div>
      ) : (
        <div>
          {/* Spinner */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Processing your meeting...
          </h2>
          <p className="text-gray-500 text-sm mb-10">
            This usually takes 30–60 seconds depending on file length.
          </p>

          {/* Steps */}
          <div className="text-left space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${i < step ? "bg-green-500 text-white" :
                    i === step ? "bg-indigo-600 text-white animate-pulse" :
                    "bg-gray-200 text-gray-400"}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-sm ${i <= step ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}