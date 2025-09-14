import React, { useEffect, useRef, useState } from 'react';

export default function ViewportMount({
  children,
  rootMargin = '600px 0px',
  once = false,
}: {
  children: React.ReactNode;
  rootMargin?: string;
  once?: boolean; // if true, keep mounted once it appeared
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let mounted = true;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!mounted) return;
        if (e.isIntersecting) {
          setVisible(true);
          if (once) {
            io.disconnect();
          }
        } else if (!once) {
          setVisible(false);
        }
      },
      { root: null, rootMargin }
    );
    io.observe(el);
    return () => {
      mounted = false;
      io.disconnect();
    };
  }, [rootMargin, once]);

  return <div ref={ref} aria-hidden={!visible}>{visible ? children : <div style={{minHeight: 40}} />}</div>;
}
