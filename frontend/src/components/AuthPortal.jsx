import React, { useState, useEffect } from "react";
import { KeyRound, Mail, User, Phone, Stethoscope, ArrowRight } from "lucide-react";
import { API_URL } from "../config";

export default function AuthPortal({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("patient"); // patient, doctor, admin
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleUrl, setGoogleUrl] = useState("");

  // Fetch Google OAuth URL on mount
  useEffect(() => {
    fetch(`${API_URL}/auth/google/url`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setGoogleUrl(data.url);
      })
      .catch((err) => console.error("Error fetching Google Auth URL:", err));
  }, []);

  // Handle Google Redirect Callback Check in Query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setLoading(true);
      setError("");
      // Call callback endpoint
      fetch(`${API_URL}/auth/google/callback?code=${code}`)
        .then((res) => {
          if (!res.ok) throw new Error("Google login failed.");
          return res.json();
        })
        .then((data) => {
          // Clear query params
          window.history.replaceState({}, document.title, "/");
          onLoginSuccess(data);
        })
        .catch((err) => {
          setError(err.message || "Failed to log in with Google.");
        })
        .finally(() => setLoading(false));
    }
  }, [onLoginSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        // Build OAuth2 request body format
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Invalid login credentials.");
        }

        onLoginSuccess(data);
      } else {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, name, phone, role }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Registration failed. Try again.");
        }

        setSuccess("Registration successful! Please log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async (guestRole) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/guest?role=${guestRole}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Guest login failed.");
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Visual Showroom Side */}
      <div className="lg:w-1/2 flex flex-col justify-between p-8 lg:p-16 bg-gradient-to-br from-royal-purple to-deep-black relative overflow-hidden border-b lg:border-b-0 lg:border-r border-divine-gold/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,168,67,0.1),transparent)] pointer-events-none" />
        
        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded-xl bg-divine-gold/10 border border-divine-gold/30">
            <Stethoscope className="w-6 h-6 text-divine-gold gold-glow" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-wide bg-gradient-to-r from-cream to-divine-gold bg-clip-text text-transparent">
            AETHERIA
          </span>
        </div>

        {/* Hero Quote */}
        <div className="my-12 lg:my-0 relative z-10">
          <p className="text-divine-gold/60 text-xs font-semibold tracking-widest uppercase mb-4">
            A NEW STANDARD OF CARE
          </p>
          <h1 className="font-serif text-3xl lg:text-5xl font-bold text-cream leading-tight mb-6">
            Connecting clinical precision with premium elegance.
          </h1>
          <p className="text-warm-white/70 text-sm max-w-md leading-relaxed">
            Experience an appointment and treatment journey designed to restore harmony. Real-time slot locking, intelligent pre-visit overviews, and structured post-visit care—curated for doctor and patient.
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs text-warm-white/40 relative z-10">
          &copy; 2026 Aetheria Healthcare Systems. Built with elegance and security.
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-deep-purple">
        <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative">
          <h2 className="font-serif text-3xl text-cream font-bold mb-2">
            {isLogin ? "Welcome Back" : "Begin Your Journey"}
          </h2>
          <p className="text-xs text-divine-gold mb-8 uppercase tracking-widest">
            {isLogin ? "Sign in to your dashboard" : "Register a new profile"}
          </p>

          {error && (
            <div className="p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-6 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-warm-white/60 mb-2 font-medium">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-divine-gold/45" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-cream text-sm focus:border-divine-gold focus:ring-1 focus:ring-divine-gold focus:outline-none transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-warm-white/60 mb-2 font-medium">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-divine-gold/45" />
                    <input
                      type="tel"
                      placeholder="e.g. +1 234 567 890"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-cream text-sm focus:border-divine-gold focus:ring-1 focus:ring-divine-gold focus:outline-none transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-warm-white/60 mb-2 font-medium">
                    Register As
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-cream text-sm focus:border-divine-gold focus:ring-1 focus:ring-divine-gold focus:outline-none transition-all"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="patient" className="bg-royal-purple">Patient</option>
                    <option value="doctor" className="bg-royal-purple">Doctor</option>
                    <option value="admin" className="bg-royal-purple">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-warm-white/60 mb-2 font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-divine-gold/45" />
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-cream text-sm focus:border-divine-gold focus:ring-1 focus:ring-divine-gold focus:outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-warm-white/60 mb-2 font-medium">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-divine-gold/45" />
                <input
                  type="password"
                  required
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-cream text-sm focus:border-divine-gold focus:ring-1 focus:ring-divine-gold focus:outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-divine-gold to-gold-shimmer hover:from-gold-shimmer hover:to-gold-light text-royal-purple font-semibold rounded-lg shadow-lg hover:shadow-divine-gold/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Google Login Trigger */}
          {isLogin && googleUrl && (
            <div className="mt-6">
              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-divine-gold/10 w-full" />
                <span className="absolute px-3 bg-royal-purple text-warm-white/50 text-[10px] uppercase tracking-widest font-semibold">
                  Or Connect With
                </span>
              </div>
              <a
                href={googleUrl}
                className="w-full py-3 border border-divine-gold/20 hover:border-divine-gold/50 rounded-lg text-cream font-medium text-sm flex items-center justify-center gap-2.5 transition-all bg-deep-black/20"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sync Google Calendar
              </a>
            </div>
          )}

          {/* Guest Login Selector */}
          {isLogin && (
            <div className="mt-6">
              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-divine-gold/10 w-full" />
                <span className="absolute px-3 bg-royal-purple text-warm-white/50 text-[10px] uppercase tracking-widest font-semibold">
                  Or Test Drive (Guest Login)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleGuestLogin("patient")}
                  className="py-2.5 border border-divine-gold/20 hover:border-divine-gold/50 rounded text-[10px] uppercase font-bold text-cream bg-deep-black/20 transition-all cursor-pointer hover:bg-divine-gold/5"
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => handleGuestLogin("doctor")}
                  className="py-2.5 border border-divine-gold/20 hover:border-divine-gold/50 rounded text-[10px] uppercase font-bold text-cream bg-deep-black/20 transition-all cursor-pointer hover:bg-divine-gold/5"
                >
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => handleGuestLogin("admin")}
                  className="py-2.5 border border-divine-gold/20 hover:border-divine-gold/50 rounded text-[10px] uppercase font-bold text-cream bg-deep-black/20 transition-all cursor-pointer hover:bg-divine-gold/5"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-xs">
            <span className="text-warm-white/50">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="text-divine-gold font-semibold hover:underline bg-transparent border-0 cursor-pointer"
            >
              {isLogin ? "Register here" : "Login here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
