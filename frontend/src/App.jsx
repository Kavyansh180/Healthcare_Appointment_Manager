import React, { useState, useEffect } from "react";
import AuthPortal from "./components/AuthPortal";
import Navbar from "./components/Navbar";
import AdminPortal from "./components/AdminPortal";
import PatientPortal from "./components/PatientPortal";
import DoctorPortal from "./components/DoctorPortal";
import NotificationCenterModal from "./components/NotificationCenterModal";
import { API_URL } from "./config";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Check LocalStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("atheria_user") || localStorage.getItem("aetheria_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("atheria_user");
        localStorage.removeItem("aetheria_user");
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab("overview");
    localStorage.setItem("atheria_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab("overview");
    localStorage.removeItem("atheria_user");
    localStorage.removeItem("aetheria_user");
    window.history.replaceState({}, document.title, "/");
  };

  // Instant 1-Click Quick Demo Switcher Handler
  const handleQuickSwitch = async (targetRole) => {
    try {
      const res = await fetch(`${API_URL}/auth/guest?role=${targetRole}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        handleLoginSuccess(data);
      }
    } catch (err) {
      console.error("Quick switch error:", err);
    }
  };

  if (!user) {
    return <AuthPortal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#060211] text-cream flex flex-col font-sans selection:bg-divine-gold selection:text-royal-purple">
      {/* Universal Navbar with Quick Switcher & Multi-tab Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onQuickSwitch={handleQuickSwitch}
        onOpenNotifications={() => setIsNotificationOpen(true)}
      />

      {/* Main Portal Body */}
      <main className="flex-1">
        {user.role === "admin" && (
          <AdminPortal
            token={user.access_token}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        )}
        {user.role === "doctor" && (
          <DoctorPortal
            token={user.access_token}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        )}
        {user.role === "patient" && (
          <PatientPortal
            token={user.access_token}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        )}
      </main>

      {/* Live Email Notification Outbox Modal */}
      <NotificationCenterModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        token={user.access_token}
        user={user}
      />

      {/* Global Footer */}
      <footer className="py-6 border-t border-divine-gold/10 bg-[#090315] text-center text-xs text-warm-white/40">
        <p>
          Atheria Healthcare Suite • Concurrency Engine with Pessimistic Row Locking & Groq LLaMA 3.3 70B AI
        </p>
      </footer>
    </div>
  );
}

export default App;
