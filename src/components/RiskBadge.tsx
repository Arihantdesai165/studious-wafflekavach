import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { RiskLevel } from "@/lib/fraud";
import { useLanguage } from "@/context/LanguageContext";

interface RiskBadgeProps {
  level: RiskLevel;
  reasons?: string[];
}

export function RiskBadge({ level, reasons = [] }: RiskBadgeProps) {
  const { t } = useLanguage();

  const config = {
    low: { icon: CheckCircle, label: t("safe"), className: "bg-safe/10 text-safe border-safe/30" },
    medium: { icon: AlertTriangle, label: t("caution"), className: "bg-warning/10 text-warning border-warning/30" },
    high: { icon: XCircle, label: t("danger"), className: "bg-danger/10 text-danger border-danger/30" },
  };

  const { icon: Icon, label, className } = config[level];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border-2 p-4 ${className}`}>
      <div className="flex items-center gap-3 text-lg font-bold"><Icon size={28} /> {label}</div>
      {reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-base">
          {reasons.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
      )}
    </motion.div>
  );
}
