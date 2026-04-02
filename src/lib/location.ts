// IP-based location detection

export async function getLocation(): Promise<string> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return "unknown";
    const data = await res.json();
    return data.city || data.region || "unknown";
  } catch {
    return "unknown";
  }
}
