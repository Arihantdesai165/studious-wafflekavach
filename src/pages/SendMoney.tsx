import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, Language } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PinInput } from "@/components/PinInput";
import { VoiceButton } from "@/components/VoiceButton";
import { RiskBadge } from "@/components/RiskBadge";
import { assessRisk, RiskLevel } from "@/lib/fraud";
import { hashPin } from "@/lib/crypto";
import { getLocation } from "@/lib/location";
import { speak, speakSlow, convertNumberToKannada, convertNumberToKannadaPhonetic, KANNADA_PROMPTS } from "@/lib/voice";
import {
  ArrowLeft, Send, Phone, Coins, CheckCircle2, Delete,
  Shield, User, ArrowRight, Wallet, Clock, ShieldCheck,
  Sparkles, TrendingUp, AlertTriangle, Lock, Volume2, RefreshCw,
  QrCode, LockKeyhole
} from "lucide-react";
import QRScanner from "@/components/QRScanner";

/* ============ VOICE REMINDER MESSAGES (all languages) ============ */
function getVoiceReminder(lang: Language | null, amount: string, phone: string, name: string): { voiceText: string; displayText: string } {
  const amt = parseFloat(amount) || 0;
  const fmtAmt = amt.toLocaleString("en-IN");
  const displayName = name || phone;

  switch (lang) {
    case "kn":
      const knAmount = convertNumberToKannadaPhonetic(amt);
      return {
        voiceText: `Neevu, ${knAmount} rupaayigalannu, ${displayName} avarige, kaluhisuttiddeeri. Drudheekarisalu, button otti.`,
        displayText: `ನೀವು ₹${fmtAmt} ಅನ್ನು ${displayName} ಅವರಿಗೆ ಕಳುಹಿಸುತ್ತಿದ್ದೀರಿ. ದೃಢೀಕರಿಸಲು ಬಟನ್ ಒತ್ತಿ.`,
      };
    case "hi":
      return {
        voiceText: `आप ₹${fmtAmt} को ${displayName} पर भेज रहे हैं। कृपया पुष्टि करने के लिए बटन दबाएं।`,
        displayText: `आप ₹${fmtAmt} को ${displayName} पर भेज रहे हैं। पुष्टि करने के लिए बटन दबाएं।`,
      };
    case "mr":
      return {
        voiceText: `तुम्ही ₹${fmtAmt} ${displayName} वर पाठवत आहात। कृपया पुष्टी करण्यासाठी बटण दाबा।`,
        displayText: `तुम्ही ₹${fmtAmt} ${displayName} वर पाठवत आहात। पुष्टी करण्यासाठी बटण दाबा।`,
      };
    default: // English
      return {
        voiceText: `You are sending ${fmtAmt} rupees to ${displayName}. Please press the confirm button to proceed.`,
        displayText: `Sending ₹${fmtAmt} to ${displayName}. Press confirm to proceed.`,
      };
  }
}

type Step = "receiver" | "amount" | "confirm" | "pin" | "result";

const pageVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

