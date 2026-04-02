/**
 * In-memory OTP storage with effort tracking and Fast2SMS real-time sending
 */
const otps = new Map<string, { otp: string, expires: number, attempts: number, createdAt: number }>();

const OTP_EXPIRY_MINUTES = 2; // Per user requirement
const MAX_ATTEMPTS = 3;
const RESEND_DELAY_SECONDS = 30;

function generateOTP() {
  // Generate random 6-digit OTP (AuthPage uses 6 digits)
  // Let's change this to 6-digits to match our updated AuthPage UI
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(phone: string) {
  const existing = otps.get(phone);
  
  // Check resend delay
  if (existing && Date.now() - existing.createdAt < RESEND_DELAY_SECONDS * 1000) {
    const remaining = Math.ceil((RESEND_DELAY_SECONDS * 1000 - (Date.now() - existing.createdAt)) / 1000);
    return { error: `Please wait ${remaining} seconds before resending OTP` };
  }

  const otp = generateOTP();
  const data = {
    otp,
    expires: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    createdAt: Date.now()
  };
  
  otps.set(phone, data);
  console.log(`[OTP DEBUG] Intended for ${phone}: ${otp}`);

  // Send real OTP via Fast2SMS
  const apiKey = import.meta.env.VITE_FAST2SMS_API_KEY;
  
  if (!apiKey) {
    console.warn("FAST2SMS API Key missing. Falling back to console only.");
    return { data: otp, resendIn: RESEND_DELAY_SECONDS };
  }

  try {
    const response = await fetch("/api/fast2sms", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "q",
        message: `Your Rakshakavach OTP is ${otp}`,
        flash: 0,
        numbers: phone
      })
    });

    const result = await response.json();
    if (!response.ok || result.return === false) {
      console.error("Fast2SMS API Error:", result);
      // Fallback to alert if account is restricted so dev isn't blocked
      alert(`[Demo Mode Fallback] OTP is: ${otp}\n\nFast2SMS Error: ${result.message}`);
      return { success: true, resendIn: RESEND_DELAY_SECONDS }; 
    }
    
    console.log("[OTP DEBUG] Fast2SMS success:", result);
  } catch (err: any) {
    console.error("Fast2SMS fetch error:", err);
    alert(`[Demo Mode Fallback] OTP is: ${otp}\n\nNetwork Error: Could not connect to API.`);
    return { success: true, resendIn: RESEND_DELAY_SECONDS };
  }

  return { success: true, resendIn: RESEND_DELAY_SECONDS };
}

export function verifyOTP(phone: string, userOtp: string) {
  const data = otps.get(phone);
  
  if (!data) return { error: 'OTP not sent or expired. Please resend.' };
  
  if (Date.now() > data.expires) {
    otps.delete(phone);
    return { error: 'OTP expired. Please request a new one.' };
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    otps.delete(phone);
    return { error: 'Too many attempts. Please request a new OTP.' };
  }

  if (data.otp === userOtp) {
    otps.delete(phone);
    return { success: true };
  } else {
    data.attempts += 1;
    const remaining = MAX_ATTEMPTS - data.attempts;
    return { 
      error: `Invalid OTP. ${remaining} attempts remaining.`,
      attemptsLeft: remaining 
    };
  }
}

export { RESEND_DELAY_SECONDS };
