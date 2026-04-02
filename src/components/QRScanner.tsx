import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Success
        scanner.clear();
        onScan(decodedText);
      },
      (errorMessage) => {
        // Error (usually just "no QR code found in frame")
        // We don't want to toast this every second
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [onScan]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">Scan QR Code</p>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest leading-none mt-0.5">Rakshakavach Secure</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6">
          <div id="qr-reader" className="w-full overflow-hidden rounded-3xl border-4 border-slate-100 bg-slate-50" />
          
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <Zap size={16} className="text-blue-500 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-600">Alining QR inside box</p>
            </div>

            <p className="text-center text-sm font-bold text-slate-500 leading-relaxed max-w-[80%]">
              Scan any Rakshakavach QR code to instantly start a transaction.
            </p>
          </div>
        </div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-50 p-4 border-t border-red-100 flex items-center gap-3"
            >
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-red-600">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-white/40 text-xs font-black uppercase tracking-[0.2em]"
      >
        ISO 27001 Certified Security
      </motion.p>
    </motion.div>
  );
}
