// Voice system for multi-language speech synthesis and recognition

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReady = false;

/**
 * Load and cache available voices. Must be called to ensure voices are ready.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      voicesReady = true;
      resolve(voices);
      return;
    }

    // Chrome loads voices async â€” wait for the event
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      voicesReady = true;
      resolve(cachedVoices);
    };

    // Timeout fallback â€” don't wait forever
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      voicesReady = true;
      resolve(cachedVoices);
    }, 1000);
  });
}

/**
 * Find the best matching voice for a language code like "kn-IN".
 * Priority: exact match â†’ language prefix match â†’ Google voice â†’ any match.
 */
function findVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const langPrefix = langCode.split("-")[0]; // "kn", "hi", "mr", "en"

  // 1. Exact match (e.g., "kn-IN")
  let match = voices.find((v) => v.lang === langCode);
  if (match) return match;

  // 2. Prefix match (e.g., starts with "kn")
  match = voices.find((v) => v.lang.startsWith(langPrefix));
  if (match) return match;

  // 3. Google-hosted voice with language prefix (often higher quality)
  match = voices.find(
    (v) => v.name.toLowerCase().includes("google") && v.lang.startsWith(langPrefix)
  );
  if (match) return match;

  // 4. Any voice containing the language name
  const langNames: Record<string, string[]> = {
    kn: ["kannada"],
    hi: ["hindi"],
    mr: ["marathi"],
    en: ["english"],
  };
  const names = langNames[langPrefix] || [];
  match = voices.find((v) =>
    names.some((n) => v.name.toLowerCase().includes(n))
  );
  if (match) return match;

  return null;
}

/**
 * Converts a numeric value into spoken Kannada words.
 * Handles numbers up to 99,99,99,999 (99 Crores).
 */
export function convertNumberToKannada(num: number): string {
  if (num === 0) return "à²¸à³Šà²¨à³à²¨à³†";
  
  const ones = ["", "à²’à²‚à²¦à³", "à²Žà²°à²¡à³", "à²®à³‚à²°à³", "à²¨à²¾à²²à³à²•à³", "à²à²¦à³", "à²†à²°à³", "à²à²³à³", "à²Žà²‚à²Ÿà³", "à²’à²‚à²¬à²¤à³à²¤à³"];
  const tens = ["", "à²¹à²¤à³à²¤à³", "à²‡à²ªà³à²ªà²¤à³à²¤à³", "à²®à³‚à²µà²¤à³à²¤à³", "à²¨à²²à²µà²¤à³à²¤à³", "à²à²µà²¤à³à²¤à³", "à²…à²°à²µà²¤à³à²¤à³", "à²Žà²ªà³à²ªà²¤à³à²¤à³", "à²Žà²‚à²¬à²¤à³à²¤à³", "à²¤à³Šà²‚à²¬à²¤à³à²¤à³"];
  const teens = ["à²¹à²¤à³à²¤à³", "à²¹à²¨à³à²¨à³Šà²‚à²¦à³", "à²¹à²¨à³à²¨à³†à²°à²¡à³", "à²¹à²¦à²¿à²®à³‚à²°à³", "à²¹à²¦à²¿à²¨à²¾à²²à³à²•à³", "à²¹à²¦à²¿à²¨à³ˆà²¦à³", "à²¹à²¦à²¿à²¨à²¾à²°à³", "à²¹à²¦à²¿à²¨à³‡à²³à³", "à²¹à²¦à²¿à²¨à³†à²‚à²Ÿà³", "à²¹à²¤à³à²¤à³Šà²‚à²¬à²¤à³à²¤à³"];

  const build = (n: number, isRecursive = false): string => {
    let res = "";
    if (n >= 10000000) {
      res += build(Math.floor(n / 10000000)) + " à²•à³‹à²Ÿà²¿ ";
      n %= 10000000;
    }
    if (n >= 100000) {
      res += build(Math.floor(n / 100000)) + " à²²à²•à³à²· ";
      n %= 100000;
    }
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      res += (thousands === 1 ? "" : build(thousands)) + " à²¸à²¾à²µà²¿à²° ";
      n %= 1000;
    }
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      res += (hundreds === 1 ? "à²¨à³‚à²°à³ " : build(hundreds) + " à²¨à³‚à²°à³ ");
      n %= 100;
    }
    if (n >= 20) {
      res += tens[Math.floor(n / 10)];
      if (n % 10 > 0) res += " " + ones[n % 10];
    } else if (n >= 10) {
      res += teens[n - 10];
    } else if (n > 0) {
      res += ones[n];
    }
    return res.trim();
  };

  return build(num);
}

/**
 * Speak text using Web Speech Synthesis API.
 * @param text     - The text to speak
 * @param langCode - BCP-47 language code ("kn-IN", "hi-IN", "mr-IN", "en-IN")
 * @param rate     - Speech rate. Default 0.85 (clear/natural).
 */
export function speak(text: string, langCode: string = "kn-IN", rate: number = 0.85): Promise<void> {
  return new Promise(async (resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    // Always cancel previous speech to prevent overlapping and queue buildup
    window.speechSynthesis.cancel();

    // Ensure voices are loaded first
    if (!voicesReady) {
      await loadVoices();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Force Kannada voice if langCode starts with 'kn'
    const voice = findVoice(langCode);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang; 
      console.log(`[Voice] Using voice: ${voice.name} (${voice.lang})`);
    } else {
      console.warn(`[Voice] No voice found for ${langCode}. Falling back to system default.`);
      // If we are forcing Kannada but no voice is found, we still keep the text as Kannada.
      // Most modern browsers/OSs will try to find a matching engine.
      utterance.lang = langCode; 
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.warn("[Voice] Speech error:", e);
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak text slowly and clearly â€” designed for rural/low-literacy users.
 * Uses a very slow speech rate (0.6) so each word is crystal clear.
 */
export function speakSlow(text: string, langCode: string = "kn-IN"): Promise<void> {
  return speak(text, langCode, 0.6);
}

export function listenForSpeech(langCode: string = "kn-IN"): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error("Speech recognition not supported"));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      resolve(event.results[0][0].transcript);
    };
    recognition.onerror = (event: any) => {
      reject(new Error(event.error));
    };
    recognition.onend = () => {};
    recognition.start();
  });
}

