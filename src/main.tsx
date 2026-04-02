import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadVoices } from "./lib/voice";

// Pre-load speech synthesis voices (Chrome loads them asynchronously)
preloadVoices();

createRoot(document.getElementById("root")!).render(<App />);