/* ============ CUSTOM NUMERIC KEYPAD ============ */
function NumericKeypad({
  onDigit,
  onDelete,
  onDone,
  doneLabel = "→",
  doneDisabled = false,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onDone: () => void;
  doneLabel?: string;
  doneDisabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "DEL", "0", "DONE"];

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {keys.map((key, i) => {
        if (key === "DEL") {
          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onDelete}
              className="h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center
                text-red-500 font-bold text-lg active:bg-red-100 transition-colors"
            >
              <Delete size={22} />
            </motion.button>
          );
        }
        if (key === "DONE") {
          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onDone}
              disabled={doneDisabled}
              className="h-14 rounded-2xl bg-gradient-to-br from-[#096a5b] to-[#0ea88a] 
                flex items-center justify-center text-white font-extrabold text-lg
                disabled:opacity-40 disabled:from-gray-300 disabled:to-gray-400
                active:shadow-inner transition-all shadow-md shadow-[#096a5b]/20"
            >
              {doneLabel}
            </motion.button>
          );
        }
        return (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.92, backgroundColor: "rgba(9,106,91,0.08)" }}
            onClick={() => onDigit(key)}
            className="h-14 rounded-2xl bg-white border border-gray-100 shadow-sm
              flex items-center justify-center text-[#0a1b28] font-bold text-xl
              active:bg-[#f0f8f6] transition-colors hover:border-[#096a5b]/30"
          >
            {key}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ============ QUICK AMOUNT CHIPS ============ */
function QuickAmountChips({ onSelect, current }: { onSelect: (a: string) => void; current: string }) {
  const amounts = ["100", "200", "500", "1000", "2000", "5000"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {amounts.map((a) => (
        <motion.button
          key={a}
          type="button"
          whileTap={{ scale: 0.93 }}
          onClick={() => onSelect(a)}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all border
            ${current === a
              ? "bg-[#096a5b] text-white border-[#096a5b] shadow-md shadow-[#096a5b]/20"
              : "bg-white text-[#0a1b28] border-gray-100 hover:border-[#096a5b]/30 active:bg-[#f0f8f6]"
            }`}
        >
          ₹{parseInt(a).toLocaleString("en-IN")}
        </motion.button>
      ))}
    </div>
  );
}

export default function SendMoney() {
  const { user, setUser } = useAuth();
  const { t, speechCode, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>("receiver");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [isFetchingName, setIsFetchingName] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("scan") === "true") {
      setShowScanner(true);
    }
  }, [searchParams]);
  const [amount, setAmount] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("low");
  const [riskReasons, setRiskReasons] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<{ id: string; utr: string; time: string } | null>(null);
  const [reminderPlaying, setReminderPlaying] = useState(false);
  const reminderSpokenRef = useRef(false);

  // Helper for generating 12-digit UTR
  const generateUTR = () => {
    return Math.floor(Math.random() * 900000000000 + 100000000000).toString();
  };

  useEffect(() => { if (!user) navigate("/"); }, [user, navigate]);

  // Pre-fill from voice assistant URL params
  useEffect(() => {
    const urlAmount = searchParams.get("amount");
    const urlReceiver = searchParams.get("receiver");
    if (urlAmount) setAmount(urlAmount);
    if (urlReceiver) {
      if (/^\d{10}$/.test(urlReceiver)) {
        setReceiverPhone(urlReceiver);
      }
    }
  }, [searchParams]);

  // Fetch receiver name when phone reaches 10 digits
  useEffect(() => {
    if (receiverPhone.length === 10) {
      const fetchName = async () => {
        setIsFetchingName(true);
        try {
          const { data } = await supabase
            .from("users")
            .select("name")
            .eq("phone", receiverPhone)
            .single();
          
          if (data) {
            setReceiverName(data.name);
          } else {
            setReceiverName("");
          }
        } catch (err) {
          console.error("Error fetching receiver name:", err);
        } finally {
          setIsFetchingName(false);
        }
      };
      
      fetchName();
    } else if (receiverName) {
      setReceiverName("");
    }
  }, [receiverPhone]);

  // AUTO-SKIP to confirm step if triggered by Voice Assistant
  useEffect(() => {
    // Only auto-skip if we are at the start and have data from URL params
    if (step === "receiver" && receiverName && amount && !loading && !error) {
      const amt = parseFloat(amount);
      if (amt > 0 && receiverPhone.length === 10) {
        // Short delay to let user see the name was found
        const timer = setTimeout(() => {
          handleAmountNext();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [receiverName, amount, step]);

  const handleReceiverNext = () => {
    if (receiverPhone.length !== 10) { setError(t("enter10Digits")); return; }
    if (receiverPhone === user.phone) { setError(t("cantSendToSelf")); return; }
    setError(""); setStep("amount");
  };

  const handleAmountNext = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError(t("enterValidAmount")); return; }
    if (amt > user.balance) { setError(t("insufficientBalance")); speak(t("voiceInsufficientBalance"), speechCode); return; }

    const location = await getLocation();
    const { count } = await supabase.from("transactions").select("*", { count: "exact", head: true })
      .eq("sender_id", user.id).gte("created_at", new Date(Date.now() - 3600000).toISOString());

    const risk = assessRisk({ amount: amt, currentLocation: location, lastLocation: user.last_location, recentTransactionCount: count || 0 });
    setRiskLevel(risk.level); setRiskReasons(risk.reasons);

    // Reset reminder ref so it speaks fresh on entering confirm step
    reminderSpokenRef.current = false;
    setError(""); setStep("confirm");
  };

  // Auto-speak the voice reminder when confirm step is shown
  useEffect(() => {
    if (step === "confirm" && !reminderSpokenRef.current) {
      reminderSpokenRef.current = true;
      playVoiceReminder();
    }
  }, [step]);

  const playVoiceReminder = async () => {
    const reminder = getVoiceReminder(language, amount, receiverPhone, receiverName);
    setReminderPlaying(true);
    // Use speakSlow (rate 0.6) — clear, slow speech so rural users understand every word
    await speakSlow(reminder.voiceText, speechCode);
    // If high risk, also warn slowly
    if (riskLevel === "high") {
      await speakSlow(t("voiceFraudWarning"), speechCode);
    }
    setReminderPlaying(false);
  };

  const handleConfirm = () => {
    // Always require PIN for authorization as per system requirements
    setStep("pin");
    speak(t("voiceAskPin") || "Please enter your 4-digit PIN using the keypad or speak it out loud.", speechCode);
  };

  const processTransaction = async (pin?: string) => {
    setLoading(true); setError("");
    try {
      // 1. Fetch current user state from DB to get latest lock/attempt info
      const { data: dbUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (fetchError || !dbUser) {
        setError(t("errorOccurred") || "Could not verify account status");
        setLoading(false);
        return;
      }

      if (pin) {
        const pinHash = await hashPin(pin);
        
        // 2. CHECK PIN FIRST
        if (pinHash !== dbUser.pin_hash) {
          // WRONG PIN
          const newAttempts = (dbUser.failed_pin_attempts || 0) + 1;
          const shouldLock = newAttempts >= 3;
          
          await supabase.from("users").update({ 
            failed_pin_attempts: newAttempts, 
            is_locked: dbUser.is_locked || shouldLock 
          }).eq("id", user.id);

          if (shouldLock || dbUser.is_locked) {
            setError(t("threeWrongAttempts") || "3 wrong attempts - Account locked");
            speak(t("voiceAccountLocked"), speechCode);
          } else {
            setError(`${t("wrongPinError") || t("wrongPin")} (${3 - newAttempts} ${t("attemptsLeft")})`);
          }
          setLoading(false);
          return;
        }

        // 3. CORRECT PIN!
        // Reset attempts and unlock if they were locked
        if (dbUser.is_locked || (dbUser.failed_pin_attempts || 0) > 0) {
          await supabase.from("users").update({ 
            failed_pin_attempts: 0, 
            is_locked: false 
          }).eq("id", user.id);
        }
      } else if (riskLevel === "high") {
        // High risk requires PIN, if we got here without one something is wrong
        setError("PIN required for high-risk transactions");
        setLoading(false);
        return;
      }

      const amtNum = parseFloat(amount);
      const utr = generateUTR();
      const location = await getLocation();
      const { data: receiver } = await supabase.from("users").select("*").eq("phone", receiverPhone).single();
      if (!receiver) { setError(t("receiverNotFound")); setLoading(false); return; }

      // Update balances
      await supabase.from("users").update({ balance: user.balance - amtNum, last_location: location }).eq("id", user.id);
      await supabase.from("users").update({ balance: receiver.balance + amtNum }).eq("id", receiver.id);
      
      // Insert transaction
      const { data: txData, error: txErr } = await supabase.from("transactions").insert({ 
        sender_id: user.id, 
        receiver_id: receiver.id, 
        amount: amtNum, 
        risk_level: riskLevel, 
        location,
        status: "completed",
        utr: utr
      }).select("id, created_at").single();

      if (txErr) throw txErr;

      setTransactionDetails({
        id: txData.id,
        utr: utr,
        time: new Date(txData.created_at).toLocaleString("en-IN")
      });

      setUser({ ...user, balance: user.balance - amtNum, last_location: location });
      setSuccess(true); setStep("result");
      speak(t("voiceTxSuccess"), speechCode);
    } catch { setError(t("transactionFailed")); }
    setLoading(false);
  };

  const stepIndex = ["receiver", "amount", "confirm", "pin", "result"].indexOf(step);

  // Keypad handlers for receiver phone
  const handlePhoneDigit = (d: string) => {
    if (receiverPhone.length < 10) setReceiverPhone(prev => prev + d);
  };
  const handlePhoneDelete = () => {
    if (receiverPhone.length > 0) {
      setReceiverPhone(prev => prev.slice(0, -1));
    }
  };

  const handleQRScan = (data: string) => {
    setShowScanner(false);
    try {
      // Extract phone from UPI URL: upi://pay?pa=PHONE@raksha...
      const url = new URL(data);
      const pa = url.searchParams.get("pa");
      if (pa) {
        const phone = pa.split("@")[0];
        if (phone && phone.length === 10) {
          setReceiverPhone(phone);
          toast.success(t("qrScannedSuccess") || "QR Code scanned successfully!");
          
          // Auto-trigger the next step if phone is valid
          setTimeout(() => handleReceiverNext(), 500);
        } else {
          toast.error(t("invalidQR") || "Invalid QR Code format.");
        }
      }
    } catch (e) {
      console.error("QR Parse Error:", e);
      toast.error(t("qrReadError") || "Could not read QR Code.");
    }
  };

  // Keypad handlers for amount
  const handleAmountDigit = (d: string) => {
    if (amount.length < 7) setAmount(prev => prev + d);
  };
  const handleAmountDelete = () => setAmount(prev => prev.slice(0, -1));

  // Format display number with spaces
  const formattedPhone = receiverPhone
    ? receiverPhone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3").trim()
    : "";

  const amtNum = parseFloat(amount) || 0;
  const balanceAfter = user.balance - amtNum;

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fa]">
      {/* === HEADER === */}
      <div className="bg-gradient-to-br from-[#0a2342] via-[#113557] to-[#1c4879] text-white px-5 pt-4 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft size={20} /> <span className="text-sm font-bold">{t("back")}</span>
          </motion.button>
          <span className="text-sm font-extrabold tracking-wider uppercase opacity-70">{t("sendMoney")}</span>
          <div className="w-14" />
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-3">
          {["receiver", "amount", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: stepIndex === i ? 1.1 : 1,
                  backgroundColor: i <= stepIndex ? "#0ea88a" : "rgba(255,255,255,0.2)",
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold"
              >
                {i < stepIndex ? <CheckCircle2 size={16} /> : i + 1}
              </motion.div>
              {i < 2 && (
                <div className={`w-8 h-0.5 rounded-full transition-all ${i < stepIndex ? "bg-[#0ea88a]" : "bg-white/20"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Balance badge */}
        <div className="flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
            <Wallet size={14} className="text-white/70" />
            <span className="text-xs font-bold text-white/80">{t("balanceLabel")}: ₹{user.balance.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* === ERROR === */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mx-5 mt-3 rounded-2xl bg-red-50 border border-red-100 p-3.5 text-center text-sm font-bold text-red-600 flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === CONTENT === */}
      <div className="flex-1 px-5 pt-4 pb-4 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ————— STEP 1: RECEIVER ————— */}
          {step === "receiver" && (
            <motion.div key="receiver" variants={pageVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col gap-3 flex-1">

              {/* Receiver display card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#e8f5f1] rounded-xl flex items-center justify-center">
                    <Phone size={20} className="text-[#096a5b]" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#0a1b28]">{t("receiverNumber")}</p>
                    <p className="text-xs text-muted-foreground font-medium">10 digits</p>
                  </div>
                </div>

                {/* Phone number display */}
                <div className="bg-[#f4f7f9] rounded-xl px-4 py-3 flex flex-col justify-center min-h-[72px]">
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-extrabold tracking-wider ${receiverPhone ? "text-[#0a1b28]" : "text-gray-300"}`}>
                      {formattedPhone || "XXX XXX XXXX"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i < receiverPhone.length ? "bg-[#096a5b]" : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Receiver Name / Loading Fetching state */}
                  {(isFetchingName || receiverName) && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#096a5b] animate-pulse" />
                      <span className="text-sm font-bold text-[#096a5b]">
                        {isFetchingName ? t("fetchingName") || "Searching..." : receiverName}
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Voice & QR Input */}
              <div className="grid grid-cols-2 gap-3">
                <VoiceButton onResult={(text) => setReceiverPhone(text.replace(/\D/g, "").slice(0, 10))} label={t("speakNumber")} />
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowScanner(true)}
                  className="flex flex-col items-center justify-center gap-2 bg-slate-900 border-2 border-slate-900 py-3 rounded-2xl shadow-sm hover:bg-slate-800 transition-all group"
                >
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode size={20} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{t("scanQR") || "Scan QR"}</span>
                </motion.button>
              </div>

              {/* Number Keypad */}
              <div className="mt-1">
                <NumericKeypad
                  onDigit={handlePhoneDigit}
                  onDelete={handlePhoneDelete}
                  onDone={handleReceiverNext}
                  doneLabel="→"
                  doneDisabled={receiverPhone.length !== 10}
                />
              </div>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 mt-1">
                <Shield size={12} className="text-[#096a5b]/50" />
                <span className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase">
                  {t("e2eEncryption")}
                </span>
              </div>
            </motion.div>
          )}

          {/* ————— STEP 2: AMOUNT ————— */}
          {step === "amount" && (
            <motion.div key="amount" variants={pageVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col gap-3 flex-1">

              {/* Amount display card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f5eeff] rounded-xl flex items-center justify-center">
                      <Coins size={20} className="text-[#7c3aed]" />
                    </div>
                    <p className="text-sm font-extrabold text-[#0a1b28]">{t("amount")}</p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground bg-gray-50 px-3 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                    <User size={10} className="text-[#096a5b]" />
                    {receiverName || receiverPhone}
                  </span>
                </div>

                {/* Amount display */}
                <div className="bg-[#f4f7f9] rounded-xl px-4 py-3 text-center min-h-[60px] flex items-center justify-center">
                  <span className={`text-3xl font-extrabold ${amount ? "text-[#0a1b28]" : "text-gray-300"}`}>
                    ₹{amount ? parseInt(amount).toLocaleString("en-IN") : "0"}
                  </span>
                </div>

                {/* Balance info bar */}
                <div className="flex justify-between items-center mt-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={13} className="text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">
                      {t("balanceLabel")}: ₹{user.balance.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {amtNum > 0 && (
                    <span className={`text-xs font-bold ${balanceAfter >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {balanceAfter >= 0 ? `₹${balanceAfter.toLocaleString("en-IN")} left` : "⚠️ Insufficient"}
                    </span>
                  )}
                </div>

                {/* Balance progress bar */}
                {amtNum > 0 && (
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((amtNum / user.balance) * 100, 100)}%` }}
                      className={`h-full rounded-full ${
                        amtNum / user.balance > 0.8 ? "bg-red-400" : amtNum / user.balance > 0.5 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Quick amount chips */}
              <QuickAmountChips onSelect={setAmount} current={amount} />

              {/* Number Keypad */}
              <NumericKeypad
                onDigit={handleAmountDigit}
                onDelete={handleAmountDelete}
                onDone={handleAmountNext}
                doneLabel="→"
                doneDisabled={!amount || amtNum <= 0 || amtNum > user.balance}
              />
            </motion.div>
          )}

          {/* ————— STEP 3: CONFIRM ————— */}
          {step === "confirm" && (
            <motion.div key="confirm" variants={pageVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col gap-3 flex-1">

              {/* 🔊 VOICE REMINDER BANNER */}
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={playVoiceReminder}
                className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5
                  flex items-start gap-3 text-left active:scale-[0.98] transition-transform overflow-hidden"
              >
                {/* Animated speaker icon */}
                <div className="relative shrink-0">
                  <motion.div
                    animate={reminderPlaying ? { scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 w-10 h-10 rounded-full bg-amber-300/30"
                  />
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    reminderPlaying ? "bg-amber-500" : "bg-amber-100"
                  }`}>
                    <Volume2 size={20} className={reminderPlaying ? "text-white" : "text-amber-600"} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
                      {speechCode === "kn-IN" ? "🔊 ಧ್ವನಿ ಜ್ಞಾಪನೆ" : speechCode === "hi-IN" ? "🔊 आवाज़ अनुस्मारक" : speechCode === "mr-IN" ? "🔊 आवाज स्मरणपत्र" : "🔊 Voice Reminder"}
                    </span>
                    {reminderPlaying && (
                      <div className="flex items-end gap-0.5 h-3">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [2, 10 + Math.random() * 4, 2] }}
                            transition={{ duration: 0.4 + Math.random() * 0.2, repeat: Infinity, delay: i * 0.08 }}
                            className="w-[2px] rounded-full bg-amber-500"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-amber-800 leading-relaxed">
                    {getVoiceReminder(
                      speechCode === "kn-IN" ? "kn" : speechCode === "hi-IN" ? "hi" : speechCode === "mr-IN" ? "mr" : "en",
                      amount, receiverPhone, receiverName
                    ).displayText}
                  </p>
                  <p className="text-[10px] font-medium text-amber-500 mt-1 flex items-center gap-1">
                    <RefreshCw size={10} />
                    {speechCode === "kn-IN" ? "ಮತ್ತೊಮ್ಮೆ ಕೇಳಲು ಟ್ಯಾಪ್ ಮಾಡಿ" : speechCode === "hi-IN" ? "दोबारा सुनने के लिए टैप करें" : speechCode === "mr-IN" ? "पुन्हा ऐकण्यासाठी टॅप करा" : "Tap to hear again"}
                  </p>
                </div>
              </motion.button>

              {/* Transaction Summary Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Top gradient banner */}
                <div className="bg-gradient-to-br from-[#096a5b] to-[#0ea88a] px-5 py-5 text-center">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                    {t("amount")}
                  </p>
                  <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-4xl font-extrabold text-white"
                  >
                    ₹{parseFloat(amount).toLocaleString("en-IN")}
                  </motion.p>
                </div>

                {/* From / To section */}
                <div className="px-5 py-4 space-y-3">
                  {/* From */}
                  <div className="flex items-center gap-3 bg-[#f4f7f9] rounded-xl p-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#096a5b] to-[#0ea88a] rounded-full flex items-center justify-center shrink-0">
                      <User size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">From</p>
                      <p className="text-sm font-extrabold text-[#0a1b28]">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </div>
                    <TrendingUp size={16} className="text-red-400" />
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-8 h-8 rounded-full bg-[#096a5b]/10 flex items-center justify-center"
                    >
                      <ArrowRight size={16} className="text-[#096a5b] rotate-90" />
                    </motion.div>
                  </div>

                  {/* To */}
                  <div className="flex items-center gap-3 bg-[#f4f7f9] rounded-xl p-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <User size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">To</p>
                      <p className="text-sm font-extrabold text-[#0a1b28]">{receiverPhone}</p>
                    </div>
                    <TrendingUp size={16} className="text-emerald-400" />
                  </div>
                </div>
              </div>

               {/* Risk Badge */}
              <RiskBadge level={riskLevel} reasons={riskReasons} />

              {/* High Risk Alert for Large Amounts */}
              {amtNum > 15000 && riskLevel === "high" && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3 shadow-md"
                >
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                    <AlertTriangle size={24} className="text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-0.5">Alert</p>
                    <p className="text-sm font-extrabold text-red-700 leading-tight">
                      {t("highRiskCheck")}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Transaction details */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">{t("balanceLabel")}</span>
                  <span className="text-xs font-extrabold text-[#0a1b28]">₹{user.balance.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">{t("amount")}</span>
                  <span className="text-xs font-extrabold text-red-500">-₹{parseFloat(amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">After</span>
                  <span className="text-xs font-extrabold text-emerald-600">₹{(user.balance - parseFloat(amount)).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Security info */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#096a5b]" />
                  <span className="text-[10px] font-bold text-[#096a5b]">{t("e2eEncryption")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock size={13} className="text-[#096a5b]" />
                  <span className="text-[10px] font-bold text-[#096a5b]">{t("bitSecurity")}</span>
                </div>
              </div>

              {riskLevel === "high" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm font-bold text-red-500 bg-red-50 rounded-xl p-3 border border-red-100"
                >
                  ⚠️ {t("proceedCarefully")}
                </motion.p>
              )}

              {/* Confirm / Cancel buttons */}
              <div className="flex gap-3 mt-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep("amount")}
                  className="flex-1 h-14 rounded-2xl bg-gray-100 text-[#0a1b28] font-extrabold text-base
                    active:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} /> {t("back")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirm}
                  disabled={loading}
                  className={`flex-[2] h-14 rounded-2xl font-extrabold text-base
                    flex items-center justify-center gap-2 shadow-lg transition-all
                    ${riskLevel === "high"
                      ? "bg-amber-500 text-white shadow-amber-500/30"
                      : "bg-gradient-to-br from-[#096a5b] to-[#0ea88a] text-white shadow-[#096a5b]/30"
                    } disabled:opacity-50`}
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Sparkles size={20} />
                    </motion.div>
                  ) : (
                    <>
                      <CheckCircle2 size={20} /> {t("confirm")}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ————— STEP 4: PIN ————— */}
          {step === "pin" && (
            <motion.div key="pin" variants={pageVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col items-center gap-4 flex-1">

              {/* Authorization card */}
              <div className="bg-[#f4f7f9] border border-gray-100 rounded-2xl p-4 w-full flex items-center gap-3">
                <div className="w-10 h-10 bg-[#096a5b]/10 rounded-full flex items-center justify-center shrink-0">
                  <LockKeyhole size={20} className="text-[#096a5b]" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#0a1b28]">{t("enterPin")}</p>
                  <p className="text-xs text-muted-foreground font-medium">₹{parseFloat(amount).toLocaleString("en-IN")} → {receiverPhone}</p>
                </div>
              </div>

              <PinInput onComplete={(pin) => processTransaction(pin)} label={t("enterPin")} />

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Sparkles size={16} />
                  </motion.div>
                  <p className="animate-pulse font-bold text-sm">{t("loading")}</p>
                </div>
              )}

              {/* Security footer */}
              <div className="mt-auto flex items-center justify-center gap-2 pb-4">
                <Shield size={14} className="text-[#096a5b]/40" />
                <span className="text-[10px] font-bold text-muted-foreground">{t("e2eEncryption")}</span>
              </div>
            </motion.div>
          )}

          {/* ————— STEP 5: RESULT ————— */}
          {step === "result" && success && (
            <motion.div key="result" variants={pageVariants} initial="initial" animate="animate"
              className="flex flex-col items-center gap-5 flex-1 pt-4">

              {/* Success animation */}
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 w-28 h-28 rounded-full bg-emerald-200"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#096a5b] to-[#0ea88a] 
                    flex items-center justify-center shadow-2xl shadow-[#096a5b]/30"
                >
                  <CheckCircle2 size={56} className="text-white" />
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-extrabold text-emerald-600"
              >
                {t("transactionSuccess")} 🎉
              </motion.p>

              {/* Transaction receipt card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-3xl shadow-md border border-gray-100 w-full overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#096a5b]/5 to-[#0ea88a]/5 px-5 py-4 border-b border-gray-50">
                  <p className="text-center text-3xl font-extrabold text-[#0a1b28]">
                    ₹{parseFloat(amount).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="px-5 py-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted-foreground">To</span>
                    <span className="text-xs font-extrabold text-[#0a1b28]">{receiverPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted-foreground">UTR Number</span>
                    <span className="text-xs font-extrabold text-blue-600 tracking-wider">
                      {transactionDetails?.utr || "----"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Transaction ID</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {transactionDetails?.id.slice(0, 8) || "----"}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Time</span>
                    <span className="text-xs font-extrabold text-[#0a1b28]">
                      {transactionDetails?.time || new Date().toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 mt-1 border-t border-gray-100">
                    <span className="text-xs font-bold text-muted-foreground">New {t("balanceLabel")}</span>
                    <span className="text-xs font-extrabold text-emerald-600">₹{(user.balance).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </motion.div>

              {/* Confetti-like sparkles */}
              <div className="flex items-center gap-3 text-muted-foreground">
                {["🎉", "✨", "🎊"].map((emoji, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.15 }}
                    className="text-2xl"
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/dashboard")}
                className="w-full h-14 rounded-2xl bg-gradient-to-br from-[#096a5b] to-[#0ea88a] 
                  text-white font-extrabold text-base flex items-center justify-center gap-2
                  shadow-lg shadow-[#096a5b]/30 mt-2"
              >
                {t("goHome")}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <QRScanner 
            onScan={handleQRScan} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
