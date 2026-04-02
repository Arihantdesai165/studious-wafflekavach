import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { speak, convertNumberToKannada, KANNADA_PROMPTS } from "@/lib/voice";
import { assessRisk } from "@/lib/fraud";
import { hashPin } from "@/lib/crypto";
import { parseVoiceCommand, VoiceCommandType } from "@/lib/voiceCommands";

export type AssistantState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "confirm_lock"
  | "confirm_send";

export interface AssistantResponse {
  text: string;
  type: "info" | "success" | "warning" | "error";
  action?: VoiceCommandType;
}

export function useVoiceAssistant() {
  const { user, setUser } = useAuth();
  const { t, speechCode, language } = useLanguage();
  const navigate = useNavigate();

  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [pendingSend, setPendingSend] = useState<{ amount?: number; receiver?: string } | null>(null);
  const recognitionRef = useRef<any>(null);

  const isKannada = language === "kn";

  // Voice response helper - speaks and sets visual response
  const respond = useCallback(
    async (text: string, type: AssistantResponse["type"] = "info", action?: VoiceCommandType) => {
      setState("speaking");
      setResponse({ text, type, action });
      await speak(text, speechCode);
      setState("idle");
    },
    [speechCode]
  );

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      respond(
        isKannada ? "ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ" : "Voice recognition not available",
        "error"
      );
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognition();
    recognition.lang = speechCode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setState("listening");
      setTranscript("");
      setResponse(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleVoiceCommand(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        respond(
          isKannada ? "ಕ್ಷಮಿಸಿ, ನನಗೆ ಏನೂ ಕೇಳಿಸಿಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" : "I didn't hear anything. Please try again.",
          "error"
        );
      } else {
        respond(
          isKannada ? "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ" : "Sorry, I didn't understand",
          "error"
        );
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognition.start();
  }, [speechCode, isKannada, respond]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (state === "listening") {
      setState("idle");
    }
  }, [state]);

  // Main command handler
  const handleVoiceCommand = useCallback(
    async (text: string) => {
      if (!user) {
        respond(
          isKannada ? "ದಯವಿಟ್ಟು ಮೊದಲು ಲಾಗಿನ್ ಮಾಡಿ" : "Please login first",
          "error"
        );
        return;
      }

      setState("processing");
      const command = parseVoiceCommand(text);

      switch (command.type) {
        case "balance":
          await handleBalance();
          break;
        case "last_transaction":
          await handleLastTransaction();
          break;
        case "transaction_history":
          await handleTransactionHistory();
          break;
        case "send_money":
          await handleSendMoney(command.amount, command.receiver);
          break;
        case "fraud_check":
          await handleFraudCheck();
          break;
        case "emergency_lock":
          await handleEmergencyLock();
          break;
        case "help":
          await handleHelp();
          break;
        default:
          await respond(
            isKannada ? "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಸಹಾಯಕ್ಕಾಗಿ 'ಸಹಾಯ' ಎಂದು ಹೇಳಿ"
              : "Sorry, I didn't understand. Say 'help' for options.",
            "error"
          );
      }
    },
    [user, isKannada]
  );

  // === COMMAND HANDLERS ===

  const handleBalance = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("users").select("balance").eq("id", user.id).single();
      const balance = data?.balance ?? user.balance;
      const balanceWords = convertNumberToKannada(balance);
      await respond(
        isKannada
          ? `ನಿಮ್ಮ ಬ್ಯಾಲೆನ್ಸ್ ${balanceWords} ರೂಪಾಯಿಗಳು`
          : `Your balance is ₹${balance.toLocaleString("en-IN")}`,
        "success",
        "balance"
      );
    } catch {
      await respond(
        isKannada ? "ಬ್ಯಾಲೆನ್ಸ್ ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" : "Could not fetch balance. Please try again.",
        "error"
      );
    }
  }, [user, isKannada, respond]);

  const handleLastTransaction = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*, sender:users!transactions_sender_id_fkey(name, phone), receiver:users!transactions_receiver_id_fkey(name, phone)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!data) {
        await respond(
          isKannada ? "ಯಾವುದೇ ವ್ಯವಹಾರ ಕಂಡುಬಂದಿಲ್ಲ" : "No transactions found",
          "info"
        );
        return;
      }

      const isSender = data.sender_id === user.id;
      const otherParty = isSender ? (data as any).receiver?.name : (data as any).sender?.name;
      const amountWords = convertNumberToKannada(data.amount);

      if (isSender) {
        await respond(
          isKannada
            ? `ನೀವು ${amountWords} ರೂಪಾಯಿಗಳನ್ನು ${otherParty || ""} ಅವರಿಗೆ ಕಳುಹಿಸಿದ್ದೀರಿ`
            : `You sent ₹${data.amount.toLocaleString("en-IN")} to ${otherParty || "someone"}`,
          "info",
          "last_transaction"
        );
      } else {
        await respond(
          isKannada
            ? `ನೀವು ${amountWords} ರೂಪಾಯಿಗಳನ್ನು ${otherParty || ""} ಇಂದ ಪಡೆದಿದ್ದೀರಿ`
            : `You received ₹${data.amount.toLocaleString("en-IN")} from ${otherParty || "someone"}`,
          "info",
          "last_transaction"
        );
      }
    } catch {
      await respond(
        isKannada ? "ವ್ಯವಹಾರ ಮಾಹಿತಿ ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ" : "Could not fetch transaction details",
        "error"
      );
    }
  }, [user, isKannada, respond]);

  const handleTransactionHistory = useCallback(async () => {
    await respond(
      isKannada ? "ಇವು ನಿಮ್ಮ ವ್ಯವಹಾರಗಳು" : "Here are your transactions",
      "info",
      "transaction_history"
    );
    navigate("/history");
  }, [isKannada, respond, navigate]);

  const handleSendMoney = useCallback(
    async (amount?: number, receiver?: string) => {
      if (amount && amount > 0) {
        setPendingSend({ amount, receiver });
        const params = new URLSearchParams();
        params.set("amount", String(amount));
        if (receiver) params.set("receiver", receiver);

        const amountWords = convertNumberToKannada(amount);
        await respond(
          isKannada
            ? `${amountWords} ರೂಪಾಯಿ ಕಳುಹಿಸಲು ಸಿದ್ಧವಾಗಿದೆ. ಫಾರ್ಮ್ ತುಂಬಿಸಲಾಗುತ್ತಿದೆ`
            : `Ready to send ₹${amount}. Filling the form for you.`,
          "info",
          "send_money"
        );
        navigate(`/send?${params.toString()}`);
      } else {
        await respond(
          isKannada
            ? "ಹಣ ಕಳುಹಿಸಲು ಸಿದ್ಧವಾಗಿದೆ"
            : "Ready to send money",
          "info",
          "send_money"
        );
        navigate("/send");
      }
    },
    [isKannada, respond, navigate]
  );

  const handleFraudCheck = useCallback(async () => {
    if (!user) return;
    try {
      // Check recent transactions for risk
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .gte("created_at", new Date(Date.now() - 3600000).toISOString());

      const { data: lastTx } = await supabase
        .from("transactions")
        .select("amount, risk_level")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastTx && lastTx.risk_level !== "low") {
        await respond(
          isKannada
            ? "ಈ ವ್ಯವಹಾರದಲ್ಲಿ ಅಪಾಯ ಇರಬಹುದು. ಜಾಗರೂಕರಾಗಿರಿ"
            : "This transaction may have risk. Please be careful.",
          "warning",
          "fraud_check"
        );
      } else if ((count || 0) >= 3) {
        await respond(
          isKannada
            ? "ಕಳೆದ ಒಂದು ಗಂಟೆಯಲ್ಲಿ ಹಲವು ವ್ಯವಹಾರಗಳು ಕಂಡುಬಂದಿವೆ. ಜಾಗರೂಕರಾಗಿರಿ"
            : "Multiple transactions detected in the last hour. Be cautious.",
          "warning",
          "fraud_check"
        );
      } else {
        await respond(
          isKannada
            ? "ನಿಮ್ಮ ಖಾತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ. ಯಾವುದೇ ಅಪಾಯ ಕಂಡುಬಂದಿಲ್ಲ"
            : "Your account is safe. No risk detected.",
          "success",
          "fraud_check"
        );
      }
    } catch {
      await respond(
        isKannada ? "ಸುರಕ್ಷತಾ ಪರಿಶೀಲನೆ ಸಾಧ್ಯವಾಗಲಿಲ್ಲ" : "Could not perform safety check",
        "error"
      );
    }
  }, [user, isKannada, respond]);

  const handleEmergencyLock = useCallback(async () => {
    if (!user) return;

    // Ask for confirmation first
    setState("confirm_lock");
    await respond(
      isKannada
        ? "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಲಾಕ್ ಮಾಡಬೇಕೇ? ದೃಢೀಕರಿಸಲು ಮತ್ತೊಮ್ಮೆ 'ಲಾಕ್' ಎಂದು ಹೇಳಿ"
        : "Lock your account? Say 'lock' again to confirm.",
      "warning",
      "emergency_lock"
    );
  }, [user, isKannada, respond]);

  const confirmLock = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from("users").update({ is_locked: true }).eq("id", user.id);
      setUser({ ...user, is_locked: true });
      await respond(
        isKannada
          ? "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಲಾಕ್ ಮಾಡಲಾಗಿದೆ. ಅನ್‌ಲಾಕ್ ಮಾಡಲು PIN ಬಳಸಿ"
          : "Your account has been locked. Use your PIN to unlock.",
        "success",
        "emergency_lock"
      );
    } catch {
      await respond(
        isKannada ? "ಖಾತೆ ಲಾಕ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ" : "Could not lock account",
        "error"
      );
    }
  }, [user, setUser, isKannada, respond]);

  const handleHelp = useCallback(async () => {
    const helpText = isKannada
      ? "ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಬ್ಯಾಲೆನ್ಸ್ ತಿಳಿಯಲು 'ನನ್ನ ಬ್ಯಾಲೆನ್ಸ್ ಎಷ್ಟು' ಎಂದು ಹೇಳಿ. " +
        "ಹಣ ಕಳುಹಿಸಲು 'ಹಣ ಕಳುಹಿಸಿ' ಎಂದು ಹೇಳಿ. " +
        "ಇತಿಹಾಸ ನೋಡಲು 'ವ್ಯವಹಾರ ಇತಿಹಾಸ' ಎಂದು ಹೇಳಿ. " +
        "ಖಾತೆ ಲಾಕ್ ಮಾಡಲು 'ಖಾತೆ ಲಾಕ್ ಮಾಡಿ' ಎಂದು ಹೇಳಿ."
      : "I can help you with: Say 'my balance' to check balance. " +
        "Say 'send money' to transfer funds. " +
        "Say 'history' to see transactions. " +
        "Say 'lock account' for emergency lock.";

    await respond(helpText, "info", "help");
  }, [isKannada, respond]);

  // Dismiss / close the assistant panel
  const dismiss = useCallback(() => {
    window.speechSynthesis.cancel();
    stopListening();
    setState("idle");
    setTranscript("");
    setResponse(null);
  }, [stopListening]);

  return {
    state,
    transcript,
    response,
    startListening,
    stopListening,
    confirmLock,
    dismiss,
    pendingSend,
  };
}
