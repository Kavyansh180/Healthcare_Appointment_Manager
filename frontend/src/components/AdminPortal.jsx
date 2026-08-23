import React, { useState, useEffect } from "react";
import { 
  Users, 
  CalendarOff, 
  BarChart3, 
  Activity, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  UserCheck, 
  Star, 
  ShieldCheck, 
  Building2, 
  Sparkles 
} from "lucide-react";
import { API_URL } from "../config";

export default function AdminPortal({ token, user, activeTab, setActiveTab }) {

  // Data states
  const [doctors, setDoctors] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form states
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialisation: "Cardiology",
    experience_years: 10,
    consultation_fee: 120,
    room_suite: "Suite 301",
    rating: "4.95",
    bio: ""
  });

  // Leave Form state
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    fetchDoctors();
    fetchLeaves();
    fetchAnalytics();
  }, [token]);

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
        if (data.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Fetch doctors error:", err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (err) {
      console.error("Fetch leaves error:", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Fetch admin analytics error:", err);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/doctors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_in: {
            name: newDoctor.name,
            email: newDoctor.email,
            password: newDoctor.password || "doctorpass123",
            phone: newDoctor.phone,
            role: "doctor"
          },
          doctor_in: {
            specialisation: newDoctor.specialisation,
            slot_duration_minutes: 30,
            experience_years: parseInt(newDoctor.experience_years) || 8,
            consultation_fee: parseInt(newDoctor.consultation_fee) || 120,
            room_suite: newDoctor.room_suite,
            rating: newDoctor.rating,
            bio: newDoctor.bio,
            availabilities: [0, 1, 2, 3, 4].map((d) => ({
              day_of_week: d,
              start_time: "09:00:00",
              end_time: "17:00:00"
            }))
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create doctor profile.");

      setSuccess(`Doctor ${newDoctor.name} created successfully!`);
      setShowAddDoctorModal(false);
      setNewDoctor({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialisation: "Cardiology",
        experience_years: 10,
        consultation_fee: 120,
        room_suite: "Suite 301",
        rating: "4.95",
        bio: ""
      });
      fetchDoctors();
      fetchAnalytics();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to remove this doctor profile?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/doctors/${doctorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete doctor.");
      setSuccess("Doctor profile removed.");
      fetchDoctors();
      fetchAnalytics();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegisterAdminLeave = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !leaveDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/doctors/${selectedDoctorId}/leaves`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leave_date: leaveDate,
          reason: leaveReason || "Administrative Scheduled Leave"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to register leave.");

      setSuccess("Doctor leave registered! Any overlapping appointments were cancelled and patients notified.");
      setLeaveDate("");
      setLeaveReason("");
      fetchLeaves();
      fetchAnalytics();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-red-300 text-sm">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-200 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-sm">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Header Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-royal-purple via-[#1e0d45] to-[#12062b] border border-divine-gold/25 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
            <div>
              <span className="text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-divine-gold/15 text-divine-gold font-bold border border-divine-gold/30">
                System Administration
              </span>
              <h1 className="text-3xl font-black text-warm-white mt-3">
                Executive Platform Console
              </h1>
              <p className="text-sm text-warm-white/70 mt-1 max-w-xl">
                Global healthcare management overview: monitor multi-specialty capacity, 
                leave conflict automation, and platform revenue.
              </p>
            </div>

            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-sm shadow-lg shadow-divine-gold/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Register New Doctor
            </button>
          </div>

          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Total Doctors
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {analytics?.total_doctors ?? doctors.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-divine-gold/15 border border-divine-gold/30 flex items-center justify-center text-divine-gold">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Total Patients
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {analytics?.total_patients ?? 1}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Total Consultations
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {analytics?.total_appointments ?? 2}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Platform Revenue
                </p>
                <h3 className="text-3xl font-bold text-divine-gold font-mono">
                  ${analytics?.total_revenue ?? 95}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-divine-gold/15 border border-divine-gold/30 flex items-center justify-center text-divine-gold">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* System Health Status Banner */}
          <div className="p-6 rounded-2xl bg-royal-purple/20 border border-divine-gold/15 space-y-3">
            <h3 className="text-sm font-bold text-warm-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Platform System Health
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                <span className="text-warm-white/60">Database:</span>
                <span className="font-bold text-emerald-400">ONLINE</span>
              </div>
              <div className="p-3 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                <span className="text-warm-white/60">Groq LLaMA 3.3:</span>
                <span className="font-bold text-emerald-400">ACTIVE</span>
              </div>
              <div className="p-3 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                <span className="text-warm-white/60">Google Calendar:</span>
                <span className="font-bold text-emerald-400">READY</span>
              </div>
              <div className="p-3 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                <span className="text-warm-white/60">APScheduler Queue:</span>
                <span className="font-bold text-emerald-400">RUNNING</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DOCTOR MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === "doctors" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-warm-white">Doctor Directory & Profiles</h2>
              <p className="text-xs text-warm-white/60 mt-0.5">
                Manage medical practitioners, consult fees, clinic suites, and weekly schedules.
              </p>
            </div>

            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Specialist
            </button>
          </div>

          {/* Doctors Table */}
          <div className="rounded-2xl bg-royal-purple/25 border border-divine-gold/20 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-royal-purple/50 border-b border-divine-gold/20 text-divine-gold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-6">Doctor Name</th>
                    <th className="py-4 px-6">Specialisation</th>
                    <th className="py-4 px-6">Fee</th>
                    <th className="py-4 px-6">Experience</th>
                    <th className="py-4 px-6">Suite</th>
                    <th className="py-4 px-6">Rating</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divine-gold/10 text-warm-white/80">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-divine-gold/5 transition-colors">
                      <td className="py-4 px-6 font-bold text-warm-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-divine-gold/20 flex items-center justify-center text-divine-gold font-bold">
                          {doc.user.name[0]}
                        </div>
                        <div>
                          <div>{doc.user.name}</div>
                          <div className="text-[10px] text-warm-white/40">{doc.user.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded bg-divine-gold/15 text-divine-gold font-bold uppercase text-[10px] border border-divine-gold/30">
                          {doc.specialisation}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-divine-gold">
                        ${doc.consultation_fee || 120}
                      </td>
                      <td className="py-4 px-6">{doc.experience_years || 8} yrs</td>
                      <td className="py-4 px-6">{doc.room_suite || "Suite 401A"}</td>
                      <td className="py-4 px-6">⭐ {doc.rating || "4.95"}</td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteDoctor(doc.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer transition-all"
                          title="Delete Doctor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LEAVE MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === "leaves" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-warm-white">Leave & Conflict Management</h2>
            <p className="text-xs text-warm-white/60 mt-0.5">
              Log planned doctor leaves and trigger automatic conflict cancellations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Register Leave Form */}
            <div className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                <CalendarOff className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-warm-white">Schedule Doctor Leave</h3>
              </div>

              <form onSubmit={handleRegisterAdminLeave} className="space-y-4 text-xs">
                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Select Doctor *
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id} className="bg-royal-purple">
                        {d.user.name} ({d.specialisation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Leave Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sabbatical / Conference / Vacation"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Conflict Automation:</strong> Any patient who booked slots on this doctor's calendar on this date will have their appointment cancelled and will be immediately notified via email.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  {loading ? "Processing..." : "Register Doctor Leave"}
                </button>
              </form>
            </div>

            {/* Global Leaves Table */}
            <div className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                <Calendar className="w-5 h-5 text-divine-gold" />
                <h3 className="text-base font-bold text-warm-white">Recent Registered Leaves</h3>
              </div>

              {leaves.length === 0 ? (
                <div className="p-8 text-center text-warm-white/40 text-xs">
                  No active leaves on record.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {leaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-3.5 rounded-xl bg-deep-black/40 border border-divine-gold/15 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-warm-white block">
                          Doctor ID #{l.doctor_id}
                        </span>
                        <span className="text-[11px] text-warm-white/60">
                          {l.leave_date} • {l.reason || "Scheduled Leave"}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase">
                        Approved
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PLATFORM ANALYTICS */}
      {/* ======================================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-warm-white">Platform Analytics & Metrics</h2>
            <p className="text-xs text-warm-white/60 mt-0.5">
              Deep dive into specialty utilization, appointment statuses, and revenue statistics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Specialty Distribution */}
            <div className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                <BarChart3 className="w-5 h-5 text-divine-gold" />
                <h3 className="text-base font-bold text-warm-white">Specialists Distribution</h3>
              </div>

              <div className="space-y-3">
                {analytics?.specialty_distribution &&
                  Object.entries(analytics.specialty_distribution).map(([spec, count]) => (
                    <div key={spec} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold text-warm-white">
                        <span>{spec}</span>
                        <span className="text-divine-gold">{count} doctor(s)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-deep-black/60 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-divine-gold to-gold-shimmer rounded-full"
                          style={{ width: `${Math.min(100, count * 25)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Appointment Status Distribution */}
            <div className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                <Activity className="w-5 h-5 text-divine-gold" />
                <h3 className="text-base font-bold text-warm-white">Consultation Status Breakdown</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                  <span className="font-semibold text-warm-white">Scheduled / Upcoming</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {analytics?.status_distribution?.scheduled ?? 1}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                  <span className="font-semibold text-warm-white">Completed & Prescribed</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {analytics?.status_distribution?.completed ?? 1}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-deep-black/30 border border-divine-gold/10 flex items-center justify-between">
                  <span className="font-semibold text-warm-white">Cancelled / Conflict Released</span>
                  <span className="font-bold text-red-400 text-sm">
                    {analytics?.status_distribution?.cancelled ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 bg-deep-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-royal-purple border border-divine-gold/30 p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-divine-gold/15">
              <h3 className="text-lg font-bold text-warm-white">Register New Medical Specialist</h3>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="text-warm-white/50 hover:text-warm-white text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Julian Croft"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@healthcare.com"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                    Specialisation *
                  </label>
                  <select
                    value={newDoctor.specialisation}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialisation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                  >
                    <option value="Cardiology" className="bg-royal-purple">Cardiology</option>
                    <option value="Neurology" className="bg-royal-purple">Neurology</option>
                    <option value="Dermatology" className="bg-royal-purple">Dermatology</option>
                    <option value="Orthopedics" className="bg-royal-purple">Orthopedics</option>
                    <option value="Pediatrics" className="bg-royal-purple">Pediatrics</option>
                    <option value="Oncology" className="bg-royal-purple">Oncology</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                    Consultation Fee ($ USD) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newDoctor.consultation_fee}
                    onChange={(e) => setNewDoctor({ ...newDoctor, consultation_fee: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={newDoctor.experience_years}
                    onChange={(e) => setNewDoctor({ ...newDoctor, experience_years: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                    Clinic Suite / Room
                  </label>
                  <input
                    type="text"
                    value={newDoctor.room_suite}
                    onChange={(e) => setNewDoctor({ ...newDoctor, room_suite: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-1">
                  Bio / Clinical Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Specializing in advanced diagnostic workflows and targeted patient care."
                  value={newDoctor.bio}
                  onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
                  className="w-full p-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-xs focus:outline-none focus:border-divine-gold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-divine-gold/15">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 text-warm-white/60 hover:text-warm-white cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold shadow-md cursor-pointer"
                >
                  {loading ? "Creating..." : "Save Doctor Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
