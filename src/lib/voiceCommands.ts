// Voice Command Processing Engine
// Simple keyword-based matching — no AI/ML required

export type VoiceCommandType =
  | "balance"
  | "last_transaction"
  | "transaction_history"
  | "send_money"
  | "fraud_check"
  | "emergency_lock"
  | "help"
  | "unknown";

export interface ParsedCommand {
  type: VoiceCommandType;
  /** For send_money: extracted amount */
  amount?: number;
  /** For send_money: extracted receiver name/identifier */
  receiver?: string;
  /** Raw transcript */
  raw: string;
}

// Keyword maps for each command (Kannada + English fallback)
const COMMAND_KEYWORDS: { type: VoiceCommandType; keywords: string[] }[] = [
  {
    type: "balance",
    keywords: [
      // Kannada
      "ಬ್ಯಾಲೆನ್ಸ್", "ಎಷ್ಟು", "ಹಣ ಎಷ್ಟು", "ನನ್ನ ಬ್ಯಾಲೆನ್ಸ್",
      "ಬ್ಯಾಲೆನ್ಸ್ ಎಷ್ಟು", "ಬ್ಯಾಲೆನ್ಸ್ ತೋರಿಸಿ", "ಬ್ಯಾಲೆನ್ಸ್ ಪರಿಶೀಲಿಸಿ",
      // English
      "balance", "check balance", "my balance", "how much", "show balance",
    ],
  },
  {
    type: "last_transaction",
    keywords: [
      // Kannada
      "ಕೊನೆಯ ವ್ಯವಹಾರ", "ಕೊನೆಯ ಟ್ರಾನ್ಸಾಕ್ಷನ್", "ಕಡೆಯ ವ್ಯವಹಾರ",
      // English
      "last transaction", "recent transaction", "last payment",
    ],
  },
  {
    type: "transaction_history",
    keywords: [
      // Kannada
      "ವ್ಯವಹಾರಗಳನ್ನು ತೋರಿಸಿ", "ಇತಿಹಾಸ", "ವ್ಯವಹಾರ ಇತಿಹಾಸ",
      "ನನ್ನ ವ್ಯವಹಾರಗಳು", "ಟ್ರಾನ್ಸಾಕ್ಷನ್ ಹಿಸ್ಟರಿ",
      // English
      "history", "transaction history", "show transactions", "my transactions",
    ],
  },
  {
    type: "send_money",
    keywords: [
      // Kannada
      "ಕಳುಹಿಸಿ", "ಹಣ ಕಳುಹಿಸಿ", "ಕಳುಹಿಸು", "ಪಾವತಿ",
      // English
      "send", "send money", "transfer", "pay",
    ],
  },
  {
    type: "fraud_check",
    keywords: [
      // Kannada
      "ಸುರಕ್ಷಿತವೇ", "ಅಪಾಯ", "ವಂಚನೆ", "ಸೇಫ್", "ಈ ವ್ಯವಹಾರ ಸುರಕ್ಷಿತವೇ",
      // English
      "safe", "is it safe", "fraud", "check fraud", "safety", "risk",
    ],
  },
  {
    type: "emergency_lock",
    keywords: [
      // Kannada
      "ಲಾಕ್ ಮಾಡಿ", "ಖಾತೆ ಲಾಕ್", "ಖಾತೆಯನ್ನು ಲಾಕ್", "ತುರ್ತು",
      "ಎಮರ್ಜೆನ್ಸಿ", "ಬ್ಲಾಕ್",
      // English
      "lock", "lock account", "emergency", "block", "block account",
    ],
  },
  {
    type: "help",
    keywords: [
      // Kannada
      "ಸಹಾಯ", "ಹೆಲ್ಪ್", "ಏನು ಮಾಡಬಹುದು", "ಆಯ್ಕೆಗಳು",
      // English
      "help", "what can you do", "options", "commands",
    ],
  },
];

/**
 * Extract amount from Kannada/English speech text.
 * Handles digits and Kannada number words.
 */
function extractAmount(text: string): number | undefined {
  // Try to find a digit sequence
  const digitMatch = text.match(/(\d+)/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  // Kannada number words (basic)
  const kanNumMap: Record<string, number> = {
    "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5,
    "ಆರು": 6, "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9, "ಹತ್ತು": 10,
    "ನೂರು": 100, "ಸಾವಿರ": 1000,
    "ಐನೂರು": 500, "ಒಂದು ಸಾವಿರ": 1000, "ಎರಡು ಸಾವಿರ": 2000,
    "ಐದು ಸಾವಿರ": 5000, "ಹತ್ತು ಸಾವಿರ": 10000,
  };
  for (const [word, num] of Object.entries(kanNumMap)) {
    if (text.includes(word)) return num;
  }

  // English number words
  const enNumMap: Record<string, number> = {
    "hundred": 100, "thousand": 1000, "five hundred": 500,
    "one thousand": 1000, "two thousand": 2000, "five thousand": 5000,
    "ten thousand": 10000,
  };
  const lower = text.toLowerCase();
  for (const [word, num] of Object.entries(enNumMap)) {
    if (lower.includes(word)) return num;
  }

  return undefined;
}

/**
 * Extract receiver name from send money command.
 * Looks for text after amount or around "ಗೆ" (to) in Kannada.
 */
function extractReceiver(text: string): string | undefined {
  // Kannada: "500 ರಮೇಶ್ಗೆ ಕಳುಹಿಸಿ" (Send 500 to Ramesh) or "9876543210 ಗೆ 500 ಕಳುಹಿಸಿ" (Send 500 to 9876543210)
  // Look for word before "ಗೆ" suffix
  const kanReceiverMatch = text.match(/(\S+?)ಗೆ/);
  if (kanReceiverMatch) {
    const rawMatch = kanReceiverMatch[1].trim();
    // If it's a 10-digit phone number, return it as is
    if (/^\d{10}$/.test(rawMatch)) return rawMatch;
    // Otherwise, strip digits for names
    const name = rawMatch.replace(/\d+/g, "").trim();
    if (name.length > 0) return name;
  }

  // English: "send 500 to ramesh" or "pay ramesh 500"
  const lower = text.toLowerCase();
  const toMatch = lower.match(/to\s+(\w+)/);
  if (toMatch) return toMatch[1];

  // "pay <name>"
  const payMatch = lower.match(/(?:pay|send to)\s+(\w+)/);
  if (payMatch) return payMatch[1];

  return undefined;
}

/**
 * Parse a voice transcript into a structured command.
 */
export function parseVoiceCommand(rawText: string): ParsedCommand {
  const text = rawText.trim();
  const textLower = text.toLowerCase();

  // Try to match commands - check longer/more specific keywords first
  // Sort by keyword length descending for best match
  for (const entry of COMMAND_KEYWORDS) {
    const sortedKeywords = [...entry.keywords].sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
      if (text.includes(keyword) || textLower.includes(keyword.toLowerCase())) {
        const parsed: ParsedCommand = { type: entry.type, raw: text };

        // If send_money, extract amount and receiver
        if (entry.type === "send_money") {
          parsed.amount = extractAmount(text);
          parsed.receiver = extractReceiver(text);
        }

        return parsed;
      }
    }
  }

  return { type: "unknown", raw: text };
}
