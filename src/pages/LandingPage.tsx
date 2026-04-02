import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Home, Lock, User, Menu } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#096a5b]">
            <Shield size={20} className="text-white" fill="currentColor" />
          </div>
          <span className="text-xl font-bold text-[#096a5b]">{t("appName")}</span>
        </div>
        <button className="p-2 text-foreground">
          <Menu size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-4 pt-6 gap-6">
        {/* ISO Badge */}
        <div className="flex items-center justify-center self-center bg-gray-100 rounded-full py-2 px-6 shadow-sm border border-border/50">
          <div className="w-2 h-2 rounded-full bg-primary mr-3" />
          <span className="font-bold text-sm tracking-wide text-gray-500 uppercase whitespace-pre-line text-center">
            {t("isoCertified")}
          </span>
        </div>

        {/* Hero Title */}
        <div className="text-center mt-2">
          <h1 className="text-[3rem] leading-none font-extrabold text-[#113833] tracking-tighter mb-2">
            {t("appName")}
          </h1>
          <p className="text-lg font-bold text-primary">{t("appTagline")}</p>
        </div>

        {/* Auth Buttons */}
        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={() => navigate("/auth", { state: { mode: "register" } })}
            className="w-full bg-primary text-white font-bold text-lg rounded-2xl py-[1.125rem] shadow-sm active:scale-[0.98] transition-transform"
          >
            {t("newAccount")}
          </button>
          <button
            onClick={() => navigate("/auth", { state: { mode: "login" } })}
            className="w-full bg-white text-[#943f25] border-2 border-[#943f25] font-bold text-lg rounded-2xl py-[1.125rem] active:scale-[0.98] transition-transform"
          >
            {t("login")}
          </button>
        </div>

        {/* Info Cards */}
        <div className="relative rounded-3xl overflow-hidden mt-6 h-64 bg-slate-900 shadow-md">
          <img 
            src="/encryption_banner_bg.png" 
            alt="Encryption" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a2c28]/90 via-[#0a2c28]/40 to-transparent" />
          <div className="relative z-10 p-6 flex flex-col justify-end h-full text-white">
            <h2 className="text-3xl font-extrabold leading-tight mb-2 whitespace-pre-line">{t("nextGenEncryption")}</h2>
            <p className="text-sm font-medium text-white/90 leading-snug max-w-[280px]">
              {t("encryptionDesc")}
            </p>
          </div>
        </div>

        <div className="bg-[#096a5b] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="flex flex-col gap-2 relative z-10">
            <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center mb-1">
              <Shield size={20} className="text-[#096a5b]" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-extrabold">{t("trustVerified")}</h2>
            <p className="text-sm font-medium opacity-90 leading-snug max-w-[260px]">
              {t("trustDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full h-20 bg-background/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 pb-safe z-50">
        <button className="flex flex-col items-center gap-1 text-primary">
          <div className="bg-white w-12 h-10 rounded-2xl flex items-center justify-center shadow-sm">
             <Home size={22} className="text-primary" fill="currentColor" />
          </div>
          <span className="text-[10px] font-bold">{t("homeTab")}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
          <div className="w-12 h-10 flex items-center justify-center">
             <Lock size={22} className="opacity-70" />
          </div>
          <span className="text-[10px] font-bold">{t("vaultTab")}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
          <div className="w-12 h-10 flex items-center justify-center">
             <Shield size={22} className="opacity-70" />
          </div>
          <span className="text-[10px] font-bold">{t("shieldTab")}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
          <div className="w-12 h-10 flex items-center justify-center">
             <User size={22} className="opacity-70" />
          </div>
          <span className="text-[10px] font-bold">{t("profileTab")}</span>
        </button>
      </div>
    </div>
  );
}
