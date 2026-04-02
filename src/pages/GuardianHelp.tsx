import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { speak } from "@/lib/voice";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Phone, 
  Lock, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  Send, 
  QrCode, 
  Key,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function GuardianHelp() {
  const navigate = useNavigate();
  const { t, speechCode } = useLanguage();
  const { user, setUser } = useAuth();

  const handleLockAccount = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_locked: true })
        .eq("id", user.id);

      if (error) throw error;

      setUser({ ...user, is_locked: true });
      speak(t("voiceAccountLocked"), speechCode);
      toast.error(t("accountLocked"), {
        description: t("sosBlockedMsg"),
        duration: 5000,
      });
      navigate("/emergency");
    } catch (error) {
      toast.error(t("errorOccurred"));
    }
  };

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const sections = [
    {
      id: "emergency",
      type: "emergency",
      title: t("emergencyHelpTitle"),
      icon: <ShieldAlert className="text-red-600" size={32} />,
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      items: [
        {
          label: t("lockAccountLabel"),
          description: t("helpLockAccountDesc"),
          icon: <Lock size={20} />,
          action: handleLockAccount,
          variant: "danger",
        },
        {
          label: t("customerCareLabel"),
          description: t("customerCareDesc"),
          icon: <Phone size={20} />,
          action: () => handleCall("1800-123-4567"),
          variant: "secondary",
        }
      ]
    },
    {
      id: "fraud",
      type: "fraud",
      title: t("fraudProtectionTitle"),
      icon: <AlertTriangle className="text-amber-600" size={32} />,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
      items: [
        {
          label: t("neverShareOtpLabel"),
          description: t("neverShareOtpDesc"),
          icon: <ShieldCheck size={20} className="text-amber-700" />,
        },
        {
          label: t("bewareCallsLabel"),
          description: t("bewareCallsDesc"),
          icon: <Phone size={20} className="text-amber-700" />,
        },
        {
          label: t("suspiciousTxLabel"),
          description: t("suspiciousTxDesc"),
          icon: <AlertTriangle size={20} className="text-amber-700" />,
        }
      ]
    },
    {
      id: "guardian",
      type: "guardian",
      title: t("guardianAssistTitle"),
      icon: <Users className="text-blue-600" size={32} />,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      items: [
        {
          label: t("callGuardianLabel"),
          description: t("callGuardianDesc"),
          icon: <Phone size={20} />,
          action: () => handleCall("+919876543210"),
          variant: "primary",
        },
        {
          label: t("permissionReqLabel"),
          description: t("permissionReqDesc"),
          icon: <ShieldCheck size={20} className="text-blue-700" />,
        }
      ]
    },
    {
      id: "help",
      type: "help",
      title: t("guidanceTitle"),
      icon: <BookOpen className="text-emerald-600" size={32} />,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      items: [
        {
          label: t("howToSendLabel"),
          description: t("howToSendDesc"),
          icon: <Send size={20} className="text-emerald-700" />,
        },
        {
          label: t("useQrLabel"),
          description: t("useQrDesc"),
          icon: <QrCode size={20} className="text-emerald-700" />,
        },
        {
          label: t("forgotPinLabel"),
          description: t("forgotPinDesc"),
          icon: <Key size={20} className="text-emerald-700" />,
        }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-slate-100">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h1 className="ml-2 text-xl font-extrabold text-[#0a1b28]">
          {t("guardianHelpTitle")}
        </h1>
      </div>

      <div className="px-5 pt-6 space-y-8">
        {sections.map((section, idx) => (
          <motion.section
            key={section.id}
            id={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${section.bgColor} rounded-2xl flex items-center justify-center border ${section.borderColor}`}>
                {section.icon}
              </div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {section.title}
              </h2>
            </div>

            <div className="grid gap-3">
              {section.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-slate-900 leading-tight">
                        {item.label}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  {item.action && (
                    <button
                      onClick={item.action}
                      className={`
                        w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                        ${item.variant === "danger" ? "bg-red-600 text-white shadow-lg shadow-red-100" : ""}
                        ${item.variant === "primary" ? "bg-[#096a5b] text-white shadow-lg shadow-emerald-100" : ""}
                        ${item.variant === "secondary" ? "bg-slate-100 text-slate-700" : ""}
                      `}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      {/* Trust Quote */}
      <div className="px-10 mt-10 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {t("trustVerified")}
        </p>
        <p className="text-sm font-medium text-slate-500 mt-2">
          {t("trustDesc")}
        </p>
      </div>
    </div>
  );
}
