import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, HelpCircle, Lock, Loader2 } from "lucide-react";
import { useVoiceAssistant, AssistantState } from "@/hooks/useVoiceAssistant";
import { useLanguage } from "@/context/LanguageContext";

export function VoiceAssistant() {
  const {
    state,
    transcript,
    response,
    startListening,
    stopListening,
    confirmLock,
    dismiss,
  } = useVoiceAssistant();

  const { language } = useLanguage();
  const isKannada = language === "kn";
  const panelRef = useRef<HTMLDivElement>(null);

  // Show the overlay panel when there's activity
  const isActive = state !== "idle" || transcript || response;

  // Map response types to colors
  const responseColors: Record<string, string> = {
    info: "from-blue-500/20 to-blue-600/10 border-blue-400/30",
    success: "from-emerald-500/20 to-emerald-600/10 border-emerald-400/30",
    warning: "from-amber-500/20 to-amber-600/10 border-amber-400/30",
    error: "from-red-500/20 to-red-600/10 border-red-400/30",
  };

  const responseTextColors: Record<string, string> = {
    info: "text-blue-800",
    success: "text-emerald-800",
    warning: "text-amber-800",
    error: "text-red-800",
  };

  const responseIcons: Record<string, React.ReactNode> = {
    info: <Volume2 size={20} className="text-blue-600 shrink-0" />,
    success: <Volume2 size={20} className="text-emerald-600 shrink-0" />,
    warning: <Lock size={20} className="text-amber-600 shrink-0" />,
    error: <HelpCircle size={20} className="text-red-600 shrink-0" />,
  };

  return (
    <>
      {/* === FLOATING MIC BUTTON === */}
      <AnimatePresence>
        {state === "idle" && (
          <motion.button
            key="mic-button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={startListening}
            className="fixed bottom-24 right-5 z-[80] w-16 h-16 rounded-full 
              bg-gradient-to-br from-[#096a5b] to-[#0ea88a] 
              text-white shadow-[0_8px_32px_rgba(9,106,91,0.5)] 
              flex items-center justify-center
              active:scale-90 transition-transform
              hover:shadow-[0_8px_40px_rgba(9,106,91,0.7)]"
            aria-label={isKannada ? "ಧ್ವನಿ ಸಹಾಯಕ" : "Voice Assistant"}
            id="voice-assistant-mic"
          >
            <Mic size={28} className="drop-shadow-sm" />
            {/* Subtle pulsing ring */}
            <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '3s' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* === ASSISTANT PANEL OVERLAY === */}
      <AnimatePresence>
        {isActive && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismiss}
              className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              key="panel"
              ref={panelRef}
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[90] 
                bg-white rounded-t-[2rem] shadow-[0_-16px_60px_rgba(0,0,0,0.15)] 
                px-5 pt-5 pb-8 max-h-[70vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#096a5b] to-[#0ea88a] flex items-center justify-center">
                    <Volume2 size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0a1b28]">
                      {isKannada ? "ಧ್ವನಿ ಸಹಾಯಕ" : "Voice Assistant"}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      {state === "listening" && (isKannada ? "ಕೇಳುತ್ತಿದ್ದೇನೆ..." : "Listening...")}
                      {state === "processing" && (isKannada ? "ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ..." : "Processing...")}
                      {state === "speaking" && (isKannada ? "ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ..." : "Speaking...")}
                      {state === "confirm_lock" && (isKannada ? "ದೃಢೀಕರಣ ಬೇಕು" : "Confirmation needed")}
                      {state === "idle" && (isKannada ? "ಸಿದ್ಧ" : "Ready")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Listening Indicator */}
              {state === "listening" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  <div className="relative">
                    {/* Outer pulsing rings */}
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 w-20 h-20 rounded-full bg-[#096a5b]/20"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-0 w-20 h-20 rounded-full bg-[#096a5b]/10"
                    />
                    {/* Mic button */}
                    <motion.button
                      onClick={stopListening}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 
                        text-white flex items-center justify-center z-10
                        shadow-[0_8px_30px_rgba(239,68,68,0.5)]"
                    >
                      <MicOff size={32} />
                    </motion.button>
                  </div>
                  <p className="text-sm font-bold text-[#0a1b28] animate-pulse">
                    {isKannada ? "🎙️ ಈಗ ಮಾತನಾಡಿ..." : "🎙️ Speak now..."}
                  </p>
                  
                  {/* Sound wave visualization */}
                  <div className="flex items-end gap-1 h-8">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: [4, Math.random() * 28 + 4, 4],
                        }}
                        transition={{
                          duration: 0.5 + Math.random() * 0.3,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                        className="w-1 rounded-full bg-gradient-to-t from-[#096a5b] to-[#0ea88a]"
                        style={{ minHeight: 4 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Processing */}
              {state === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={36} className="text-[#096a5b]" />
                  </motion.div>
                  <p className="text-sm font-bold text-muted-foreground">
                    {isKannada ? "ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ..." : "Processing your request..."}
                  </p>
                </motion.div>
              )}

              {/* Transcript (what the user said) */}
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 bg-gray-50 rounded-2xl p-4 border border-gray-100"
                >
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
                    {isKannada ? "ನೀವು ಹೇಳಿದ್ದು" : "You said"}
                  </p>
                  <p className="text-base font-bold text-[#0a1b28]">"{transcript}"</p>
                </motion.div>
              )}

              {/* Response */}
              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-2xl p-4 border bg-gradient-to-br ${
                    responseColors[response.type]
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {responseIcons[response.type]}
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-60">
                        {isKannada ? "ಉತ್ತರ" : "Response"}
                      </p>
                      <p className={`text-base font-bold leading-relaxed ${responseTextColors[response.type]}`}>
                        {response.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Confirm Lock Action */}
              {state === "confirm_lock" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex gap-3"
                >
                  <button
                    onClick={confirmLock}
                    className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-extrabold text-base
                      active:scale-95 transition-transform shadow-lg shadow-red-500/30"
                  >
                    {isKannada ? "✓  ಲಾಕ್ ಮಾಡಿ" : "✓ Confirm Lock"}
                  </button>
                  <button
                    onClick={dismiss}
                    className="flex-1 py-4 rounded-2xl bg-gray-100 text-[#0a1b28] font-extrabold text-base
                      active:scale-95 transition-transform"
                  >
                    {isKannada ? "✕ ರದ್ದುಮಾಡಿ" : "✕ Cancel"}
                  </button>
                </motion.div>
              )}

              {/* Quick command hints when idle */}
              {state === "idle" && !transcript && !response && (
                <div className="py-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    {isKannada ? "ಈ ಆದೇಶಗಳನ್ನು ಹೇಳಿ" : "Try saying"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(isKannada
                      ? ["ನನ್ನ ಬ್ಯಾಲೆನ್ಸ್ ಎಷ್ಟು", "ಕೊನೆಯ ವ್ಯವಹಾರ", "ಹಣ ಕಳುಹಿಸಿ", "ಸಹಾಯ"]
                      : ["My balance", "Last transaction", "Send money", "Help"]
                    ).map((cmd) => (
                      <span
                        key={cmd}
                        className="px-3 py-1.5 rounded-full bg-[#096a5b]/8 border border-[#096a5b]/15 
                          text-xs font-bold text-[#096a5b]"
                      >
                        "{cmd}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action bar at bottom */}
              {(state === "idle" || state === "speaking") && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex gap-3"
                >
                  <button
                    onClick={startListening}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-br from-[#096a5b] to-[#0ea88a] 
                      text-white font-extrabold text-base flex items-center justify-center gap-2
                      active:scale-95 transition-transform shadow-lg shadow-[#096a5b]/30"
                  >
                    <Mic size={20} />
                    {isKannada ? "ಮತ್ತೆ ಮಾತನಾಡಿ" : "Speak Again"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
