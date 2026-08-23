import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Video, 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  ArrowLeft,
  CalendarOff,
  User,
  Pill,
  Send
} from "lucide-react";

export default function DoctorPortal({ token, user, activeTab, setActiveTab }) {
  const API_URL = "http://localhost:8000/api/v1";

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Queue Filter state
  const [queueFilter, setQueueFilter] = useState("all");

  // Active Consultation State
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [additionalAdvice, setAdditionalAdvice] = useState("");
  const [medications, setMedications] = useState([
    { name: "Metoprolol Succinate", dosage: "25mg", frequency: "Once daily", days: "30" }
  ]);
  const [submittedPrescription, setSubmittedPrescription] = useState(null);

  // Leave Management State
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    fetchAppointments();
    fetchAnalytics();
  }, [token]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/doctor/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Doctor appointments error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/doctor/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Doctor analytics error:", err);
    }
  };

  const handleStartConsultation = (appt) => {
    setActiveConsultation(appt);
    setSubmittedPrescription(null);
    setClinicalNotes("");
    setDiagnosis("");
    setAdditionalAdvice("");
    setMedications([
      { name: "Metoprolol Succinate", dosage: "25mg", frequency: "Once daily", days: "30" }
    ]);
    setActiveTab("queue");
  };

  const handleAddMedicineRow = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "Once daily", days: "7" }
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    setMedications(medications.filter((_, idx) => idx !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    if (!clinicalNotes.trim()) {
      setError("Please enter clinical notes before submitting.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/doctor/appointments/${activeConsultation.id}/prescription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clinical_notes: clinicalNotes,
          diagnosis: diagnosis || "Clinical Consultation Completed",
          medications: medications.filter((m) => m.name.trim() !== ""),
          additional_advice: additionalAdvice
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit prescription.");

      setSubmittedPrescription(data);
      setSuccess("Consultation completed and AI Patient Summary generated!");
      fetchAppointments();
      fetchAnalytics();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/doctors/${user.id || 1}/leaves`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leave_date: leaveDate,
          reason: leaveReason || "Clinical Leave"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to register leave.");

      setSuccess("Leave registered successfully! Any conflicting appointments were automatically cancelled and patients notified.");
      setLeaveDate("");
      setLeaveReason("");
      fetchAppointments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter queue
  const filteredQueue = appointments.filter((appt) => {
    if (queueFilter === "scheduled") return appt.status === "scheduled";
    if (queueFilter === "urgent") return appt.symptom_form && appt.symptom_form.urgency_level === "High";
    if (queueFilter === "completed") return appt.status === "completed";
    return true;
  });

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
                Doctor Clinical Console
              </span>
              <h1 className="text-3xl font-black text-warm-white mt-3">
                Welcome back, {user?.name || "Dr. Victoria Sterling"}
              </h1>
              <p className="text-sm text-warm-white/70 mt-1 max-w-xl">
                Review your patient queue, pre-visit Groq LLaMA 3.3 diagnostic triage prompts, 
                and compose digital prescriptions with automated medication reminder sync.
              </p>
            </div>

            <button
              onClick={() => setActiveTab("queue")}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-sm shadow-lg shadow-divine-gold/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Activity className="w-4 h-4" /> Open Consultation Queue
            </button>
          </div>

          {/* Stats Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Upcoming Visits
                </p>
                <h3 className="text-3xl font-bold text-warm-white">
                  {analytics?.upcoming_count ?? appointments.filter((a) => a.status === "scheduled").length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-divine-gold/15 border border-divine-gold/30 flex items-center justify-center text-divine-gold">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  AI Urgent Triage Cases
                </p>
                <h3 className="text-3xl font-bold text-amber-400">
                  {analytics?.urgent_triage_count ?? 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-white/50 font-semibold mb-1">
                  Completed Consultations
                </p>
                <h3 className="text-3xl font-bold text-emerald-400">
                  {analytics?.completed_count ?? appointments.filter((a) => a.status === "completed").length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DOCTOR QUEUE & CONSULTATION WORKSPACE */}
      {/* ======================================================== */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {activeConsultation ? (
            /* Active Consultation Deep Dive Workspace */
            <div className="space-y-6">
              {/* Back button & Patient Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divine-gold/15">
                <button
                  onClick={() => setActiveConsultation(null)}
                  className="text-xs text-divine-gold hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Consultation Queue
                </button>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      activeConsultation.symptom_form?.urgency_level === "High"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : activeConsultation.symptom_form?.urgency_level === "Medium"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {activeConsultation.symptom_form?.urgency_level || "Standard"} Clinical Urgency
                  </span>
                </div>
              </div>

              {/* Patient Information Banner */}
              <div className="p-6 rounded-2xl bg-royal-purple/30 border border-divine-gold/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] text-warm-white/50 uppercase tracking-wider font-semibold">
                    Patient Name
                  </span>
                  <h3 className="text-2xl font-bold text-warm-white">
                    {activeConsultation.patient.name}
                  </h3>
                  <p className="text-xs text-warm-white/60">
                    {activeConsultation.patient.email} • {activeConsultation.patient.phone || "+1 (555) 789-0123"}
                  </p>
                </div>

                <div className="space-y-1 text-left md:text-center">
                  <span className="text-[10px] text-warm-white/50 uppercase tracking-wider font-semibold">
                    Appointment Slot
                  </span>
                  <p className="text-sm font-bold text-divine-gold">
                    {new Date(activeConsultation.slot_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="text-xs text-warm-white/50">
                    Duration: 30 mins • Status: <strong>{activeConsultation.status.toUpperCase()}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={activeConsultation.meet_link || "https://meet.google.com"}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-divine-gold text-royal-purple font-bold text-xs flex items-center gap-2 hover:bg-gold-light transition-all shadow-md"
                  >
                    <Video className="w-4 h-4" /> Join Live Video Call
                  </a>
                </div>
              </div>

              {/* Patient Reported Symptoms Card */}
              {activeConsultation.symptom_form && (
                <div className="p-6 rounded-2xl bg-royal-purple/20 border border-divine-gold/15 space-y-4">
                  <div className="flex items-center gap-2 text-divine-gold font-bold text-sm">
                    <Activity className="w-4 h-4" /> Patient's Reported Symptoms & Medical Intake
                  </div>
                  <div className="p-4 rounded-xl bg-deep-black/50 border border-divine-gold/10 text-sm text-warm-white/90 leading-relaxed italic">
                    "{activeConsultation.symptom_form.symptoms_text}"
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-xs text-warm-white/70 pt-2 border-t border-divine-gold/10">
                    <span>
                      Severity: <strong>{activeConsultation.symptom_form.severity_scale || 6}/10</strong>
                    </span>
                    <span>
                      Duration: <strong>{activeConsultation.symptom_form.duration_days || 3} days</strong>
                    </span>
                    <span>
                      Medications/Allergies: <strong>{activeConsultation.symptom_form.medications_allergies || "None declared"}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* AI Pre-Visit Triage & Diagnostic Prompts */}
              {activeConsultation.symptom_form && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-divine-gold/10 via-[#180a3a] to-royal-purple/30 border border-divine-gold/25 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-divine-gold font-bold text-sm">
                      <Sparkles className="w-4 h-4" /> AI Pre-Visit Triage & Diagnostic Prompts
                    </div>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-divine-gold/15 text-divine-gold font-semibold">
                      Groq LLaMA 3.3 70B
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-warm-white/50 block font-semibold">Assessed Chief Complaint:</span>
                      <span className="font-bold text-warm-white text-sm">
                        {activeConsultation.symptom_form.chief_complaint}
                      </span>
                    </div>

                    <div className="text-xs pt-2">
                      <span className="text-warm-white/50 block font-semibold mb-1">
                        Suggested Clinical Questions for Examination:
                      </span>
                      <div className="p-3 rounded-xl bg-deep-black/40 border border-divine-gold/15 text-warm-white/80 whitespace-pre-line leading-relaxed">
                        {activeConsultation.symptom_form.suggested_questions}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Notes & Prescription Composer */}
              <form onSubmit={handleSubmitPrescription} className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                  <FileText className="w-5 h-5 text-divine-gold" />
                  <h3 className="text-base font-bold text-warm-white">
                    Doctor Clinical Consultation Notes
                  </h3>
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Examination Findings & Observations *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Patient presents with chest tightness and mild shortness of breath upon exertion. Vitals: BP 130/85 mmHg, HR 88 bpm. Heart sounds normal, no murmurs. Advised ECG and lipid profile..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full p-4 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Official Diagnosis
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Suspected Early Angina / Exertional Dyspnea"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                {/* Dynamic Prescription Composer */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-warm-white/70 font-semibold flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-divine-gold" /> Digital Prescription Composer
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="px-3 py-1.5 rounded-lg bg-divine-gold/15 hover:bg-divine-gold/25 border border-divine-gold/30 text-divine-gold text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Medicine
                    </button>
                  </div>

                  <div className="space-y-3">
                    {medications.map((med, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl bg-deep-black/40 border border-divine-gold/15 items-center"
                      >
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-warm-white/40 block mb-1">Medication Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Metoprolol Succinate"
                            value={med.name}
                            onChange={(e) => handleMedicineChange(index, "name", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-royal-purple/30 border border-divine-gold/20 text-cream text-xs focus:outline-none focus:border-divine-gold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-warm-white/40 block mb-1">Dosage</label>
                          <input
                            type="text"
                            placeholder="25mg"
                            value={med.dosage}
                            onChange={(e) => handleMedicineChange(index, "dosage", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-royal-purple/30 border border-divine-gold/20 text-cream text-xs focus:outline-none focus:border-divine-gold"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-warm-white/40 block mb-1">Frequency</label>
                          <select
                            value={med.frequency}
                            onChange={(e) => handleMedicineChange(index, "frequency", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-royal-purple/30 border border-divine-gold/20 text-cream text-xs focus:outline-none focus:border-divine-gold"
                          >
                            <option value="Once daily">Once daily</option>
                            <option value="Twice daily">Twice daily</option>
                            <option value="Thrice daily">Thrice daily</option>
                            <option value="As needed">As needed</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-warm-white/40 block mb-1">Days</label>
                          <input
                            type="number"
                            placeholder="30"
                            value={med.days}
                            onChange={(e) => handleMedicineChange(index, "days", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-royal-purple/30 border border-divine-gold/20 text-cream text-xs focus:outline-none focus:border-divine-gold"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(index)}
                            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Patient Advice */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Additional Patient Advice
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Please monitor your symptoms closely. If you experience worsening chest pain, radiation of pain to your left arm/jaw, or severe shortness of breath, please proceed to the nearest emergency center."
                    value={additionalAdvice}
                    onChange={(e) => setAdditionalAdvice(e.target.value)}
                    className="w-full p-4 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-4 border-t border-divine-gold/15">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer hover:from-gold-shimmer hover:to-gold-light text-royal-purple font-bold text-sm shadow-lg shadow-divine-gold/20 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {loading ? "Generating AI Summary..." : "✓ Submit Notes & Generate Patient AI Summary"}
                  </button>
                </div>
              </form>

              {/* Completed Summary Preview */}
              {submittedPrescription && (
                <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5" /> Consultation Completed & AI Summary Generated!
                  </div>
                  <div className="p-4 rounded-xl bg-deep-black/60 border border-emerald-500/20 text-xs text-warm-white/90 leading-relaxed">
                    <span className="font-bold text-emerald-300 block mb-1">Generated Patient-Friendly Summary:</span>
                    {submittedPrescription.patient_summary}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Queue List */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-warm-white">Patient Consultation Queue</h2>
                  <p className="text-xs text-warm-white/60 mt-0.5">
                    Live triage queue with pre-visit AI insights and instant video call links.
                  </p>
                </div>

                <button
                  onClick={fetchAppointments}
                  className="px-4 py-2 rounded-xl bg-royal-purple/40 border border-divine-gold/20 text-divine-gold text-xs font-semibold flex items-center gap-2 hover:bg-royal-purple transition-all cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
                </button>
              </div>

              {/* Queue Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { key: "all", label: "All Patients" },
                  { key: "scheduled", label: "Waiting / Scheduled" },
                  { key: "urgent", label: "High Urgency Triage" },
                  { key: "completed", label: "Completed" }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setQueueFilter(item.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      queueFilter === item.key
                        ? "bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold shadow-md shadow-divine-gold/20"
                        : "bg-royal-purple/30 border border-divine-gold/15 text-warm-white/70 hover:border-divine-gold/40 hover:text-cream"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Queue Cards */}
              {filteredQueue.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-royal-purple/20 border border-divine-gold/15 text-warm-white/50 text-sm">
                  No patients found in the consultation queue for this filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQueue.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 hover:border-divine-gold/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      <div className="space-y-3 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-divine-gold/20 to-royal-purple border border-divine-gold/30 flex items-center justify-center text-divine-gold font-bold text-sm">
                            {appt.patient.name[0]}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-warm-white">{appt.patient.name}</h4>
                            <p className="text-xs text-warm-white/60 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-divine-gold/70" />
                              {new Date(appt.slot_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                              <span>• Status: <strong>{appt.status}</strong></span>
                            </p>
                          </div>

                          {appt.symptom_form && (
                            <span
                              className={`ml-auto sm:ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                appt.symptom_form.urgency_level === "High"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                  : appt.symptom_form.urgency_level === "Medium"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              }`}
                            >
                              {appt.symptom_form.urgency_level} Urgency
                            </span>
                          )}
                        </div>

                        {appt.symptom_form && (
                          <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-deep-black/40 border border-divine-gold/10 text-xs">
                              <span className="font-bold text-divine-gold/80 block mb-1">
                                Patient Reported Symptoms:
                              </span>
                              <p className="text-warm-white/70 italic">
                                "{appt.symptom_form.symptoms_text}"
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-warm-white/60">
                              <span>Severity: <strong>{appt.symptom_form.severity_scale || 6}/10</strong></span>
                              <span>Duration: <strong>{appt.symptom_form.duration_days || 3} days</strong></span>
                              <span>Phone: <strong>{appt.patient.phone || "+1 (555) 789-0123"}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 shrink-0">
                        {appt.status === "scheduled" && (
                          <>
                            <button
                              onClick={() => handleStartConsultation(appt)}
                              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer hover:from-gold-shimmer hover:to-gold-light text-royal-purple font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                            >
                              <Activity className="w-3.5 h-3.5" /> Start Consultation <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={appt.meet_link || "https://meet.google.com"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                            >
                              <Video className="w-3.5 h-3.5" /> Join Google Meet Call
                            </a>
                          </>
                        )}

                        {appt.status === "completed" && (
                          <button
                            onClick={() => handleStartConsultation(appt)}
                            className="px-4 py-2 rounded-xl bg-royal-purple/40 border border-divine-gold/30 text-divine-gold font-semibold text-xs hover:bg-royal-purple transition-all cursor-pointer"
                          >
                            Review Clinical Notes
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SCHEDULE & LEAVE */}
      {/* ======================================================== */}
      {activeTab === "schedule" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-warm-white">Schedule & Leave Management</h2>
            <p className="text-xs text-warm-white/60 mt-0.5">
              Configure working hours or log leave days with automated conflict cancellations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weekly Schedule Overview */}
            <div className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                <Clock className="w-5 h-5 text-divine-gold" />
                <h3 className="text-base font-bold text-warm-white">Weekly Working Hours</h3>
              </div>

              <div className="space-y-3 text-xs">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, idx) => (
                  <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-deep-black/30 border border-divine-gold/10">
                    <span className="font-semibold text-warm-white">{day}</span>
                    <span className="text-divine-gold font-mono font-semibold">09:00 AM - 05:00 PM</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold uppercase text-[10px]">
                      Active
                    </span>
                  </div>
                ))}
                {["Saturday", "Sunday"].map((day) => (
                  <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-deep-black/20 border border-white/5 opacity-50">
                    <span className="font-semibold text-warm-white">{day}</span>
                    <span className="text-warm-white/40 font-mono">Off Duty</span>
                    <span className="px-2 py-0.5 rounded bg-gray-500/15 text-warm-white/40 font-bold uppercase text-[10px]">
                      Closed
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Register Form */}
            <div className="p-6 rounded-2xl bg-royal-purple/25 border border-divine-gold/20 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-divine-gold/15">
                <CalendarOff className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-warm-white">Register Clinical Leave</h3>
              </div>

              <form onSubmit={handleRegisterLeave} className="space-y-4 text-xs">
                <div>
                  <label className="block uppercase tracking-wider text-warm-white/70 font-semibold mb-2">
                    Select Leave Date *
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
                    Reason for Leave (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Medical Conference, Personal Leave"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-cream text-sm focus:outline-none focus:border-divine-gold transition-all"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Notice:</strong> Registering a leave automatically checks for any booked patient appointments on that date, cancels them safely, and dispatches email notifications.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-sm shadow-md hover:scale-101 transition-all cursor-pointer"
                >
                  {loading ? "Registering Leave..." : "Register Leave Day"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
