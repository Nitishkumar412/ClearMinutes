import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboard } from "../api/client";
import { useAuth } from "@clerk/clerk-react";

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
  if(!isLoaded || !isSignedIn) return;
  getDashboard()
    .then((res) => setData(res.data))
    .catch((err) => {
      if (err.response?.status === 401) {
        setError("Sign in to view your meetings.");
      } else {
        setError("Failed to load dashboard.");
      }
    })
    .finally(() => setLoading(false));
}, [isLoaded, isSignedIn]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-400 animate-pulse">Loading your meetings...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-red-400">{error}</p>
    </div>
  );

  const { stats, recent_meetings } = data;
  const pendingTasks = stats.pending_tasks || 0;
  

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4 pb-20">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Meetings</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {stats.completed} meeting{stats.completed !== 1 ? "s" : ""} processed
        </p>
      </div>

      {/* Pending Tasks Banner — only show if there are tasks */}
      {pendingTasks > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-amber-800 font-semibold text-sm">
              🔔 You have {pendingTasks} pending task{pendingTasks !== 1 ? "s" : ""} across your meetings
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Review your recent meetings to stay on track
            </p>
          </div>
        </div>
      )}

      {/* Recent Meetings */}
      <div className="space-y-3">
        {recent_meetings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🎙️</p>
            <p className="text-gray-500 font-medium">No meetings yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Upload your first recording to get started
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Meeting
            </button>
          </div>
        ) : (
          recent_meetings.map((m) => (
            <div
              key={m.job_id}
              onClick={() => navigate(`/results/${m.job_id}`)}
              className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {m.filename}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {m.overview && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {m.overview}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
  {m.pending_tasks > 0 && (
    <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
      {m.pending_tasks} pending
    </span>
  )}
  {m.action_items > 0 && (
    <span className="bg-orange-50 text-orange-600 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
      {m.action_items} task{m.action_items !== 1 ? "s" : ""}
    </span>
  )}
  {m.decisions > 0 && (
    <span className="bg-purple-50 text-purple-600 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
      {m.decisions} decision{m.decisions !== 1 ? "s" : ""}
    </span>
  )}
</div>
              </div>

              {/* Resume work CTA */}
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-indigo-500 font-medium">
                  View minutes →
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}