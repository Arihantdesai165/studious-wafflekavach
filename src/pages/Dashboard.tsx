import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { speak } from "@/lib/voice";
import { supabase } from "@/lib/supabase";
import { hashPin } from "@/lib/crypto";
import { PinInput } from "@/components/PinInput";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import {
  Send, QrCode, History, AlertCircle, Shield, Home, Mic,
  User, LogOut, Eye, EyeOff, ChevronRight, ShieldAlert,
  Wallet, Lock, CircleDollarSign, Search, HeadphonesIcon, MapPin
} from "lucide-react";
import { getLocation } from "@/lib/location";

export default function Dashboard() {
  const { user, setUser, logout } = useAuth();
  const { t, speechCode } = useLanguage();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(false);
  const [sosBlocked, setSosBlocked] = useState(false);
  const [sosError, setSosError] = useState("");
  const [location, setLocation] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    // Fetch real-time location
    const fetchLocation = async () => {
      const loc = await getLocation();
      if (loc !== "unknown") {
        setLocation(loc);
      }
    };
    fetchLocation();
  }, [user, navigate]);
  if (!user) return null;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  const handleAction = (route: string, voiceMsg: string) => {
    if (sosBlocked) return;
    speak(voiceMsg, speechCode);
    navigate(route);
  };

  const handleSos = async () => {
    // Lock the account in DB
    await supabase.from("users").update({ is_locked: true }).eq("id", user.id);
    setUser({ ...user, is_locked: true });
    speak(t("voiceAccountLocked"), speechCode);
    setSosBlocked(true);
  };

  const handleSosUnlock = async (pin: string) => {
    setSosError("");
    const pinHash = await hashPin(pin);
    const { data } = await supabase.from("users").select("pin_hash").eq("id", user.id).single();
    if (data && data.pin_hash === pinHash) {
      await supabase.from("users").update({ is_locked: false, failed_pin_attempts: 0 }).eq("id", user.id);
      setUser({ ...user, is_locked: false });
      speak(t("voiceAccountUnlocked"), speechCode);
      setSosBlocked(false);
    } else {
      setSosError(t("wrongPin") || "Wrong PIN");
    }
  };

  const handleLogout = () => {
    speak(t("logoutLabel"), speechCode);
    logout();
    navigate("/");
  };

  const maskedBalance = showBalance ? `₹${user.balance.toLocaleString("en-IN")}` : "₹ ••••••";
  const maskedPhone = user.phone.slice(0, 5) + " " + user.phone.slice(5);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fa] pb-28 relative">
      {/* === SOS BLOCKED OVERLAY === */}
      <AnimatePresence>
        {sosBlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Lock size={40} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0a1b28] mb-2 text-center">🆘 {t("emergencyLock")}</h2>
              <p className="text-muted-foreground text-center mb-8">{t("sosBlockedMsg")}</p>
              {sosError && (
                <div className="bg-red-100 text-red-700 font-bold rounded-xl px-4 py-3 mb-4 w-full text-center">
                  ⚠️ {sosError}
                </div>
              )}
              <PinInput onComplete={handleSosUnlock} label={t("enterPinToUnlock")} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === HERO HEADER with gradient === */}
      <div className="bg-gradient-to-br from-[#0a2342] via-[#113557] to-[#1c4879] text-white px-5 pt-6 pb-10 rounded-b-[2.5rem] shadow-lg">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User size={22} className="text-white" />
            </div>
          </button>
          <span className="text-lg font-black tracking-wider uppercase">{t("appName")}</span>
          <button
            onClick={handleSos}
            className="bg-red-600 text-white px-5 py-2 rounded-full font-extrabold text-sm shadow-lg shadow-red-600/40 active:scale-90 transition-transform animate-pulse"
          >
            SOS
          </button>
        </div>

        {/* Greeting */}
        <p className="text-white/70 text-sm font-medium">{greeting}</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">{user.name}</h1>
        <div className="bg-white/15 rounded-full inline-flex px-4 py-1.5 mt-2 text-sm font-bold tracking-wide backdrop-blur-sm mr-2">
          UPI: {user.phone}@rkv
        </div>
        {location && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-emerald-500/30 text-emerald-100 rounded-full inline-flex px-4 py-1.5 mt-2 text-sm font-bold tracking-wide backdrop-blur-sm items-center gap-1.5 shadow-lg border border-emerald-500/20"
          >
            <MapPin size={14} className="text-emerald-300" />
            {location}
          </motion.div>
        )}
      </div>

      {/* === DEPOSITS CARD === */}
      <div className="px-5 -mt-6 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5">
          {/* Tab */}
          <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-3">
            <span className="text-sm font-extrabold text-[#0a1b28] border-b-2 border-[#096a5b] pb-2">{t("deposits")}</span>
          </div>

          {/* Total balance */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("totalDepositBalance")}</p>
              <p className="text-2xl font-extrabold text-[#0a1b28] mt-1">{maskedBalance}</p>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="flex items-center gap-2 bg-[#f4f7f9] px-4 py-2 rounded-full text-xs font-bold text-[#0a1b28] active:scale-95 transition-transform"
            >
              {showBalance ? t("hideBalances") : t("showBalances")}
              {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Savings Account Card */}
          <div className="bg-[#f4f7f9] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#096a5b] rounded-full flex items-center justify-center shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-[#0a1b28]">{t("savingsAccount")}</p>
              <p className="text-xs text-muted-foreground font-medium">{user.name}&apos;s A/C</p>
              <p className="text-xs text-muted-foreground font-medium">XXXXX {maskedPhone.slice(-5)}</p>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* === QUICK TASKS === */}
      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-extrabold text-[#0a1b28]">{t("quickTasks")}</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Send Money */}
          <button
            onClick={() => handleAction("/send", t("sendMoney"))}
            className="flex flex-col items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-[#e8f5f1] rounded-xl flex items-center justify-center mb-2">
              <Send size={22} className="text-[#096a5b]" />
            </div>
            <span className="text-[11px] font-bold text-[#0a1b28] text-center leading-tight">{t("sendMoneyLabel")}</span>
          </button>

          {/* Receive */}
          <button
            onClick={() => handleAction("/receive", t("receiveMoney"))}
            className="flex flex-col items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-[#eef0ff] rounded-xl flex items-center justify-center mb-2">
              <QrCode size={22} className="text-[#1c4eff]" />
            </div>
            <span className="text-[11px] font-bold text-[#0a1b28] text-center leading-tight">{t("receiveLabel")}</span>
          </button>

          {/* Scan QR */}
          <button
            onClick={() => handleAction("/send?scan=true", t("scanQr"))}
            className="flex flex-col items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-[#fff5e6] rounded-xl flex items-center justify-center mb-2">
              <Search size={22} className="text-[#d48806]" />
            </div>
            <span className="text-[11px] font-bold text-[#0a1b28] text-center leading-tight">{t("scanQr")}</span>
          </button>

          {/* Check Balance */}
          <button
            onClick={() => { setShowBalance(true); speak(t("checkBalance"), speechCode); }}
            className="flex flex-col items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-[#f5eeff] rounded-xl flex items-center justify-center mb-2">
              <CircleDollarSign size={22} className="text-[#7c3aed]" />
            </div>
            <span className="text-[11px] font-bold text-[#0a1b28] text-center leading-tight">{t("checkBalance")}</span>
          </button>

          {/* History */}
          <button
            onClick={() => handleAction("/history", t("history"))}
            className="flex flex-col items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-[#e6f7ff] rounded-xl flex items-center justify-center mb-2">
              <History size={22} className="text-[#0ea5e9]" />
            </div>
            <span className="text-[11px] font-bold text-[#0a1b28] text-center leading-tight">{t("historyLabel")}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-2">
              <LogOut size={22} className="text-red-500" />
            </div>
            <span className="text-[11px] font-bold text-[#0a1b28] text-center leading-tight">{t("logoutLabel")}</span>
          </button>
        </div>
      </div>

      {/* === GUARDIAN & FRAUD HELP === */}
      <div className="px-5 mt-6 grid grid-cols-2 gap-4">
        {/* Guardian Help */}
        <button
          onClick={() => handleAction("/guardian-help", t("guardianHelp"))}
          className="flex flex-col items-center bg-white rounded-3xl p-6 shadow-sm border border-gray-100 active:scale-[0.97] transition-transform"
        >
          <div className="w-16 h-16 bg-[#f0f4f8] rounded-full flex items-center justify-center mb-3">
            <HeadphonesIcon size={30} className="text-[#113833]" />
          </div>
          <span className="text-sm font-bold text-[#113833] text-center">{t("guardianHelp")}</span>
        </button>

        {/* Kavach (UPI Scan Detector) */}
        <button
          onClick={() => window.open("https://upi-fake-detection.pages.dev/", "_blank")}
          className="flex flex-col items-center bg-white rounded-3xl p-6 shadow-sm border border-red-100 active:scale-[0.97] transition-all hover:shadow-md group relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-red-50/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 w-16 h-16 bg-[#fff0f0] rounded-full flex items-center justify-center mb-3 border border-red-200 group-hover:scale-110 transition-transform">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertCircle size={32} className="text-red-600" />
            </motion.div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[13px] font-extrabold text-red-600 text-center leading-tight">
                {t("fraudHelp")}
              </span>
            </div>
            <motion.span 
              initial={{ opacity: 0.7 }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[10px] font-bold text-red-400 uppercase tracking-tighter"
            >
              Scan Now →
            </motion.span>
          </div>
        </button>
      </div>

      {/* === PROFILE CARD === */}
      <div className="px-5 mt-6 mb-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#096a5b] to-[#0ea88a] rounded-full flex items-center justify-center shrink-0">
            <User size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-extrabold text-[#0a1b28]">{user.name}</p>
            <p className="text-sm text-muted-foreground font-medium">+91 {maskedPhone}</p>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </div>
      </div>

      {/* === BOTTOM NAV === */}
      <div className="fixed bottom-0 left-0 w-full z-50">
        <div className="bg-white rounded-t-[2rem] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-4 h-20">
          <button className="flex flex-col items-center gap-1 text-[#096a5b]">
            <Home size={24} />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">{t("homeTab")}</span>
          </button>
          <button onClick={() => handleAction("/history", t("history"))} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-[#096a5b] transition-colors">
            <Wallet size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t("vaultTab")}</span>
          </button>
          <button onClick={() => handleAction("/emergency", t("emergency"))} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-[#096a5b] transition-colors">
            <Shield size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t("shieldTab")}</span>
          </button>
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-[#096a5b] transition-colors">
            <User size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t("profileTab")}</span>
          </button>
        </div>
      </div>

      {/* === VOICE ASSISTANT (Floating) === */}
      <VoiceAssistant />
    </div>
  );
}