/**
 * Pre-load speech synthesis voices. Call at app startup.
 */
export function preloadVoices(): void {
  loadVoices().then((voices) => {
    if (voices.length > 0) {
      console.log(`[Voice] ${voices.length} voices loaded.`);
    }
  });
}

/**
 * Structured KANNADA voice templates for standardizing app behavior.
 */
export const KANNADA_PROMPTS = {
  welcome: "à²°à²•à³à²·à²¾à²•à²µà²š à²—à³† à²¸à³à²µà²¾à²—à²¤",
  loginSuccess: "à²¨à²¿à²®à³à²® à²²à²¾à²—à²¿à²¨à³ à²¯à²¶à²¸à³à²µà²¿à²¯à²¾à²—à²¿à²¦à³†",
  askName: "à²¦à²¯à²µà²¿à²Ÿà³à²Ÿà³ à²¨à²¿à²®à³à²® à²¹à³†à²¸à²°à³ à²¹à³‡à²³à²¿",
  askPin: "à²¨à²¿à²®à³à²® à²¨à²¾à²²à³à²•à³ à²…à²‚à²•à²¿à²¯ à²ªà²¿à²¨à³ à²¨à²®à³‚à²¦à²¿à²¸à²¿",
  accountLocked: "à²­à²¦à³à²°à²¤à³†à²¯ à²¦à³ƒà²·à³à²Ÿà²¿à²¯à²¿à²‚à²¦ à²¨à²¿à²®à³à²® à²–à²¾à²¤à³†à²¯à²¨à³à²¨à³ à²²à²¾à²•à³ à²®à²¾à²¡à²²à²¾à²—à²¿à²¦à³†",
  accountUnlocked: "à²¨à²¿à²®à³à²® à²–à²¾à²¤à³† à²…à²¨à³â€Œà²²à²¾à²•à³ à²†à²—à²¿à²¦à³†. à²ˆà²— à²¨à³€à²µà³ à²¬à²³à²¸à²¬à²¹à³à²¦à³",
  transactionSuccess: "à²¨à²¿à²®à³à²® à²µà³à²¯à²µà²¹à²¾à²° à²¯à²¶à²¸à³à²µà²¿à²¯à²¾à²—à²¿à²¦à³†",
  insufficientBalance: "à²•à³à²·à²®à²¿à²¸à²¿, à²¨à²¿à²®à³à²® à²–à²¾à²¤à³†à²¯à²²à³à²²à²¿ à²¸à²¾à²•à²·à³à²Ÿà³ à²¹à²£ à²‡à²²à³à²²",
  fraudWarning: "à²Žà²šà³à²šà²°à²¿à²•à³†! à²ˆ à²µà³à²¯à²µà²¹à²¾à²° à²…à²ªà²¾à²¯à²•à²°à²µà²¾à²—à²¿à²°à²¬à²¹à³à²¦à³",
  
  /**
   * Template for sending money:
   * "à²¨à³€à²µà³ {amount} à²°à³‚à²—à²³à²¨à³à²¨à³ {name} à²…à²µà²°à²¿à²—à³† à²•à²³à³à²¹à²¿à²¸à³à²¤à³à²¤à²¿à²¦à³à²¦à³€à²°à²¿"
   */
  sendMoneyTemplate: (amountStr: string, name: string) => 
    `à²¨à³€à²µà³ ${amountStr} à²°à³‚à²—à²³à²¨à³à²¨à³ ${name} à²…à²µà²°à²¿à²—à³† à²•à²³à³à²¹à²¿à²¸à³à²¤à³à²¤à²¿à²¦à³à²¦à³€à²°à²¿. à²¦à³ƒà²¢à³€à²•à²°à²¿à²¸à²²à³ à²¬à²Ÿà²¨à³ à²’à²¤à³à²¤à²¿`,
};
²œà²¾à²—à²°à³‚à²•à²°à²¾à²—à²¿ à²®à³à²‚à²¦à³à²µà²°à²¿à²¯à²¿à²°à²¿",
  accountLocked: "à²–à²¾à²¤à³†à²¯à²¨à³à²¨à³ à²²à²¾à²•à³ à²®à²¾à²¡à²²à²¾à²—à²¿à²¦à³†",
  accountUnlocked: "à²–à²¾à²¤à³† à²…à²¨à³â€Œà²²à²¾à²•à³ à²†à²—à²¿à²¦à³†",
  transactionSuccess: "à²µà³à²¯à²µà²¹à²¾à²° à²¯à²¶à²¸à³à²µà²¿à²¯à²¾à²—à²¿à²¦à³†",
  insufficientBalance: "à²¸à²¾à²•à²·à³à²Ÿà³ à²¬à³à²¯à²¾à²²à³†à²¨à³à²¸à³ à²‡à²²à³à²²",
  welcome: "à²°à²•à³à²·à²¾à²•à²µà²š à²—à³† à²¸à³à²µà²¾à²—à²¤",
};
