"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { redeemAction } from "@/app/(app)/rewards/actions";
import { Confetti } from "./Confetti";
import { cn } from "@/lib/cn";

export type ClientReward = {
  id: string;
  title: string;
  emoji: string;
  cost: number;
  description: string;
  kind: "self" | "real";
};

export function RewardCard({ reward, balance }: { reward: ClientReward; balance: number }) {
  const [pending, start] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const affordable = balance >= reward.cost;
  const pct = Math.min(1, balance / reward.cost);

  return (
    <motion.button
      layout
      whileHover={affordable ? { y: -2 } : {}}
      whileTap={affordable ? { scale: 0.98 } : {}}
      disabled={!affordable || pending}
      onClick={() => {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1200);
        start(async () => {
          const res = await redeemAction(reward.id);
          if (!res.ok && res.message) {
            setError(res.message);
            setTimeout(() => setError(null), 2400);
          }
        });
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition",
        affordable
          ? "border-brand/30 bg-gradient-to-br from-surface to-surface2 hover:border-brand hover:shadow-glow"
          : "border-border bg-surface opacity-80",
      )}
    >
      <Confetti show={celebrate && affordable} originX={50} originY={40} />
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl text-2xl",
          affordable ? "bg-brand/15" : "bg-tint/[0.04]",
        )}>
          {reward.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{reward.title}</h3>
            {reward.kind === "real" ? (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">PRO</span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{reward.description}</p>
        </div>
        <div className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold",
          affordable ? "bg-brand text-white" : "bg-tint/[0.04] text-muted",
        )}>
          {affordable ? <Sparkles size={11} /> : <Lock size={11} />}
          {reward.cost}
        </div>
      </div>

      {!affordable ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{balance} / {reward.cost} xp</span>
            <span>{reward.cost - balance} to unlock</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full bg-gradient-to-r from-brand to-accent"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-success">Tap to redeem · {reward.kind === "self" ? "self-reward" : "fulfillment in 24h"}</div>
      )}

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-[11px] text-danger"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
