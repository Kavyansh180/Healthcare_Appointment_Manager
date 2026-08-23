import React from "react";
import { 
  Activity, 
  Stethoscope, 
  Calendar, 
  FileText, 
  Users, 
  Clock, 
  CalendarOff, 
  BarChart3, 
  LogOut,
  Sparkles,
  Mail,
  Database
} from "lucide-react";

export default function Navbar({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  onQuickSwitch,
  onOpenNotifications
}) {
  const isPatient = user?.role === "patient";
  const isDoctor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0418]/90 backdrop-blur-md border-b border-divine-gold/15">
      {/* Top Banner with Quick Switcher */}
      <div className="bg-gradient-to-r from-royal-purple/90 via-[#180a3a] to-royal-purple/90 px-4 py-1.5 border-b border-divine-gold/10 flex flex-wrap items-center justify-between text-[11px] text-cream/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-divine-gold animate-pulse" />
          <span className="font-medium text-warm-white">
            Atheria AI Healthcare Suite <span className="text-divine-gold/80">• Groq LLaMA 3.3 70B & Concurrency Engine</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-warm-white/60">Quick Demo Switch:</span>
          <div className="flex items-center gap-1.5 bg-deep-black/60 p-0.5 rounded-md border border-divine-gold/20">
            <button
              onClick={() => onQuickSwitch("patient")}
              className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                isPatient
                  ? "bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple shadow-sm"
                  : "text-warm-white/70 hover:text-divine-gold hover:bg-white/5"
              }`}
            >
              Patient
            </button>
            <button
              onClick={() => onQuickSwitch("doctor")}
              className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                isDoctor
                  ? "bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple shadow-sm"
                  : "text-warm-white/70 hover:text-divine-gold hover:bg-white/5"
              }`}
            >
              Doctor
            </button>
            <button
              onClick={() => onQuickSwitch("admin")}
              className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                isAdmin
                  ? "bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple shadow-sm"
                  : "text-warm-white/70 hover:text-divine-gold hover:bg-white/5"
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-divine-gold/20 to-royal-purple border border-divine-gold/40 flex items-center justify-center shadow-lg shadow-divine-gold/10">
            <Activity className="w-5 h-5 text-divine-gold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-warm-white font-serif">
                Atheria
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-divine-gold/20 text-divine-gold rounded border border-divine-gold/30">
                HEALTH
              </span>
            </div>
            <p className="text-[10px] text-warm-white/40 tracking-wider uppercase font-medium">
              Care & Follow-up Suite
            </p>
          </div>
        </div>

        {/* Dynamic Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-royal-purple/40 p-1 rounded-xl border border-divine-gold/15">
          {/* Patient Tabs */}
          {isPatient && (
            <>
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("find-doctors")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "find-doctors"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Find Doctors
              </button>
              <button
                onClick={() => setActiveTab("my-visits")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "my-visits"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                My Visits
              </button>
              <button
                onClick={() => setActiveTab("prescriptions")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "prescriptions"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Prescriptions & AI
              </button>
            </>
          )}

          {/* Doctor Tabs */}
          {isDoctor && (
            <>
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("queue")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "queue"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Doctor Queue
              </button>
              <button
                onClick={() => setActiveTab("schedule")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "schedule"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Schedule & Leave
              </button>
            </>
          )}

          {/* Admin Tabs */}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("doctors")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "doctors"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Doctor Management
              </button>
              <button
                onClick={() => setActiveTab("leaves")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "leaves"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <CalendarOff className="w-3.5 h-3.5" />
                Leave Management
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "database"
                    ? "bg-divine-gold/20 text-divine-gold border border-divine-gold/30 shadow-sm"
                    : "text-warm-white/70 hover:text-cream hover:bg-white/5"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                SQL & DB
              </button>
            </>
          )}
        </nav>

        {/* Live Email Center & User Pill & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Email Outbox Trigger Button */}
          <button
            onClick={onOpenNotifications}
            title="Live Email Outbox & Notification Logs"
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-divine-gold/15 to-royal-purple border border-divine-gold/30 text-divine-gold hover:border-divine-gold/60 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm text-xs font-semibold"
          >
            <Mail className="w-3.5 h-3.5 text-divine-gold" />
            <span className="hidden sm:inline">Email Outbox</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-warm-white">
              {user?.name || "Healthcare User"}
            </div>
            <div className="text-[10px] text-divine-gold capitalize font-medium">
              {user?.role} Portal
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-warm-white/70 hover:text-divine-gold hover:border-divine-gold/50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
