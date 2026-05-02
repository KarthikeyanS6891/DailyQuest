"use client";

import { AnimatePresence, motion } from "framer-motion";

const COLORS = ["#7c5cff", "#f5b400", "#22c55e", "#ec4899", "#38bdf8"];

export function Confetti({ show, originX = 50, originY = 50 }: { show: boolean; originX?: number; originY?: number }) {
  return (
    <AnimatePresence>
      {show ? (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 22 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.6;
            const dist = 120 + Math.random() * 180;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            const color = COLORS[i % COLORS.length];
            const rot = (Math.random() - 0.5) * 540;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
                animate={{ x: dx, y: dy, opacity: 0, rotate: rot, scale: 1 }}
                transition={{ duration: 0.9 + Math.random() * 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  left: `${originX}%`,
                  top: `${originY}%`,
                  width: 8,
                  height: 12,
                  background: color,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${color}88`,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
