import React, { useState, useEffect } from "react";
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  Search, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Video, 
  FileText, 
  ArrowRight, 
  ChevronRight,
  SlidersHorizontal,
  XCircle,
  Pill,
  HeartPulse,
  Info,
  CalendarCheck,
  Star,
  UserCheck,
  Building2,
  CalendarDays,
  Mail
} from "lucide-react";
import { API_URL } from "../config";

export default function PatientPortal({ token, user, activeTab, setActiveTab }) {

  // Data states
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter states
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [visitFilter, setVisitFilter] = useState("all");

  // Booking Flow States
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Slot, 2: Triage, 3: Confirmed
  const [bookingDate, setBookingDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split("T")[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotHold, setSlotHold] = useState(null);
  const [holdTimer, setHoldTimer] = useState(600); // 10 mins in seconds
  const [confirmedAppt, setConfirmedAppt] = useState(null);

  // Symptom Triage Form States
  const [symptomsText, setSymptomsText] = useState("");
  const [severityScale, setSeverityScale] = useState(6);
  const [durationDays, setDurationDays] = useState(3);
  const [medicationsAllergies, setMedicationsAllergies] = useState("");

  // Specialties
  const specialties = [
    "All",
    "Cardiology",
    "Neurology",
    "Dermatology",
    "Orthopedics",
    "Pediatrics",
    "Oncology"
  ];

  // Fetch initial data
  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchOverview();
  }, [token]);

  // Hold Timer countdown
  useEffect(() => {
    let interval = null;
    if (slotHold && holdTimer > 0) {
      interval = setInterval(() => {
        setHoldTimer((prev) => prev - 1);
      }, 1000);
    } else if (holdTimer === 0 && slotHold) {
      setSlotHold(null);
      setSelectedSlot(null);
      setBookingStep(1);
      setError("Your 10-minute slot reservation expired. Please select a slot again.");
    }
    return () => clearInterval(interval);
  }, [slotHold, holdTimer]);

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API_URL}/patient/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOverviewStats(data);
      }
    } catch (err) {
      console.error("Overview error:", err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_URL}/patient/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error("Fetch doctors error:", err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/patient/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Fetch appointments error:", err);
    }
  };

  // Fetch available slots for selected doctor and date
  const fetchSlots = async (docId, dateStr) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/patient/doctors/${docId}/slots?date_str=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Could not retrieve available slots.");
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBooking = (doctor) => {
    setBookingDoctor(doctor);
    setBookingStep(1);
    setSelectedSlot(null);
    setSlotHold(null);
    fetchSlots(doctor.id, bookingDate);
    setActiveTab("find-doctors");
  };

  const handleDateChange = (newDate) => {
    setBookingDate(newDate);
    if (bookingDoctor) {
      fetchSlots(bookingDoctor.id, newDate);
    }
  };

  const handleSelectSlot = async (slot) => {
    if (!slot.available) return;
    setError("");
    setLoading(true);
    try {
      // Claim 10-minute hold
      const res = await fetch(`${API_URL}/appointments/hold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: bookingDoctor.id,
          slot_start: slot.start,
          slot_end: slot.end
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to hold slot.");

      setSlotHold(data);
      setSelectedSlot(slot);
      setHoldTimer(600); // 10 mins
      setBookingStep(2); // Move to symptom intake
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!symptomsText.trim()) {
      setError("Please describe your primary symptoms and chief complaint.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/appointments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: bookingDoctor.id,
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
          symptoms: {
            symptoms_text: symptomsText,
            severity_scale: severityScale,
            duration_days: parseInt(durationDays) || 1,
            medications_allergies: medicationsAllergies
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Booking failed.");

      setConfirmedAppt(data);
      setBookingStep(3);
      setSlotHold(null);
      fetchAppointments();
      fetchOverview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res = await fetch(`${API_URL}/appointments/${apptId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to cancel appointment.");
      setSuccess("Appointment cancelled successfully.");
      fetchAppointments();
      fetchOverview();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Filtered & Sorted Doctors
  const filteredDoctors = doctors
    .filter((doc) => {
      const matchSpecialty =
        selectedSpecialty === "All" ||
        doc.specialisation.toLowerCase() === selectedSpecialty.toLowerCase();
      const matchSearch =
        !searchQuery ||
        doc.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialisation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.bio && doc.bio.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSpecialty && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "experience") return (b.experience_years || 0) - (a.experience_years || 0);
      if (sortBy === "fee_low") return (a.consultation_fee || 0) - (b.consultation_fee || 0);
      if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      return 0;
    });

  // Filtered Visits
  const filteredAppointments = appointments.filter((appt) => {
    if (visitFilter === "scheduled") return appt.status === "scheduled";
    if (visitFilter === "completed") return appt.status === "completed";
    if (visitFilter === "cancelled") return appt.status === "cancelled";
    return true;
  });

  const completedVisitsWithPrescriptions = appointments.filter(
    (a) => a.status === "completed" && a.prescription
  );

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSeverityText = (val) => {
    if (val <= 3) return "Mild";
    if (val <= 6) return "Moderate";
    if (val <= 8) return "Severe";
    return "Critical";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Alert Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-red-300 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-200 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-10">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-royal-purple via-[#1e0d45] to-[#12062b] border border-divine-gold/25 p-8 sm:p-12 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-divine-gold/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-divine-gold/15 border border-divine-gold/30 text-divine-gold text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Next-Generation Intelligent Healthcare
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-warm-white tracking-tight leading-tight mb-4">
                Clinical Care Meets <br />
                <span className="bg-gradient-to-r from-divine-gold via-gold-shimmer to-gold-light bg-clip-text text-transparent">
                  Intelligent Automation
                </span>
              </h1>
              <p className="text-warm-white/70 text-sm sm:text-base mb-8 leading-relaxed">
                Experience friction-free healthcare appointments with <strong>concurrency-safe slot locking</strong>, 
                instant <strong>Groq LLaMA 3.3 AI pre-visit triage</strong>, and automated patient follow-ups.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setActiveTab("find-doctors")}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer hover:from-gold-shimmer hover:to-gold-light text-royal-purple font-bold text-sm shadow-lg shadow-divine-gold/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4" /> Find Specialists & Book
                </button>
                <button
                  onClick={() => setActiveTab("prescriptions")}
                  className="px-6 py-3.5 rounded-xl bg-deep-black/40 border border-divine-gold/30 hover:border-divine-gold/60 text-cream font-semibold text-sm transition-all cursor-pointer"
                >
                  View Prescriptions & AI
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Active Appointments
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {overviewStats?.active_appointments_count ?? appointments.filter((a) => a.status === "scheduled").length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-divine-gold/15 border border-divine-gold/30 flex items-center justify-center text-divine-gold">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Completed Consultations
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {overviewStats?.completed_visits_count ?? appointments.filter((a) => a.status === "completed").length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Active Prescriptions
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {completedVisitsWithPrescriptions.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Pill className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Next Scheduled Appointment Spotlight */}
          {overviewStats?.next_appointment && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-divine-gold/10 via-royal-purple/40 to-transparent border border-divine-gold/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-divine-gold/20 border border-divine-gold/40 flex items-center justify-center text-divine-gold">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-divine-gold/20 text-divine-gold text-[10px] uppercase tracking-wider font-bold mb-1">
                    Next Upcoming Consultation
                  </div>
                  <h4 className="text-lg font-bold text-warm-white">
                    {overviewStats.next_appointment.doctor_name}
                  </h4>
                  <p className="text-xs text-warm-white/60">
                    {overviewStats.next_appointment.specialisation} •{" "}
                    {new Date(overviewStats.next_appointment.slot_start).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={overviewStats.next_appointment.meet_link || "https://meet.google.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-divine-gold text-royal-purple font-semibold text-xs flex items-center gap-2 hover:bg-gold-light transition-all"
                >
                  <Video className="w-3.5 h-3.5" /> Join Live Video Call
                </a>
              </div>
            </div>
          )}

          {/* Recent Visits Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-warm-white">Recent Consultations & Triage</h3>
              <button
                onClick={() => setActiveTab("my-visits")}
                className="text-xs text-divine-gold hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                View All Visits <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-royal-purple/20 border border-divine-gold/10 text-warm-white/50 text-sm">
                No consultations booked yet. Click "Find Specialists & Book" above to schedule your first visit.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.slice(0, 4).map((appt) => (
                  <div
                    key={appt.id}
                    className="p-5 rounded-2xl bg-royal-purple/25 border border-divine-gold/15 hover:border-divine-gold/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-divine-gold uppercase tracking-wider">
                          {appt.doctor.specialisation}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            appt.status === "scheduled"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : appt.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-warm-white mb-1">
                        {appt.doctor.user.name}
                      </h4>
                      <p className="text-xs text-warm-white/60 mb-3 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-divine-gold/60" />
                        {new Date(appt.slot_start).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </p>

                      {appt.symptom_form && (
                        <div className="p-3 rounded-xl bg-deep-black/30 border border-divine-gold/10 text-xs text-warm-white/70 mb-3">
                          <p className="font-semibold text-divine-gold/80 mb-0.5">
                            Chief Complaint: {appt.symptom_form.chief_complaint}
                          </p>
                          <p className="line-clamp-2 italic text-warm-white/50">
                            "{appt.symptom_form.symptoms_text}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-divine-gold/10 flex items-center justify-between">
                      {appt.status === "scheduled" ? (
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                        >
                          Cancel Booking
                        </button>
                      ) : appt.prescription ? (
                        <button
                          onClick={() => setActiveTab("prescriptions")}
                          className="text-xs text-divine-gold hover:underline font-semibold cursor-pointer"
                        >
                          View Prescription Summary
                        </button>
                      ) : (
                        <span className="text-xs text-warm-white/40">No prescription recorded</span>
                      )}

                      {appt.status === "scheduled" && (
                        <a
                          href={appt.meet_link || "https://meet.google.com"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          <Video className="w-3.5 h-3.5" /> Video Call
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FIND DOCTORS & MULTI-STEP BOOKING */}
      {/* ======================================================== */}
      {activeTab === "find-doctors" && (
        <div className="space-y-8">
          {/* If Booking Flow is Active */}
          {bookingDoctor ? (
            <div className="space-y-6">
              {/* Top Navigation & Breadcrumbs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divine-gold/15">
                <button
                  onClick={() => {
                    setBookingDoctor(null);
                    setBookingStep(1);
                    setSlotHold(null);
                  }}
                  className="text-xs text-divine-gold hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  &larr; Back to Specialists Directory
                </button>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={bookingStep >= 1 ? "text-divine-gold" : "text-warm-white/40"}>
                    1. Select Slot
                  </span>
                  <span className="text-warm-white/30">&rarr;</span>
                  <span className={bookingStep >= 2 ? "text-divine-gold" : "text-warm-white/40"}>
                    2. Pre-Visit Triage
                  </span>
                  <span className="text-warm-white/30">&rarr;</span>
                  <span className={bookingStep >= 3 ? "text-divine-gold" : "text-warm-white/40"}>
                    3. Confirmed
                  </span>
                </div>
              </div>

              {/* Doctor Header Card */}
              <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-divine-gold/20 to-royal-purple border border-divine-gold/40 flex items-center justify-center text-divine-gold font-bold text-xl">
                    {bookingDoctor.user.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-warm-white">{bookingDoctor.user.name}</h3>
                    <p className="text-xs text-divine-gold font-semibold">
                      {bookingDoctor.specialisation} • {bookingDoctor.experience_years || 8} years experience
                    </p>
                    <p className="text-xs text-warm-white/60 mt-0.5">
                      {bookingDoctor.room_suite || "Suite 401A"} • Rating: ⭐ {bookingDoctor.rating || "4.95"}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-warm-white/50 uppercase tracking-wider block font-semibold">
                    Consultation Fee
                  </span>
                  <span className="text-2xl font-black text-divine-gold">
                    ${bookingDoctor.consultation_fee || 120} USD
                  </span>
                </div>
              </div>

              {/* STEP 1: SELECT SLOT */}
              {bookingStep === 1 && (
                <div className="space-y-6">
                  {/* Date Selector */}
                  <div className="p-6 rounded-2xl bg-royal-purple/20 border border-divine-gold/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5 text-divine-gold" />
                      <span className="text-sm font-semibold text-warm-white">
                        Select Appointment Date
                      </span>
                    </div>
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/30 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                    />
                  </div>

                  {/* Available Slots Grid */}
                  <div className="p-6 rounded-2xl bg-royal-purple/20 border border-divine-gold/15 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-warm-white">
                        <Clock className="w-4 h-4 text-divine-gold" />
                        Available Consultation Slots
                      </div>

                      <div className="flex items-center gap-3 text-xs text-warm-white/60">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-divine-gold" /> Available
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Held (10m)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> Booked
                        </span>
                      </div>
                    </div>

                    {loading ? (
                      <div className="py-12 text-center text-sm text-divine-gold font-medium">
                        Loading available consultation slots...
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-12 text-center text-sm text-warm-white/50">
                        No available slots for this date. The doctor may be off or booked out.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {slots.map((slot, index) => {
                          const slotTimeStr = new Date(slot.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          });
                          return (
                            <button
                              key={index}
                              disabled={!slot.available}
                              onClick={() => handleSelectSlot(slot)}
                              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                slot.available
                                  ? "bg-royal-purple/50 border border-divine-gold/30 hover:border-divine-gold hover:bg-divine-gold/20 text-cream shadow-sm hover:scale-105"
                                  : "bg-deep-black/40 border border-white/5 text-warm-white/20 cursor-not-allowed"
                              }`}
                            >
                              <span>{slotTimeStr}</span>
                              <span className="text-[9px] font-normal uppercase tracking-wider opacity-70">
                                {slot.available ? "Open" : "Locked"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: PRE-VISIT TRIAGE FORM */}
              {bookingStep === 2 && (
                <div className="space-y-6">
                  {/* Slot Hold Banner with Animated Countdown */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-royal-purple/40 to-amber-500/20 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-warm-white">
                          Slot Reserved for You
                        </h4>
                        <p className="text-xs text-warm-white/60">
                          Complete symptoms intake to confirm your appointment.
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-amber-300 font-mono">
                        {formatTimer(holdTimer)}
                      </span>
                      <span className="text-[10px] text-warm-white/50 block uppercase tracking-wider font-semibold">
                        Remaining
                      </span>
                    </div>
                  </div>

                  {/* Symptom Assessment Form */}
                  <form onSubmit={handleConfirmBooking} className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-6">
                    <div className="flex items-center gap-3 pb-3 border-b border-divine-gold/10">
                      <HeartPulse className="w-5 h-5 text-divine-gold" />
                      <div>
                        <h3 className="text-base font-bold text-warm-white">
                          Pre-Visit Symptom Assessment
                        </h3>
                        <p className="text-xs text-warm-white/60">
                          Groq LLaMA 3.3 AI will analyze your intake for clinical urgency and doctor preparation.
                        </p>
                      </div>
                    </div>

                    {/* Chief Complaint Description */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                        Describe Primary Symptoms & Chief Complaint *
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="E.g., Experiencing throbbing migraine pain on the right side of head, with sensitivity to light and mild nausea for the past 2 days..."
                        value={symptomsText}
                        onChange={(e) => setSymptomsText(e.target.value)}
                        className="w-full p-4 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                      />
                    </div>

                    {/* Duration & Severity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                          Symptom Duration (Days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={durationDays}
                          onChange={(e) => setDurationDays(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs uppercase tracking-wider text-warm-white/70 font-semibold">
                            Discomfort / Severity Scale (1 - 10)
                          </label>
                          <span className="text-xs font-bold text-divine-gold">
                            {severityScale}/10 ({getSeverityText(severityScale)})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={severityScale}
                          onChange={(e) => setSeverityScale(parseInt(e.target.value))}
                          className="w-full accent-divine-gold cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Medications & Allergies */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                        Current Medications / Allergies (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="E.g., Taking Metformin 500mg, allergic to Penicillin"
                        value={medicationsAllergies}
                        onChange={(e) => setMedicationsAllergies(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-divine-gold/10">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingStep(1);
                          setSlotHold(null);
                        }}
                        className="text-xs text-warm-white/60 hover:text-warm-white font-semibold cursor-pointer"
                      >
                        Cancel & Change Slot
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer hover:from-gold-shimmer hover:to-gold-light text-royal-purple font-bold text-sm shadow-lg shadow-divine-gold/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {loading ? "Processing Triage..." : "✓ Confirm & Sync Calendar"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3: CONFIRMED */}
              {bookingStep === 3 && confirmedAppt && (
                <div className="p-8 rounded-3xl bg-royal-purple/30 border border-emerald-500/40 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-warm-white mb-2">
                      Appointment Confirmed & Synced!
                    </h2>
                    <p className="text-sm text-warm-white/70 max-w-md mx-auto">
                      Your consultation with <strong>{confirmedAppt.doctor.user.name}</strong> has been 
                      booked and scheduled with automatic Google Calendar synchronization.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto p-4 rounded-xl bg-deep-black/40 border border-divine-gold/20 text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-warm-white/50">Specialist:</span>
                      <span className="font-semibold text-warm-white">{confirmedAppt.doctor.user.name} ({confirmedAppt.doctor.specialisation})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-white/50">Date & Time:</span>
                      <span className="font-semibold text-divine-gold">
                        {new Date(confirmedAppt.slot_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {confirmedAppt.symptom_form && (
                      <div className="flex justify-between">
                        <span className="text-warm-white/50">AI Assessed Urgency:</span>
                        <span className="font-bold text-amber-300">{confirmedAppt.symptom_form.urgency_level}</span>
                      </div>
                    )}
                  </div>

                  {/* Email Confirmation Notice */}
                  <div className="max-w-md mx-auto p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-left">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-300">
                        Confirmation Email Dispatched
                      </p>
                      <p className="text-[11px] text-warm-white/70">
                        Delivered to <strong>{user?.email || confirmedAppt?.patient?.email || "your email address"}</strong> with complete consult details and Google Meet link.
                      </p>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        setBookingDoctor(null);
                        setBookingStep(1);
                        setActiveTab("my-visits");
                      }}
                      className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-sm shadow-lg shadow-divine-gold/20 hover:scale-105 transition-all cursor-pointer"
                    >
                      View My Appointments
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Doctor Directory */
            <div className="space-y-6">
              {/* Header & Search/Filter Controls */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-divine-gold/15 text-divine-gold text-xs font-semibold uppercase tracking-wider mb-2">
                  <Stethoscope className="w-3.5 h-3.5" /> Certified Medical Specialists
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-warm-white">
                  Find Your Doctor
                </h2>
                <p className="text-xs text-warm-white/60 mt-1">
                  Book consultations with immediate slot locking & AI-assisted triage.
                </p>
              </div>

              {/* Search Bar & Sort */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-divine-gold/50" />
                  <input
                    type="text"
                    placeholder="Search by doctor or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-royal-purple/20 border border-divine-gold/20 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-royal-purple/20 border border-divine-gold/20 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all cursor-pointer"
                  >
                    <option value="recommended" className="bg-royal-purple">Recommended</option>
                    <option value="experience" className="bg-royal-purple">Experience: High to Low</option>
                    <option value="fee_low" className="bg-royal-purple">Fee: Low to High</option>
                    <option value="rating" className="bg-royal-purple">Rating: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Specialty Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {specialties.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedSpecialty === spec
                        ? "bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold shadow-md shadow-divine-gold/20"
                        : "bg-royal-purple/30 border border-divine-gold/15 text-warm-white/70 hover:border-divine-gold/40 hover:text-cream"
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              {/* Doctors Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 hover:border-divine-gold/50 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Top Row: Avatar, Name & Rating */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-divine-gold/20 to-royal-purple border border-divine-gold/40 flex items-center justify-center text-divine-gold font-bold text-lg group-hover:scale-105 transition-all">
                            {doc.user.name[0]}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-warm-white group-hover:text-divine-gold transition-colors">
                              {doc.user.name}
                            </h4>
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-divine-gold/15 text-divine-gold font-bold border border-divine-gold/30">
                              {doc.specialisation}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-divine-gold/10 px-2 py-0.5 rounded text-xs font-bold text-divine-gold border border-divine-gold/20">
                          <Star className="w-3.5 h-3.5 fill-divine-gold" />
                          <span>{doc.rating || "4.95"}</span>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-warm-white/70 leading-relaxed mb-6 line-clamp-3">
                        {doc.bio || "Board-certified specialist dedicated to precision diagnostics, empathetic patient care, and continuous clinical excellence."}
                      </p>

                      {/* Metadata Row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-warm-white/60 mb-6 pt-4 border-t border-divine-gold/10">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-divine-gold/70" />
                          {doc.slot_duration_minutes || 30} min slots
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-divine-gold/70" />
                          {doc.experience_years || 8} yrs exp
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-divine-gold/70" />
                          {doc.room_suite || "Suite 401A"}
                        </span>
                        <span className="flex items-center gap-1.5 font-bold text-divine-gold">
                          ${doc.consultation_fee || 120} Fee
                        </span>
                      </div>
                    </div>

                    {/* Book Button */}
                    <button
                      onClick={() => handleStartBooking(doc)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-divine-gold/90 to-gold-shimmer hover:from-gold-shimmer hover:to-gold-light text-royal-purple font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Book Consultation <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MY VISITS */}
      {/* ======================================================== */}
      {activeTab === "my-visits" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-warm-white">My Consultations</h2>
              <p className="text-xs text-warm-white/60 mt-0.5">
                Track your active bookings, past clinical visits, and video links.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-royal-purple/40 p-1 rounded-xl border border-divine-gold/20 text-xs">
              {["all", "scheduled", "completed", "cancelled"].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setVisitFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all cursor-pointer ${
                    visitFilter === filterKey
                      ? "bg-divine-gold text-royal-purple font-bold shadow-sm"
                      : "text-warm-white/70 hover:text-cream"
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-royal-purple/20 border border-divine-gold/15 text-warm-white/50 text-sm">
              No appointments found under this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 hover:border-divine-gold/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-divine-gold uppercase tracking-wider">
                        {appt.doctor.specialisation}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          appt.status === "scheduled"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : appt.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-warm-white">
                      {appt.doctor.user.name}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-warm-white/60">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-divine-gold" />
                        {new Date(appt.slot_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span>Suite: {appt.doctor.room_suite || "Suite 401A"}</span>
                    </div>

                    {appt.symptom_form && (
                      <div className="p-3 rounded-xl bg-deep-black/40 border border-divine-gold/10 text-xs text-warm-white/70">
                        <p className="font-semibold text-divine-gold mb-1">
                          Chief Complaint: {appt.symptom_form.chief_complaint}
                        </p>
                        <p className="italic text-warm-white/50">
                          "{appt.symptom_form.symptoms_text}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-end gap-3 shrink-0">
                    {appt.status === "scheduled" && (
                      <>
                        <a
                          href={appt.meet_link || "https://meet.google.com"}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-divine-gold text-royal-purple font-bold text-xs flex items-center justify-center gap-2 hover:bg-gold-light transition-all"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Video Call
                        </a>

                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                        >
                          Cancel Appointment
                        </button>
                      </>
                    )}

                    {appt.status === "completed" && appt.prescription && (
                      <button
                        onClick={() => setActiveTab("prescriptions")}
                        className="px-4 py-2 rounded-xl bg-divine-gold/20 border border-divine-gold/40 text-divine-gold font-semibold text-xs hover:bg-divine-gold/30 transition-all cursor-pointer"
                      >
                        View Prescription & AI
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PRESCRIPTIONS & AI */}
      {/* ======================================================== */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-warm-white">Prescriptions & AI Visit Summaries</h2>
            <p className="text-xs text-warm-white/60 mt-0.5">
              Review official doctor consultation notes, prescribed medications, and AI patient-friendly explanations.
            </p>
          </div>

          {completedVisitsWithPrescriptions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-royal-purple/20 border border-divine-gold/15 text-warm-white/50 text-sm">
              No completed visit prescriptions recorded yet.
            </div>
          ) : (
            <div className="space-y-6">
              {completedVisitsWithPrescriptions.map((appt) => {
                const presc = appt.prescription;
                let meds = [];
                try {
                  meds = presc.medications_json ? JSON.parse(presc.medications_json) : [];
                } catch (e) {
                  meds = [];
                }

                return (
                  <div
                    key={appt.id}
                    className="p-8 rounded-3xl bg-royal-purple/25 border border-divine-gold/25 space-y-6 shadow-xl"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divine-gold/15">
                      <div>
                        <span className="text-xs font-bold text-divine-gold uppercase tracking-wider">
                          {appt.doctor.specialisation} Consultation
                        </span>
                        <h3 className="text-xl font-bold text-warm-white">
                          {appt.doctor.user.name}
                        </h3>
                        <p className="text-xs text-warm-white/60">
                          Visit Date: {new Date(appt.slot_start).toLocaleDateString([], { dateStyle: "long" })}
                        </p>
                      </div>

                      {presc.diagnosis && (
                        <div className="bg-divine-gold/15 border border-divine-gold/30 px-4 py-2 rounded-xl text-left sm:text-right">
                          <span className="text-[10px] text-warm-white/50 uppercase tracking-wider block font-semibold">
                            Official Diagnosis
                          </span>
                          <span className="text-sm font-bold text-divine-gold">
                            {presc.diagnosis}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* AI Generated Patient Friendly Summary Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-divine-gold/10 via-[#180a3a] to-royal-purple/30 border border-divine-gold/30 space-y-3">
                      <div className="flex items-center gap-2 text-divine-gold font-bold text-sm">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        AI Patient-Friendly Summary (Groq LLaMA 3.3)
                      </div>
                      <p className="text-sm text-warm-white/90 leading-relaxed">
                        {presc.patient_summary}
                      </p>
                    </div>

                    {/* Prescribed Medications Table */}
                    {meds.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-warm-white/70 flex items-center gap-2">
                          <Pill className="w-3.5 h-3.5 text-divine-gold" /> Prescribed Medications Schedule
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="border-b border-divine-gold/20 text-divine-gold">
                                <th className="py-2.5 px-4 font-semibold">Medicine Name</th>
                                <th className="py-2.5 px-4 font-semibold">Dosage</th>
                                <th className="py-2.5 px-4 font-semibold">Frequency</th>
                                <th className="py-2.5 px-4 font-semibold">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-divine-gold/10 text-warm-white/80">
                              {meds.map((m, idx) => (
                                <tr key={idx} className="hover:bg-divine-gold/5">
                                  <td className="py-3 px-4 font-bold text-warm-white">{m.name}</td>
                                  <td className="py-3 px-4">{m.dosage}</td>
                                  <td className="py-3 px-4">{m.frequency}</td>
                                  <td className="py-3 px-4">{m.days} days</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Additional Doctor Advice */}
                    {presc.additional_advice && (
                      <div className="p-4 rounded-xl bg-deep-black/30 border border-divine-gold/15 text-xs space-y-1">
                        <span className="font-bold text-divine-gold uppercase tracking-wider block">
                          Doctor's Lifestyle & Clinical Advice:
                        </span>
                        <p className="text-warm-white/70">{presc.additional_advice}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
