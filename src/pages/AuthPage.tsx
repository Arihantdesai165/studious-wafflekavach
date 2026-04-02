import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { hashPin } from "@/lib/crypto";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { PinInput } from "@/components/PinInput";
import { VoiceButton } from "@/components/VoiceButton";
import { createOTP, verifyOTP } from "@/lib/otp";
import { speak } from "@/lib/voice";
import { getLocation } from "@/lib/location";
import QRCode from "qrcode";
import { Shield, KeyRound, ArrowLeft, ArrowRight, Info, ShieldCheck, User, Delete, Mic, CheckCircle2 } from "lucide-react";

type AuthMode = "welcome" | "register" | "login";
type RegisterStep = "phone" | "otp" | "name" | "pin";
// Login is now Direct PIN only
type LoginStep = "pin";

export default function AuthPage() {
  const { t, language, speechCode } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!language) { navigate("/", { replace: true }); }
  }, [language, navigate]);

  const [mode, setMode] = useState<AuthMode>(location.state?.mode || "register");
  
  // Register state
  const [registerStep, setRegisterStep] = useState<RegisterStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [registerName, setRegisterName] = useState("");

  // Login state - defaults directly to PIN
  const [loginStep, setLoginStep] = useState<LoginStep>("pin");
  const [verifying, setVerifying] = useState(false);
  const [verificationStage, setVerificationStage] = useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  // No more auto-skip phone needed, Login starts at PIN
  useEffect(() => {
    if (mode === "login") {
      setLoginStep("pin");
    }
  }, [mode]);

  // ----- REGISTER LOGIC -----
  const handlePhoneSubmit = async () => {
    if (phone.length !== 10) { setError(t("enter10Digits") || "Enter 10-digit number"); return; }
    setLoading(true);
    const result = await createOTP(phone);
    if (result.error) {
       setError(result.error);
    } else {
       setRegisterStep("otp");
       setError("");
    }
    setLoading(false);
  };

  const [isListeningPhone, setIsListeningPhone] = useState(false);
  const handleSpeakPhone = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t("voiceNotAvailable")); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = speechCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListeningPhone(true);
    recognition.onend = () => setIsListeningPhone(false);
    recognition.onerror = () => setIsListeningPhone(false);
    recognition.onresult = (event: any) => { 
      const text = Array.from(event.results).map((res: any) => res[0].transcript).join("");
      const num = text.replace(/\D/g, "").slice(0, 10);
      if(num) setPhone(num);
      if (num.length >= 10) recognition.stop();
    };
    recognition.start();
  };

  const [isListeningOtp, setIsListeningOtp] = useState(false);
  const handleSpeakOtp = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t("voiceNotAvailable")); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = speechCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListeningOtp(true);
    recognition.onend = () => setIsListeningOtp(false);
    recognition.onerror = () => setIsListeningOtp(false);
    recognition.onresult = (event: any) => { 
      const text = Array.from(event.results).map((res: any) => res[0].transcript).join("");
      const num = text.replace(/\D/g, "").slice(0, 6);
      if(num) setOtp(num);
      if (num.length >= 6) recognition.stop();
    };
    recognition.start();
  };

  const handleOtpVerify = () => {
    const result = verifyOTP(phone, otp);
    if (result.error) {
       setError(result.error);
    } else {
       setRegisterStep("name"); 
       setError(""); 
       speak(t("voiceAskName"), speechCode);
    }
  };

  const handleRegisterNameSet = () => {
    if (registerName.trim().length < 2) { setError(t("enterName")); return; }
    setRegisterStep("pin"); setError(""); speak(t("voiceAskPin"), speechCode);
  };

  const handleRegisterPin = async (pin: string) => {
    setLoading(true); setError("");
    try {
      const pinHash = await hashPin(pin);

      // CRITICAL: Check for existing PIN to ensure uniqueness
      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("pin_hash", pinHash)
        .maybeSingle();

      if (existing) {
        setError(t("pinTaken") || "This PIN is already used. Please choose another.");
        setLoading(false);
        return;
      }

      const userLocation = await getLocation();
      const upiId = `${phone}@raksha`;
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(registerName.trim())}&cu=INR`;
      const qrCodeBase64 = await QRCode.toDataURL(qrData);

      const { data, error: dbError } = await supabase
        .from("users")
        .insert({ 
          phone, 
          name: registerName.trim(), 
          pin_hash: pinHash, 
          balance: 10000, 
          last_location: userLocation,
          upi_id: upiId,
          qr_code: qrCodeBase64
        })
        .select().single();

      if (dbError) {
        setError(dbError.code === "23505" ? t("alreadyRegistered") : `DB Error: ${dbError.message || dbError.code}`);
        setLoading(false); return;
      }
      
      localStorage.setItem("rakshakavach_remembered_phone", data.phone);
      setUser({ 
        id: data.id, phone: data.phone, name: data.name, 
        balance: data.balance, is_locked: data.is_locked, 
        last_location: data.last_location, upi_id: data.upi_id, qr_code: data.qr_code
      });
      speak(t("voiceLoginSuccess"), speechCode);
      navigate("/dashboard");
    } catch (e) { 
      setError(`Error: ${e instanceof Error ? e.message : 'Unknown'}`); 
    }
    setLoading(false);
  };

  // ----- LOGIN LOGIC (DIRECT PIN) -----
  const handleLoginPin = async (pin: string) => {
    setLoading(true); setError("");
    try {
      const pinHash = await hashPin(pin);
      
      // SEARCH BY PIN HASH ONLY
      const { data: user, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("pin_hash", pinHash)
        .maybeSingle();

      if (dbError || !user) {
        setError(t("wrongPin")); // generic error for security
        setLoading(false);
        return;
      }

      if (user.is_locked) {
        setError(t("accountLocked"));
        setLoading(false);
        return;
      }

      // Verification Loading Sequence
      setVerifying(true);
      setVerificationStage(0);
      setTimeout(() => setVerificationStage(1), 800);
      setTimeout(() => setVerificationStage(2), 1600);
      setTimeout(async () => {
        const userLocation = await getLocation();
        await supabase.from("users").update({ failed_pin_attempts: 0, is_locked: false, last_location: userLocation }).eq("id", user.id);
        localStorage.setItem("rakshakavach_remembered_phone", user.phone);
        setUser({ 
          id: user.id, phone: user.phone, name: user.name, 
          balance: user.balance, is_locked: false, 
          last_location: userLocation, upi_id: user.upi_id, qr_code: user.qr_code 
        });
        speak(t("voiceLoginSuccess"), speechCode);
        navigate("/dashboard");
      }, 2500);

    } catch (e) {
      setError(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
      setLoading(false);
    }
  };

  const TopBar = () => (
    <div className="flex items-center gap-4 py-4 px-2 border-b-4 border-primary border-t-0 border-l-0 border-r-0 w-[45%] rounded-sm mb-6">
      <button onClick={() => navigate(-1)} className="text-primary active:scale-95 transition-transform"><ArrowLeft size={24} /></button>
      <span className="text-primary font-bold text-lg">{t("appName") || "Rakshakavach"}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <TopBar />
      <div className="flex-1 flex flex-col items-center mt-4">
        {error && <div className="w-full max-w-md rounded-2xl bg-red-100 border border-red-200 p-4 mb-4 text-center text-sm font-bold text-red-600">⚠️ {error}</div>}

        {/* --- VERIFICATION LOADER --- */}
        <AnimatePresence>
          {verifying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
              <div className="flex flex-col items-center max-w-xs text-center">
                <div className="w-24 h-24 mb-8 relative">
                   <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-[6px] border-gray-100 border-t-primary rounded-full" />
                   {verificationStage === 2 && (
                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
                       <CheckCircle2 size={48} className="text-primary" />
                     </motion.div>
                   )}
                </div>
                <motion.p key={verificationStage} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-extrabold text-[#113833]">
                  {verificationStage === 0 ? t("verifyingIdentity") : verificationStage === 1 ? t("checkingSecurity") : t("accessGranted")}
                </motion.p>
                <div className="flex gap-2 mt-6">
                   {[0, 1, 2].map(i => (i <= verificationStage ? (
                     <motion.div key={i} layoutId={`dot-${i}`} className="h-2 w-8 rounded-full bg-primary" transition={{ duration: 0.5 }} />
                   ) : (
                     <div key={i} className="h-2 w-8 rounded-full bg-gray-200" />
                   )))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- LOGIN FLOW (DIRECT PIN) --- */}
        {mode === "login" && !verifying && (
          <div className="w-full max-w-md flex flex-col items-center mt-4">
               <PinInput onComplete={handleLoginPin} label={t("enterPin")} />
               <p className="mt-8 text-muted-foreground text-sm font-medium text-center opacity-40">Direct PIN Login Enabled</p>
          </div>
        )}

        {/* --- REGISTER FLOW --- */}
        {mode === "register" && (
           registerStep === "phone" ? (
             <div className="w-full max-w-md flex flex-col items-center mt-4">
               <h1 className="text-3xl font-extrabold text-[#0a1b28] mb-2 text-center">{t("askMobileNumber")}</h1>
               <p className="text-muted-foreground font-medium mb-10 text-center">{t("sendSecurityCodeText")}</p>
               <div className="bg-[#f4f7f9] rounded-2xl py-6 px-6 flex items-center mb-10 w-full relative">
                 <span className="text-2xl font-bold text-[#0a1b28] mr-4">+91</span>
                 <div className="text-3xl font-bold tracking-[0.2em] flex-1">
                   {[...Array(10)].map((_, i) => (
                     <span key={i} className={i < phone.length ? "text-[#0a1b28]" : "text-[#cbd5e1]"}>
                       {i < phone.length ? phone[i] : '0'}
                     </span>
                   ))}
                 </div>
                 <button 
                   onClick={handleSpeakPhone}
                   className={`ml-2 p-3 rounded-full transition-all ${isListeningPhone ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                 >
                   <Mic size={24} />
                 </button>
               </div>
               <div className="grid grid-cols-3 gap-4 w-full mb-10">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => <button key={num} onClick={() => setPhone(p => p.length < 10 ? p + String(num) : p)} className="bg-white text-3xl font-bold py-4 rounded-3xl border border-gray-100 shadow-sm active:scale-95">{num}</button>)}
                 <button onClick={() => setPhone(p => p.slice(0, -1))} className="flex items-center justify-center text-[#97a3b6]"><Delete size={32} /></button>
                 <button onClick={() => setPhone(p => p.length < 10 ? p + "0" : p)} className="bg-white text-3xl font-bold py-4 rounded-3xl border border-gray-100 shadow-sm active:scale-95">0</button>
                 <button onClick={handlePhoneSubmit} disabled={phone.length !== 10 || loading} className="flex items-center justify-center bg-primary text-white py-4 rounded-3xl active:scale-95 disabled:opacity-50"><ArrowRight size={32} /></button>
               </div>
             </div>
           ) : registerStep === "otp" ? (
             <div className="w-full max-w-md flex flex-col">
                <div className="bg-[#096a5b] rounded-2xl w-12 h-12 flex items-center justify-center mb-6 shadow-md"><ShieldCheck size={24} className="text-white" /></div>
                <h1 className="text-3xl font-extrabold text-[#113833] mb-2">{t("newAccountTitle")}</h1>
                <p className="text-muted-foreground font-medium mb-8">{t("sentOtpText")}</p>
                <div className="bg-[#f4f7f9] rounded-2xl py-6 px-6 flex items-center mb-6 w-full relative">
                  <div className="text-3xl font-bold tracking-[0.4em] flex-1 text-center font-mono">
                    {[...Array(6)].map((_, i) => (
                      <span key={i} className={i < otp.length ? "text-[#0a1b28]" : "text-[#cbd5e1]"}>
                        {i < otp.length ? otp[i] : '-'}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={handleSpeakOtp}
                    className={`ml-2 p-3 rounded-full transition-all ${isListeningOtp ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                  >
                    <Mic size={24} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 w-full mb-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => <button key={num} onClick={() => setOtp(p => p.length < 6 ? p + String(num) : p)} className="bg-white text-3xl font-bold py-4 rounded-3xl border border-gray-100 shadow-sm active:scale-95">{num}</button>)}
                  <button onClick={() => setOtp(p => p.slice(0, -1))} className="flex items-center justify-center text-[#97a3b6]"><Delete size={32} /></button>
                  <button onClick={() => setOtp(p => p.length < 6 ? p + "0" : p)} className="bg-white text-3xl font-bold py-4 rounded-3xl border border-gray-100 shadow-sm active:scale-95">0</button>
                  <button onClick={handleOtpVerify} disabled={otp.length !== 6 || loading} className="flex items-center justify-center bg-primary text-white py-4 rounded-3xl active:scale-95 disabled:opacity-50"><ArrowRight size={32} /></button>
                </div>
             </div>
           ) : registerStep === "name" ? (
             <div className="w-full max-w-md flex flex-col mt-4">
               <h1 className="text-3xl font-extrabold text-[#113833] mb-8">{t("yourName")}</h1>
               <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder={t("typeNamePlaceholder")} className="input-field mb-4 w-full border-gray-300" />
               <VoiceButton onResult={(text) => setRegisterName(text)} label={t("speakName") || "Speak Name"} />
               <button onClick={handleRegisterNameSet} className="w-full bg-primary text-white font-bold text-lg rounded-2xl py-4 mt-6 shadow-lg active:scale-95 transition-transform">{t("continue")}</button>
             </div>
           ) : (
             <div className="w-full max-w-md flex flex-col items-center mt-4">
                <PinInput onComplete={handleRegisterPin} label={t("setPin")} />
             </div>
           )
        )}
      </div>
    </div>
  );
}
