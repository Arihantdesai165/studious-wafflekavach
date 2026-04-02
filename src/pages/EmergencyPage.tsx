import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { hashPin } from "@/lib/crypto";
import { PinInput } from "@/components/PinInput";
import { speak } from "@/lib/voice";
import { ArrowLeft, Lock, Unlock, ShieldAlert } from "lucide-react";

export default function EmergencyPage() {
  const { user, setUser } = useAuth();
  const { t, speechCode } = useLanguage();
  const navigate = useNavigate();
  const [showUnlock, setShowUnlock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) { navigate("/"); return null; }

  const handleLock = async () => {
    setLoading(true);
    await supabase.from("users").update({ is_locked: true }).eq("id", user.id);
    setUser({ ...user, is_locked: true });
    speak(t("voiceAccountLocked"), speechCode);
    setLoading(false);
  };

  const handleUnlock = async (pin: string) => {
    setLoading(true); setError("");
    const pinHash = await hashPin(pin);
    const { data } = await supabase.from("users").select("pin_hash").eq("id", user.id).single();
    if (data && data.pin_hash === pinHash) {
      await supabase.from("users").update({ is_locked: false, failed_pin_attempts: 0 }).eq("id", user.id);
      setUser({ ...user, is_locked: false });
      speak(t("voiceAccountUnlocked"), speechCode);
      setShowUnlock(false);
    } else { setError(t("wrongPinError")); }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")}
        className="mb-4 flex w-full items-center gap-2 text-lg font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={22} /> {t("back")}
      </motion.button>

      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-danger/10 mb-6">
        <ShieldAlert size={48} className="text-danger" />
      </motion.div>

      <h2 className="mb-2 text-2xl font-bold text-foreground">{t("emergency")}</h2>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 w-full max-w-sm rounded-2xl bg-danger/10 border border-danger/20 p-4 text-center text-lg font-bold text-danger">
          ⚠️ {error}
        </motion.div>
      )}

      {user.is_locked ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full max-w-sm flex-col items-center gap-4">
          <div className="rounded-3xl bg-danger/10 border border-danger/20 p-6 text-center w-full">
            <Lock size={48} className="mx-auto mb-2 text-danger" />
            <p className="text-xl font-bold text-danger">{t("accountIsLocked")}</p>
          </div>
          {!showUnlock ? (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowUnlock(true)}
              className="rural-btn gradient-primary text-primary-foreground w-full">
              <Unlock size={28} /> {t("unlockAccount")}
            </motion.button>
          ) : (
            <PinInput onComplete={handleUnlock} label={t("enterPinToUnlock")} />
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-sm flex-col gap-4">
          <p className="text-center text-lg text-muted-foreground font-medium">{t("lockAccountDesc")}</p>
          <motion.button whileTap={{ scale: 0.94 }} onClick={handleLock} disabled={loading}
            className="rural-btn gradient-danger text-danger-foreground min-h-[130px] text-2xl rounded-3xl hover:shadow-2xl transition-shadow">
            <Lock size={52} className="drop-shadow" /> {t("lockAccount")}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
