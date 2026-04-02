import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, LockKeyhole, Mic } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface PinInputProps {
  onComplete: (pin: string) => void;
  label?: string;
}

export function PinInput({ onComplete, label = "PIN ನಮೂದಿಸಿ" }: PinInputProps) {
  const [pin, setPin] = useState<string>("");
  const [isListeningPin, setIsListeningPin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t, speechCode } = useLanguage();

  const handleSpeakPin = () => {
    if (isProcessing) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t("voiceNotAvailable") || "Voice not available"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = speechCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListeningPin(true);
    recognition.onend = () => setIsListeningPin(false);
    recognition.onerror = () => setIsListeningPin(false);

    recognition.onresult = (event: any) => { 
      const text = Array.from(event.results)
        .map((res: any) => res[0].transcript)
        .join("");
      const num = text.replace(/\D/g, "").slice(0, 4);
      if(num) {
         setPin(num);
         if (num.length >= 4 && !isProcessing) {
            setIsProcessing(true);
            recognition.stop();
            setTimeout(() => {
              onComplete(num);
              setIsProcessing(false);
              setPin(""); // Clear after completion
            }, 250);
         }
      }
    };
    recognition.start();
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isProcessing) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setIsProcessing(true);
        setTimeout(() => {
          onComplete(newPin);
          setIsProcessing(false);
          setPin(""); // Clear after completion
        }, 250);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <h2 className="text-2xl font-extrabold text-[#0a1b28] mb-8 flex items-center justify-center gap-3">
         <LockKeyhole className="text-primary" size={28} /> {label}
      </h2>
      
      {/* Visual PIN Slots */}
      <div className="flex gap-4 mb-12">
        {[0, 1, 2, 3].map((index) => {
          const isActive = pin.length === index;
          const hasValue = index < pin.length;
          
          return (
            <motion.div
              key={index}
              animate={isActive ? { scale: 1.1, borderColor: "#096a5b" } : { scale: 1, borderColor: hasValue ? "#096a5b" : "#e2e8f0" }}
              className={`flex items-center justify-center h-16 w-16 rounded-2xl border-2 shadow-sm transition-all duration-200 ${
                isActive ? "ring-4 ring-[#096a5b]/20 bg-white" : "bg-white"
              } ${hasValue ? "bg-[#096a5b]/5 border-[#096a5b]" : ""}`}
            >
              <AnimatePresence>
                {hasValue && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="w-4 h-4 rounded-full bg-[#0a1b28]"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Custom Numeric Keypad */}
      <div className="grid grid-cols-3 gap-5 w-full px-4 max-w-[320px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(String(num))}
            className="flex items-center justify-center bg-white text-3xl font-extrabold text-[#0a1b28] h-[72px] rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-90 active:bg-gray-50 transition-all hover:-translate-y-1"
          >
            {num}
          </button>
        ))}
        {/* Placeholder for alignment (empty left slot) */}
        <div />
        
        <button
          onClick={() => handleKeyPress("0")}
          className="flex items-center justify-center bg-white text-3xl font-extrabold text-[#0a1b28] h-[72px] rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-90 active:bg-gray-50 transition-all hover:-translate-y-1"
        >
          0
        </button>
        
        <button
          onClick={handleBackspace}
          className="flex items-center justify-center bg-transparent text-[#97a3b6] h-[72px] rounded-[24px] active:scale-90 active:bg-gray-100 transition-all hover:-translate-y-1"
        >
          <Delete size={36} />
        </button>
      </div>

      {/* Voice to text */}
      <div className="flex flex-col items-center mt-10">
        <button onClick={handleSpeakPin} className="text-[11px] font-bold tracking-wider text-[#5a6a7e] uppercase mb-6 bg-[#f4f7f9] px-6 py-2.5 rounded-full active:scale-95 transition-transform">
          {isListeningPin ? t("loading") || "Listening..." : t("speakPin") || "Or speak your PIN"}
        </button>
        <button 
          onClick={handleSpeakPin} 
          className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgb(15,159,142,0.3)] active:scale-95 transition-all outline-none ${
            isListeningPin ? "bg-red-500 scale-110 shadow-[0_8px_30px_rgba(239,68,68,0.4)]" : "bg-[#096a5b]"
          }`}
        >
          {isListeningPin && <span className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />}
          <Mic size={32} className="text-white relative z-10" />
        </button>
      </div>
    </div>
  );
}
