import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  Eye, 
  Sparkles, 
  Server, 
  ShieldCheck, 
  RotateCcw,
  Inbox,
  Filter,
  Check
} from "lucide-react";
import { API_URL } from "../config";

export default function NotificationCenterModal({ isOpen, onClose, token, user }) {
  const [activeTab, setActiveTab] = useState("outbox"); // "outbox", "test", "templates"
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total_count: 0, sent_count: 0, pending_count: 0, failed_count: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  // Test Email Form
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [testSubject, setTestSubject] = useState("Atheria Live System Test");
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState("");
  const [testError, setTestError] = useState("");

  // Preview Email Modal
  const [previewNoti, setPreviewNoti] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchStats();
      if (user?.email && !testEmail) {
        setTestEmail(user.email);
      }
    }
  }, [isOpen, statusFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all" 
        ? `${API_URL}/notifications` 
        : `${API_URL}/notifications?status_filter=${statusFilter}`;
        
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching notification stats:", err);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) return;
    setTestLoading(true);
    setTestSuccess("");
    setTestError("");

    try {
      const res = await fetch(`${API_URL}/notifications/test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient_email: testEmail,
          subject: testSubject || "Atheria Live System Test"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestSuccess(`Email successfully queued & dispatched to ${testEmail}! Check your inbox or the Live Outbox tab.`);
        fetchNotifications();
        fetchStats();
      } else {
        setTestError(data.detail || "Failed to dispatch test email.");
      }
    } catch (err) {
      setTestError(err.message || "Network error while sending test email.");
    } finally {
      setTestLoading(false);
    }
  };

  const handleRetryNotification = async (notiId) => {
    setRetryingId(notiId);
    try {
      const res = await fetch(`${API_URL}/notifications/${notiId}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchNotifications();
        await fetchStats();
      }
    } catch (err) {
      console.error("Error retrying notification:", err);
    } finally {
      setRetryingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f0624] border border-divine-gold/30 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-divine-gold/15 bg-gradient-to-r from-royal-purple/80 via-[#180a3a] to-royal-purple/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-divine-gold/15 border border-divine-gold/40 text-divine-gold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-warm-white">
                  Atheria Live Notification & Email Outbox
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  APScheduler 30s Active
                </span>
              </div>
              <p className="text-xs text-warm-white/60">
                Multi-mode email delivery engine • SMTP TLS/SSL • HTML Luxury Templates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-warm-white/60 hover:text-divine-gold hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Metrics Ribbon */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-deep-black/60 border-b border-divine-gold/10 text-center">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-divine-gold/10">
            <div className="text-[11px] text-warm-white/60 uppercase font-medium">Total Outbox</div>
            <div className="text-lg font-bold text-warm-white mt-0.5">{stats.total_count}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[11px] text-emerald-400/80 uppercase font-medium">Delivered / Sent</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.sent_count}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="text-[11px] text-amber-400/80 uppercase font-medium">Queue Pending</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">{stats.pending_count}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <div className="text-[11px] text-rose-400/80 uppercase font-medium">Retry Failures</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">{stats.failed_count}</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-divine-gold/10 bg-royal-purple/20">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("outbox")}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "outbox"
                  ? "bg-[#0f0624] text-divine-gold border-t border-x border-divine-gold/30"
                  : "text-warm-white/60 hover:text-cream hover:bg-white/5"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Live Outbox Queue ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("test")}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "test"
                  ? "bg-[#0f0624] text-divine-gold border-t border-x border-divine-gold/30"
                  : "text-warm-white/60 hover:text-cream hover:bg-white/5"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Send Live Test Email
            </button>
          </div>

          {activeTab === "outbox" && (
            <div className="flex items-center gap-2 pb-2">
              <div className="flex items-center gap-1 bg-deep-black/60 p-1 rounded-lg border border-divine-gold/15 text-[11px]">
                {["all", "sent", "pending", "failed"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-0.5 rounded capitalize cursor-pointer transition-all ${
                      statusFilter === f
                        ? "bg-divine-gold/20 text-divine-gold font-bold"
                        : "text-warm-white/50 hover:text-warm-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { fetchNotifications(); fetchStats(); }}
                className="p-1.5 rounded-lg bg-deep-black/40 border border-divine-gold/20 text-warm-white/70 hover:text-divine-gold hover:border-divine-gold/40 cursor-pointer"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: OUTBOX LIST */}
          {activeTab === "outbox" && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-divine-gold/15 rounded-xl bg-white/[0.01]">
                  <Mail className="w-10 h-10 text-warm-white/20 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-warm-white">No notifications recorded</p>
                  <p className="text-xs text-warm-white/50 max-w-sm mx-auto mt-1">
                    Book an appointment, mark a doctor on leave, or send a test email to see real-time delivery logs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((noti) => (
                    <div
                      key={noti.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-divine-gold/15 hover:border-divine-gold/35 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              noti.status === "sent"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : noti.status === "pending"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {noti.status}
                          </span>
                          <span className="text-xs font-bold text-warm-white truncate">
                            {noti.title}
                          </span>
                        </div>
                        <div className="text-xs text-warm-white/60 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-divine-gold font-medium">To: {noti.recipient_email}</span>
                          <span>•</span>
                          <span>{new Date(noti.created_at).toLocaleString()}</span>
                          {noti.retry_count > 0 && (
                            <span className="text-rose-400/80">({noti.retry_count} retries)</span>
                          )}
                        </div>
                        {noti.status === "failed" && noti.error_message && (
                          <div className="text-[11px] text-rose-300 mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Error details:</strong> {noti.error_message}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => setPreviewNoti(noti)}
                          className="px-3 py-1.5 rounded-lg bg-divine-gold/10 border border-divine-gold/30 text-divine-gold text-xs font-semibold hover:bg-divine-gold/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Template
                        </button>

                        {noti.status === "failed" && (
                          <button
                            onClick={() => handleRetryNotification(noti.id)}
                            disabled={retryingId === noti.id}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${retryingId === noti.id ? "animate-spin" : ""}`} />
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEND LIVE TEST EMAIL */}
          {activeTab === "test" && (
            <div className="max-w-xl mx-auto py-4">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-divine-gold/20 shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-divine-gold/15">
                  <div className="p-2 rounded-xl bg-divine-gold/15 text-divine-gold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-warm-white">Live Email Dispatch Test</h4>
                    <p className="text-xs text-warm-white/60">
                      Send a real-time verification email to any inbox to verify SMTP connectivity.
                    </p>
                  </div>
                </div>

                {testSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{testSuccess}</span>
                  </div>
                )}

                {testError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{testError}</span>
                  </div>
                )}

                <form onSubmit={handleSendTestEmail} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-warm-white/80 mb-1.5">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-warm-white text-xs focus:outline-none focus:border-divine-gold focus:ring-1 focus:ring-divine-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-warm-white/80 mb-1.5">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      placeholder="Atheria System Verification"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-deep-black/60 border border-divine-gold/25 text-warm-white text-xs focus:outline-none focus:border-divine-gold focus:ring-1 focus:ring-divine-gold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-divine-gold to-gold-shimmer text-royal-purple font-bold text-xs shadow-lg hover:shadow-divine-gold/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {testLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Dispatches in progress...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Dispatch Live Test Email
                      </>
                    )}
                  </button>
                </form>

                <div className="text-[11px] text-warm-white/40 p-3 rounded-lg bg-deep-black/40 border border-divine-gold/10">
                  <strong className="text-divine-gold/80">Developer Note:</strong> If SMTP credentials in backend <code className="text-warm-white font-mono">.env</code> are left blank, the email is logged into the database and outbox mock gracefully for testing without errors.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-divine-gold/15 bg-deep-black/60 flex items-center justify-between text-xs text-warm-white/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-divine-gold" />
            <span>Atheria Outbox Engine • Eventual Consistency Guaranteed</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-warm-white font-semibold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* RENDERED EMAIL PREVIEW SUB-MODAL */}
      {previewNoti && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0f0624] border border-divine-gold/40 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-divine-gold/20 bg-royal-purple/60 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-warm-white">{previewNoti.title}</h4>
                <p className="text-[11px] text-divine-gold">To: {previewNoti.recipient_email}</p>
              </div>
              <button
                onClick={() => setPreviewNoti(null)}
                className="p-1 rounded-lg text-warm-white/60 hover:text-warm-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-[#060211]">
              {previewNoti.html_content ? (
                <div 
                  className="rounded-xl overflow-hidden shadow-inner border border-divine-gold/20 bg-[#0f0624] p-4 text-warm-white"
                  dangerouslySetInnerHTML={{ __html: previewNoti.html_content }}
                />
              ) : (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-divine-gold/20 whitespace-pre-wrap font-sans text-sm text-warm-white leading-relaxed">
                  {previewNoti.message}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-divine-gold/15 bg-deep-black/60 text-right">
              <button
                onClick={() => setPreviewNoti(null)}
                className="px-4 py-1.5 rounded-lg bg-divine-gold/20 text-divine-gold font-semibold text-xs border border-divine-gold/30 hover:bg-divine-gold/30 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
