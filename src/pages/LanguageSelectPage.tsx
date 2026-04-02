import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage, Language, LANGUAGE_CONFIG } from "@/context/LanguageContext";
import { Shield } from "lucide-react";

export default function LanguageSelectPage() {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Language>(language || "en");

  // Skip logic optional since we want to demonstrate the design
  // React.useEffect(() => {
  //   if (language) navigate("/landing", { replace: true });
  // }, [language, navigate]);

  const handleContinue = () => {
    setLanguage(selected);
    navigate("/landing");
  };

  const languages: { code: Language; name: string; native: string; description?: string }[] = [
    { code: "en", native: "English", name: "Default Language", description: "Default Language" },
    { code: "kn", native: "ಕನ್ನಡ", name: "Kannada" },
    { code: "hi", native: "हिन्दी", name: "Hindi" },
    { code: "mr", native: "मराठी", name: "Marathi" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background p-6 items-center">
      <div className="flex-1 flex flex-col items-center w-full max-w-md pt-12">
        {/* Logo */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary shadow-[0_8px_30px_rgb(15,159,142,0.3)]">
            <Shield size={48} className="text-white drop-shadow-sm" fill="currentColor" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-center mb-8 flex flex-col items-center">
          <h1 className="text-3xl font-extrabold text-[#113833] mb-2 tracking-tight">Rakshakavach</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-[240px]">
            Choose your language to protect your assets
          </p>
        </motion.div>

        {/* Language List */}
        <div className="flex flex-col gap-3 w-full mb-24">
          {languages.map((lang, idx) => (
            <motion.button
              key={lang.code}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              onClick={() => setSelected(lang.code)}
              className="relative flex items-center justify-between w-full p-5 rounded-[1.25rem] bg-card shadow-sm border border-border/50 hover:border-primary/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#a37c68] font-medium text-lg">
                  {lang.code === 'en' ? 'A' : lang.native.charAt(0)}{lang.code === 'en' ? 'A' : 'a'}
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xl font-bold text-foreground leading-tight">{lang.native}</span>
                  <span className="text-sm text-muted-foreground font-medium">{lang.description || lang.name}</span>
                </div>
              </div>
              
              {/* Radio Circle */}
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${selected === lang.code ? 'border-primary' : 'border-border'}`}>
                {selected === lang.code && (
                  <div className="h-3 w-3 rounded-full bg-primary" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-background/90 backdrop-blur-md pb-safe">
        <div className="max-w-md mx-auto w-full flex flex-col items-center gap-4">
          <button
            onClick={handleContinue}
            className="w-full bg-primary text-white font-bold text-lg rounded-2xl py-4 shadow-[0_8px_20px_rgb(15,159,142,0.3)] active:scale-95 transition-all"
          >
            Continue with {languages.find(l => l.code === selected)?.native === 'English' ? 'English' : languages.find(l => l.code === selected)?.native}
          </button>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Secured by Rakshakavach Vault
          </span>
        </div>
      </div>
    </div>
  );
}
