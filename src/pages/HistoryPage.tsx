import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { RiskLevel } from "@/lib/fraud";

interface Transaction {
  id: string; sender_id: string; receiver_id: string; amount: number;
  risk_level: RiskLevel; created_at: string;
  sender?: { name: string; phone: string }; receiver?: { name: string; phone: string };
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    async function load() {
      const { data } = await supabase.from("transactions")
        .select("*, sender:users!transactions_sender_id_fkey(name, phone), receiver:users!transactions_receiver_id_fkey(name, phone)")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false }).limit(50);
      setTransactions((data as any) || []);
      setLoading(false);
    }
    load();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col p-4">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")}
        className="mb-4 flex items-center gap-2 text-lg font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={22} /> {t("back")}
      </motion.button>

      <div className="flex items-center justify-center gap-3 mb-6">
        <Clock size={28} className="text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{t("transactionHistory")}</h2>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="flex flex-col items-center gap-4 mt-12 text-muted-foreground">
          <Clock size={48} className="opacity-30" />
          <p className="text-lg font-medium">{t("noTransactions")}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {transactions.map((tx, index) => {
          const isSender = tx.sender_id === user.id;
          return (
            <motion.div key={tx.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }} className="rounded-2xl glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isSender ? "bg-danger/10" : "bg-safe/10"}`}>
                    {isSender ? <ArrowUpRight className="text-danger" size={22} /> : <ArrowDownLeft className="text-safe" size={22} />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{isSender ? tx.receiver?.name || "?" : tx.sender?.name || "?"}</p>
                    <p className="text-sm text-muted-foreground">{isSender ? tx.receiver?.phone : tx.sender?.phone}</p>
                  </div>
                </div>
                <p className={`text-xl font-extrabold ${isSender ? "text-danger" : "text-safe"}`}>
                  {isSender ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("en-IN")}</p>
                {tx.risk_level !== "low" && (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${tx.risk_level === "high" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                    {tx.risk_level === "high" ? `🔴 ${t("risk")}` : `🟡 ${t("warning")}`}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
