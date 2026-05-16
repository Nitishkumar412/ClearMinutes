import {useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  useAuth,
} from "@clerk/clerk-react";
import { setAuthToken } from "./api/client";
import Upload from "./pages/Upload";
import Processing from "./pages/Processing";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";

function AuthTokenSetter() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setAuthToken(null);
      return;
    }

    const attach = async () => {
      const token = await getToken();
      console.log("DEBUG: Token attached, length=", token?.length);
      if (token) setAuthToken(token);
    };

    attach();
    const interval = setInterval(attach, 50000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100">
        <AuthTokenSetter />

        {/* Navbar */}
        <nav className="bg-white/70 backdrop-blur-sm border-b border-blue-100 px-6 py-4 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-indigo-600">
              ClearMinutes
            </Link>

            {/* Desktop */}
            <div className="hidden sm:flex items-center gap-6">
              <SignedIn>
                <Link to="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
                  My Meetings
                </Link>
                <Link to="/" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  + New Meeting
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>

            {/* Mobile */}
            <div className="sm:hidden flex items-center gap-3">
              <SignedIn>
                <Link to="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
                  My Meetings
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </nav>

        <Routes>
          {/* Upload is public — demo works without auth */}
          <Route path="/" element={<Upload />} />

          {/* Results public for demo job, protected for real jobs */}
          <Route path="/results/:jobId" element={<Results />} />

          {/* Protected routes */}
          <Route path="/processing/:jobId" element={
            <>
              <SignedIn><Processing /></SignedIn>
              <SignedOut><Navigate to="/" /></SignedOut>
            </>
          } />
          <Route path="/dashboard" element={
            <>
              <SignedIn><Dashboard /></SignedIn>
              <SignedOut><Navigate to="/" /></SignedOut>
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
