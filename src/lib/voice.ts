/**
 * Rakshakavach Voice System
 * Comprehensive speech synthesis and number-to-words conversion for Kannada and other regional languages.
 * Optimized for rural users with slow, clear speech templates.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReady = false;

/**
 * Load and cache available voices.
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

    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      voicesReady = true;
      resolve(cachedVoices);
    };

    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      voicesReady = true;
      resolve(cachedVoices);
    }, 1000);
  });
}

/**
 * Find the best matching voice for a language code.
 * Priority: Exact match -> "kn-IN" (if forced) -> Prefix -> Google -> Name
 */
function findVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const langPrefix = langCode.split("-")[0];

  // 1. Exact match
  let match = voices.find((v) => v.lang === langCode);
  if (match) return match;

  // 2. Prefix match
  match = voices.find((v) => v.lang.startsWith(langPrefix));
  if (match) return match;

  // 3. Google voice (often higher quality)
  match = voices.find(
    (v) => v.name.toLowerCase().includes("google") && v.lang.startsWith(langPrefix)
  );
  if (match) return match;

  return null;
}

/**
 * Converts a numeric value into spoken Kannada words.
 * Examples: 200 -> "ಎರಡು ನೂರು", 1000 -> "ಸಾವಿರ"
 */
export function convertNumberToKannada(num: number): string {
  if (num === 0) return 'ಸೊನ್ನೆ';
  if (num === 100) return 'ನೂರು';
  if (num === 1000) return 'ಸಾವಿರ';

  const ones = ["", "ಒಂದು", "ಎರಡು", "ಮೂರು", "ನಾಲ್ಕು", "ಐದು", "ಆರು", "ಏಳು", "ಎಂಟು", "ಒಂಬತ್ತು"];
  const tens = ["", "ಹತ್ತು", "ಇಪ್ಪತ್ತು", "ಮೂವತ್ತು", "ನಲವತ್ತು", "ಐವತ್ತು", "ಅರವತ್ತು", "ಎಪ್ಪತ್ತು", "ಎಂಬತ್ತು", "ತೊಂಬತ್ತು"];
  const teens = ["ಹತ್ತು", "ಹನ್ನೊಂದು", "ಹನ್ನೆರಡು", "ಹದಿಮೂರು", "ಹದಿನಾಲ್ಕು", "ಹದಿನೈದು", "ಹದಿನಾರು", "ಹದಿನೇಳು", "ಹದಿನೆಂಟು", "ಹತ್ತೊಂಬತ್ತು"];

  const build = (n: number): string => {
    let res = "";
    if (n >= 10000000) {
      res += build(Math.floor(n / 10000000)) + " ಕೋಟಿ ";
      n %= 10000000;
    }
    if (n >= 100000) {
      res += build(Math.floor(n / 100000)) + " ಲಕ್ಷ ";
      n %= 100000;
    }
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      res += (thousands === 1 ? "" : build(thousands)) + " ಸಾವಿರ ";
      n %= 1000;
    }
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      res += (hundreds === 1 ? "ನೂರು " : build(hundreds) + " ನೂರು ");
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
 * Converts a numeric value into spoken Kannada words (Phonetic version for English TTS).
 * Examples: 200 -> "Eradu Nooru", 1000 -> "Saavira"
 */
export function convertNumberToKannadaPhonetic(num: number): string {
  if (num === 0) return 'Sonne';
  if (num === 100) return 'Nooru';
  if (num === 1000) return 'Saavira';

  const ones = ["", "Ondu", "Eradu", "Mooru", "Naalku", "Aidu", "Aaru", "Elu", "Entu", "Ombattu"];
  const tens = ["", "Hattu", "Ippattu", "Moovattu", "Nalavattu", "Aivattu", "Aravattu", "Eppattu", "Embattu", "Tombattu"];
  const teens = ["Hattu", "Hannondu", "Hanneradu", "Hadimooru", "Hadinaalku", "Hadinaidu", "Hadinaaru", "Hadinaelu", "Hadineerantu", "Hatombattu"];

  const build = (n: number): string => {
    let res = "";
    if (n >= 10000000) { res += build(Math.floor(n / 10000000)) + " Koti "; n %= 10000000; }
    if (n >= 100000) { res += build(Math.floor(n / 100000)) + " Laksha "; n %= 100000; }
    if (n >= 1000) { 
      const thousands = Math.floor(n / 1000);
      res += (thousands === 1 ? "" : build(thousands)) + " Saavira ";
      n %= 1000;
    }
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      res += (hundreds === 1 ? "Nooru " : build(hundreds) + " Nooru ");
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
 * Phonetic mapping for common Kannada sentences to support devices without native Kannada TTS.
 */
function toPhonetic(text: string): string {
  return text
    .replace(/ನೀವು/g, "Neevu")
    .replace(/ಅನ್ನು/g, "annu")
    .replace(/ರೂಪಾಯಿಗಳನ್ನು/g, "Rupaayigalannu")
    .replace(/ಅವರಿಗೆ/g, "avarige")
    .replace(/ಕಳುಹಿಸುತ್ತಿದ್ದೀರಿ/g, "kaluhisuttiddeeri")
    .replace(/ದೃಢೀಕರಿಸಲು/g, "drudheekarisalu")
    .replace(/ಬಟನ್/g, "button")
    .replace(/ಒತ್ತಿ/g, "otti")
    .replace(/ರಕ್ಷಾಕವಚ ಗೆ ಸ್ವಾಗತ/g, "Rakshakavachage swaagata")
    .replace(/ನಿಮ್ಮ ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ/g, "Nimma login yashasviyaagide")
    .replace(/ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಾಲ್ಕು ಅಂಕಿಯ ಪಿನ್ ನಮೂದಿಸಿ/g, "Dayavittu nimma naalku ankiya PIN namoodisi")
    .replace(/ವ್ಯವಹಾರ ಯಶಸ್ವಿಯಾಗಿದೆ/g, "Vyavahaara yashasviyaagide")
    .replace(/ಕ್ಷಮಿಸಿ, ಬ್ಯಾಲೆನ್ಸ್ ಇಲ್ಲ/g, "Kshamisi, balance illa");
}

/**
 * Primary speech synthesis function.
 */
export async function speak(text: string, langCode: string = "kn-IN", rate: number = 0.85): Promise<void> {
  return new Promise(async (resolve) => {
    if (!("speechSynthesis" in window)) {
      console.error("[Voice] Speech synthesis not supported.");
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    if (!voicesReady) await loadVoices();

    const voice = findVoice(langCode);
    let finalLang = langCode;
    let finalText = text;

    // FALLBACK: If no native Kannada voice, use phonetic Kanglish with English voice
    if (langCode === "kn-IN" && !voice) {
      console.warn("[Voice] Native Kannada voice not found. Using phonetic fallback.");
      finalLang = "en-IN";
      finalText = toPhonetic(text);
    }

    const utterance = new SpeechSynthesisUtterance(finalText);
    utterance.lang = finalLang;
    
    // Even slower for phonetic fallback to ensure clarity
    if (langCode === "kn-IN" && !voice) {
      utterance.rate = Math.min(rate, 0.45); // Reduced even more for phonetic clarity
    } else {
      utterance.rate = rate;
    }
    
    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Clear slow speech for high-risk warnings or complex instructions.
 */
export function speakSlow(text: string, langCode: string = "kn-IN"): Promise<void> {
  return speak(text, langCode, 0.65);
}

/**
 * Standardized KANNADA templates for Rakshakavach.
 */
export const KANNADA_PROMPTS = {
  welcome: "ರಕ್ಷಾಕವಚ ಗೆ ಸ್ವಾಗತ",
  loginSuccess: "ನಿಮ್ಮ ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ",
  askName: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ಹೇಳಿ",
  askPin: "ನಿಮ್ಮ ನಾಲ್ಕು ಅಂಕಿಯ ಪಿನ್ ನಮೂದಿಸಿ",
  accountLocked: "ಭದ್ರತೆಯ ದೃಷ್ಟಿಯಿಂದ ನಿಮ್ಮ ಖಾತೆಯನ್ನ ಲಾಕ್ ಮಾಡಲಾಗಿದೆ",
  accountUnlocked: "ನಿಮ್ಮ ಖಾತೆ ಅನ್‌ಲಾಕ್ ಆಗಿದೆ. ಈಗ ನೀವು ಬಳಸಬಹುದು",
  transactionSuccess: "ನಿಮ್ಮ ವ್ಯವಹಾರ ಯಶಸ್ವಿಯಾಗಿದೆ",
  insufficientBalance: "ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಸಾಕಷ್ಟು ಹಣ ಇಲ್ಲ",
  fraudWarning: "ಈ ವ್ಯವಹಾರ ಅಪಾಯಕರವಾಗಿರಬಹುದು",
  
  /**
   * Template for sending money:
   * "ನೀವು {amountWords} ರೂಗಳನ್ನು {name} ಅವರಿಗೆ ಕಳುಹಿಸುತ್ತಿದ್ದೀರಿ"
   */
  sendMoneyTemplate: (amountInWords: string, name: string) => 
    `ನೀವು ${amountInWords} ರೂಗಳನ್ನು ${name} ಅವರಿಗೆ ಕಳುಹಿಸುತ್ತಿದ್ದೀರಿ. ದೃಢೀಕರಿಸಲು ಬಟನ್ ಒತ್ತಿ`,
  receiveGuidance: "ಇದು ನಿಮ್ಮ ಕ್ಯೂ ಆರ್ ಕೋಡ್. ಇದನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಹಣ ಕಳುಹಿಸಬಹುದು",
};

/**
 * Preload voices on startup.
 */
export function preloadVoices(): void {
  loadVoices().then((voices) => {
    if (voices.length > 0) {
      console.log(`[Voice] ${voices.length} voices ready.`);
    }
  });
}