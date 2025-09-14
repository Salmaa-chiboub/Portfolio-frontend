import React, { useEffect, useState } from "react";

export type TypePart = { text: string; className?: string };

export default function Typewriter({
  parts,
  speed = 60,
  cursor = true,
  startDelay = 200,
}: {
  parts: TypePart[];
  speed?: number; // ms per char
  cursor?: boolean;
  startDelay?: number;
}) {
  const [visible, setVisible] = useState(0);
  const fullText = parts.map((p) => p.text).join("");
  const total = fullText.length;
  const [showCursor, setShowCursor] = useState(cursor);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // reveal all immediately and hide cursor for reduced motion
      setVisible(total);
      setShowCursor(false);
      return;
    }

    let mounted = true;
    let i = 0;
    let interval: number | null = null;

    const start = () => {
      if (!mounted) return;
      interval = window.setInterval(() => {
        i += 1;
        if (!mounted) return;
        setVisible(i);
        if (i >= total) {
          if (interval) window.clearInterval(interval);
          // hide cursor shortly after finishing
          window.setTimeout(() => {
            if (mounted) setShowCursor(false);
          }, 700);
        }
      }, speed);
    };

    const timeout = window.setTimeout(start, startDelay);
    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(parts)]);

  // render parts taking into account visible count
  let remaining = visible;
  return (
    <span className="typewriter inline-block">
      {parts.map((p, idx) => {
        const len = p.text.length;
        const take = Math.max(0, Math.min(len, remaining));
        const out = p.text.slice(0, take);
        remaining = Math.max(0, remaining - take);
        return (
          <span key={idx} className={p.className}>
            {out}
          </span>
        );
      })}
      {showCursor && (
        <span
          aria-hidden
          className="ml-1 align-middle inline-block w-[8px] h-[1.1em] bg-current animate-blink"
          style={{ verticalAlign: "middle" }}
        />
      )}
    </span>
  );
}
