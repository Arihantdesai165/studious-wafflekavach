import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { speak, KANNADA_PROMPTS } from "@/lib/voice";
import { ArrowLeft, Download, Share2, QrCode, User, ShieldCheck, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ReceivePage() {
  const { user } = useAuth();
  const { t, speechCode } = useLanguage();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Voice guidance on mount
    if (speechCode === "kn-IN") {
      speak(KANNADA_PROMPTS.receiveGuidance, speechCode);
    } else {
      speak("This is your QR code. Others can scan this to send you money.", speechCode);
    }
  }, [speechCode]);

  if (!user) {
    navigate("/");
    return null;
  }

  const handleCopyUPI = () => {
    if (user.upi_id) {
      navigator.clipboard.writeText(user.upi_id);
      setCopied(true);
      toast.success(t("upiCopied") || "UPI ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!user.qr_code) return;
    const link = document.createElement("a");
    link.href = user.qr_code;
    link.download = `Rakshakavach_QR_${user.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("qrDownloaded") || "QR Code downloaded!");
  };

  const handleShareQR = async () => {
    if (!navigator.share) {
      toast.error("Sharing not supported on this browser");
      return;
    }
    
    try {
      // Create a file from the base64 QR code
      const response = await fetch(user.qr_code!);
      const blob = await response.blob();
      const file = new File([blob], "QR_Code.png", { type: "image/png" });

      await navigator.share({
        title: "My Rakshakavach QR",
        text: `Scan this to send money to ${user.name} on Rakshakavach. UPI: ${user.upi_id}`,
        files: [file],
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0a2342] to-[#1c4879] text-white px-6 pt-5 pb-8 rounded-b-[2.5rem] shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/dashboard")}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <span className="text-sm font-black tracking-widest uppercase opacity-60">
            {t("receiveMoney") || "Receive Money"}
          </span>
          <div className="w-10" />
        </div>
        <h1 className="text-2xl font-black mt-2">{t("myQRCode") || "ನನ್ನ QR ಕೋಡ್"}</h1>
      </div>

      <div className="flex-1 px-6 -mt-6 flex flex-col gap-6 pb-10">
        {/* QR Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 flex flex-col items-center border border-gray-100"
        >
          <div className="w-full flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <User size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 leading-tight">{user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5" onClick={handleCopyUPI}>
                  <p className="text-sm font-bold text-slate-500">{user.phone}</p>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <p className="text-sm font-black text-blue-600 uppercase tracking-tight">{user.upi_id}</p>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
          </div>

          {/* QR Display */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-[2.5rem] opacity-50 blur-xl group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-2xl">
              {user.qr_code ? (
                <img 
                  src={user.qr_code} 
                  alt="My QR Code" 
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                />
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <QrCode size={64} className="animate-pulse" />
                  <p className="text-sm font-bold">QR Loading...</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 px-6 py-2 bg-slate-50 rounded-2xl flex items-center gap-2 border border-slate-100">
            <ShieldCheck size={16} className="text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Safe & Secure Payments
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadQR}
            className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm hover:border-blue-200 transition-all group"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download size={28} className="text-blue-600" />
            </div>
            <span className="text-sm font-black text-slate-700">{t("download") || "ಡೌನ್‌ಲೋಡ್"}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShareQR}
            className="flex flex-col items-center justify-center gap-3 bg-slate-900 p-6 rounded-[2rem] shadow-xl hover:bg-slate-800 transition-all group shadow-blue-900/10"
          >
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 size={28} className="text-white" />
            </div>
            <span className="text-sm font-black text-white">{t("share") || "ಶೇರ್ ಮಾಡಿ"}</span>
          </motion.button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50/50 rounded-3xl p-5 border border-blue-100 flex gap-4">
          <Info className="text-blue-400 shrink-0 mt-1" size={20} />
          <p className="text-sm font-bold text-blue-900 leading-relaxed">
            {t("receiveInfo") || "ಯಾರಾದರೂ ನಿಮಗೆ ಹಣ ಕಳುಹಿಸಲು ಈ ಕೋಡ್ ಅನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಬಹುದು ಅಥವಾ ನಿಮ್ಮ ರಕ್ಷಾಕವಚ ಐಡಿಯನ್ನು ಬಳಸಬಹುದು."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Info({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
