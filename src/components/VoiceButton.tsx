import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface VoiceButtonProps {
  onResult: (text: string) => void;
  label?: string;
  className?: string;
}

export function VoiceButton({ onResult, label, className = "" }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const { t, speechCode } = useLanguage();

  const displayLabel = label || t("speakName");

  const handleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t("voiceNotAvailable")); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = speechCode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event: any) => { onResult(event.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <motion.button 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }} 
      onClick={handleListen} 
      type="button"
      className={`relative flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold transition-all group overflow-hidden ${
        listening 
          ? "bg-red-500 text-white shadow-[0_8px_30px_rgba(239,68,68,0.4)]" 
          : "bg-[#096a5b]/10 text-[#096a5b] border border-[#096a5b]/20 hover:bg-[#096a5b] hover:text-white hover:shadow-[0_8px_30px_rgba(9,106,91,0.3)]"
      } ${className}`}
    >
      {/* Ripple Animation when listening */}
      {listening && (
        <span className="absolute inset-0 rounded-2xl border-4 border-white/30 animate-ping" />
      )}
      
      {/* Icon */}
      <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${listening ? 'bg-white/20' : 'bg-transparent group-hover:bg-white/20'}`}>
        {listening ? <MicOff size={22} /> : <Mic size={22} />}
      </div>
      
      <span className="relative z-10 tracking-wide">
        {listening ? t("loading") || "Listening..." : displayLabel}
      </span>
    </motion.button>
  );
}
