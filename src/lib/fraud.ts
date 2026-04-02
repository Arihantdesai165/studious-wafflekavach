// Simple rule-based fraud detection engine

export type RiskLevel = "low" | "medium" | "high";

interface FraudCheckInput {
  amount: number;
  currentLocation: string | null;
  lastLocation: string | null;
  recentTransactionCount: number; // in last hour
}

export function assessRisk(input: FraudCheckInput): {
  level: RiskLevel;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  // Rule 1: High amount
  if (input.amount > 15000) {
    score += 5;
    reasons.push("ಭಾರಿ ಮೊತ್ತ (₹15,000+)");
  } else if (input.amount > 5000) {
    score += 3;
    reasons.push("ದೊಡ್ಡ ಮೊತ್ತ (₹5000+)");
  }

  // Rule 2: Location changed
  if (
    input.currentLocation &&
    input.lastLocation &&
    input.currentLocation !== input.lastLocation
  ) {
    score += 2;
    reasons.push("ಸ್ಥಳ ಬದಲಾಗಿದೆ");
  }

  // Rule 3: Rapid transactions
  if (input.recentTransactionCount >= 3) {
    score += 2;
    reasons.push("ತ್ವರಿತ ವ್ಯವಹಾರಗಳು");
  }

  let level: RiskLevel = "low";
  if (score >= 4) level = "high";
  else if (score >= 2) level = "medium";

  return { level, reasons };
}
