import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Github, ExternalLink } from "lucide-react";

type ProjectMedia = { id: number; image: string; order: number };

type ProjectSkill = { id: number; name: string; icon?: string | null };

type Project = {
  id: number;
  title: string;
  description: string;
  media: ProjectMedia[];
  skills_list?: (string | ProjectSkill)[];
  links?: { id?: number; url: string; text?: string; order?: number }[];
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const BUILD_ID = typeof window !== "undefined" && (import.meta as any).hot
  ? String(Date.now())
  : ((import.meta as any).env?.VITE_BUILD_ID as string) || "1";

const addCacheBuster = (u: string) => {
  try {
    const url = new URL(u, typeof window !== "undefined" ? window.location.origin : "");
    url.searchParams.set("v", BUILD_ID);
    return url.toString();
  } catch {
    const sep = u.includes("?") ? "&" : "?";
    return `${u}${sep}v=${BUILD_ID}`;
  }
};

const excerpt = (s: string | null | undefined, len = 110) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > len ? t.slice(0, len - 1) + "…" : t;
};

import { getApiUrl } from "@/lib/config";
import { useProjects } from "@/hooks/use-api";

export default function ProjectsCarousel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // drag state (carousel mode)
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ active: boolean; startX: number; pointerId?: number }>({ active: false, startX: 0 });

  const navigate = useNavigate();

  // Responsive sizing & mode detection
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [screenWidth, setScreenWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);
  const base = { containerH: 620, centerW: 720, centerH: 460, sideW: 460, sideH: 340, baseX: 400, sideY: 48 };
  const scale = useMemo(() => {
    const w = viewportWidth || 1200;
    const sCenter = w / (base.centerW + 16);
    const sLayout = w / 1200;
    const s = Math.min(1, Math.max(0.5, Math.min(sCenter, sLayout)));
    return s;
  }, [viewportWidth]);
  const isListMode = screenWidth < 768; // Tailwind md breakpoint

  // List mode state
  const [visibleCount, setVisibleCount] = useState(3);
  useEffect(() => {
    if (isListMode) setVisibleCount(3);
  }, [isListMode]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.floor(entry.contentRect.width);
        setViewportWidth(cw);
      }
    });
    ro.observe(el);
    const onWin = () => { setViewportWidth(el.clientWidth || window.innerWidth); setScreenWidth(window.innerWidth); };
    window.addEventListener("resize", onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, []);

  // Use react-query projects hook
  const { data: projectsData, isLoading: loading, error } = useProjects();

  useEffect(() => {
    setProjects(Array.isArray(projectsData) ? projectsData : (projectsData && (projectsData as any).results) || []);
  }, [projectsData]);

  const ordered = useMemo(() => {
    return projects.map((p) => ({
      ...p,
      media: Array.isArray(p.media) ? [...p.media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [],
    }));
  }, [projects]);

  // Keep hooks order stable; avoid early returns before hooks. We'll hide title while loading.

  const splitTitle = (t: string) => {
    const s = (t || "").trim();
    if (!s) return { pre: "", last: "" };
    const parts = s.split(/\s+/);
    if (parts.length === 1) return { pre: parts[0], last: "" };
    const last = parts.pop() as string;
    return { pre: parts.join(" "), last };
  };

  const n = ordered.length;

  const prev = useCallback(() => {
    if (!n) return;
    setCurrentIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const next = useCallback(() => {
    if (!n) return;
    setCurrentIndex((i) => (i + 1) % n);
  }, [n]);

  const goto = useCallback((i: number) => setCurrentIndex(i), []);

  // Visible offsets: main + 1 neighbor each side (carousel)
  const offsets = useMemo(() => {
    if (n >= 3) return [-1, 0, 1];
    if (n === 2) return [0, 1];
    return [0];
  }, [n]);

  // Pointer/drag handlers (carousel)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!n || isListMode) return;
    dragRef.current.active = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.pointerId = e.pointerId;
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const delta = e.clientX - dragRef.current.startX;
    setDragX(delta);
  };

  const snapAfterDrag = (delta: number) => {
    const threshold = 80;
    if (delta <= -threshold) next();
    else if (delta >= threshold) prev();
    setDragX(0);
    setIsDragging(false);
  };

  const onPointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    snapAfterDrag(dragX);
    setTimeout(() => setIsDragging(false), 0);
  };

  // Trackpad horizontal scroll (carousel) via passive native listener
  const wheelAccum = useRef(0);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || isListMode || !n) return;
    const handler = (e: WheelEvent) => {
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!isHorizontal) return;
      wheelAccum.current += e.deltaX;
      const threshold = 120;
      if (wheelAccum.current <= -threshold) {
        next();
        wheelAccum.current = 0;
      } else if (wheelAccum.current >= threshold) {
        prev();
        wheelAccum.current = 0;
      }
    };
    el.addEventListener('wheel', handler, { passive: true });
    return () => el.removeEventListener('wheel', handler);
  }, [isListMode, n, currentIndex]);

  if (!loading && (error || n === 0)) return null;

  const centerW = Math.round(base.centerW * scale);
  const centerH = Math.round(base.centerH * scale);
  const sideW = Math.round(base.sideW * scale);
  const sideH = Math.round(base.sideH * scale);
  const dx = Math.round(base.baseX * scale);
  const sideY = Math.round(base.sideY * scale);
  const padding = Math.max(8, Math.round(16 * scale));
  const neededForSides = sideH + sideY + padding;
  const neededForCenter = centerH + padding;
  const containerH = Math.max(neededForCenter, neededForSides);

  return (
    <section id="project" className="py-12 lg:py-16 bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 space-y-6 lg:space-y-0">
          {n > 0 && (
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-lufga font-bold leading-tight max-w-2xl">
              <span className="text-gray-text">Let’s have a look at my </span>
              <span className="text-orange">Projects</span>
            </h2>
          )}
        </div>

        <div
          ref={viewportRef}
          className={`relative w-full flex flex-col items-center ${isListMode ? "gap-6" : "gap-1"} py-8 sm:py-10 px-4 sm:px-10 lg:px-16 select-none ${isListMode ? "touch-pan-y" : "touch-pan-x"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {isListMode ? (
            <div className="w-full max-w-3xl mx-auto">
              {loading ? null : (
                <div className="w-full space-y-6">
                  {ordered.slice(0, visibleCount).map((project) => {
                    const primaryImage = project?.media?.[0]?.image || "/project-placeholder.svg";
                    return (
                      <div key={project.id} className="w-full">
                        <button
                          className="block w-full text-left"
                          onClick={() => navigate(`/projects/${project.id}`, { state: { project } })}
                          aria-label={`Open ${project.title}`}
                        >
                          <div className="relative w-full h-72 rounded-[20px] overflow-hidden bg-white shadow-[0_4px_55px_0_rgba(0,0,0,0.05)]">
                            <img
                              src={addCacheBuster(primaryImage)}
                              alt={project.title}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                if (img.src.includes("project-placeholder.svg")) return;
                                img.onerror = null;
                                img.src = "/project-placeholder.svg";
                              }}
                            />
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/25 to-black/50" />


                            {/* Glass morphism content */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10 backdrop-blur-[12.5px] bg-black/40 rounded-[32px] min-h-[200px]">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h3 className="font-lufga font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-3 leading-tight truncate project-card-title">
                                    {(() => {
                                      const parts = splitTitle(project.title);
                                      return (
                                        <>
                                          <span className="text-white">{parts.pre && parts.pre + (parts.last ? ' ' : '')}</span>
                                          <span className="text-orange">{parts.last}</span>
                                        </>
                                      );
                                    })()}
                                  </h3>
                                  <p className="font-lufga text-sm text-orange-lighter leading-relaxed line-clamp-3">
                                    {excerpt(project.description, 140)}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 flex flex-wrap gap-2 justify-end">
                                  {project.links && project.links.length > 0 ? project.links.slice(0,6).map((l) => {
                                    const isGithub = (l.text || "").toLowerCase().includes("github") || (l.url || "").toLowerCase().includes("github");
                                    const label = (l.text && l.text.trim()) ? l.text : (l.url ? l.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] : 'Link');
                                    return (
                                      <a
                                        key={l.id || l.url}
                                        href={l.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-lufga"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={isGithub ? `Open ${label}` : `Open ${label}`}
                                      >
                                        {isGithub ? <Github className="w-4 h-4 text-white" /> : <ExternalLink className="w-4 h-4 text-white" />}
                                        <span className="truncate max-w-[120px]">{label}</span>
                                      </a>
                                    );
                                  }) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                  {visibleCount < n && (
                    <div className="pt-4 relative w-full flex items-center justify-center">
                      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-orange-lighter to-transparent" />
                      <button
                        onClick={() => setVisibleCount((c) => Math.min(n, c + 3))}
                        className="relative inline-flex items-center px-8 py-3 sm:px-10 sm:py-4 rounded-full bg-orange text-white font-lufga text-lg sm:text-xl font-semibold shadow-[0_6px_24px_rgba(253,133,58,0.35)] hover:bg-orange/90 transition-colors"
                        aria-label="Load more projects"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-6xl" style={{ height: containerH }}>
                {loading ? null : (
                  offsets.map((off) => {
                    const idx = (currentIndex + off + n) % n;
                    const project = ordered[idx];
                    const primaryImage = project?.media?.[0]?.image || "/project-placeholder.svg";

                    const size = off === 0 ? { w: centerW, h: centerH } : { w: sideW, h: sideH };
                    const baseX = off === 0 ? 0 : off === -1 ? -dx : dx;
                    const x = baseX + dragX;
                    const y = off === 0 ? 0 : sideY;
                    const z = off === 0 ? 30 : 20;

                    return (
                      <div
                        key={off}
                        className="absolute cursor-pointer group"
                        style={{
                          width: size.w,
                          height: size.h,
                          left: `50%`,
                          top: y,
                          transform: `translateX(-50%) translateX(${x}px)`,
                          zIndex: z,
                          willChange: "transform, top",
                          transition: isDragging ? "none" : "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1), top 420ms ease",
                        }}
                        onClick={() => {
                          if (isDragging || Math.abs(dragX) > 6) return;
                          navigate(`/projects/${project.id}`, { state: { project } });
                        }}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/projects/${project.id}`, { state: { project } });
                          }
                        }}
                      >
                        <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-white shadow-[0_4px_55px_0_rgba(0,0,0,0.05)]">
                          <div className="w-full h-full overflow-hidden relative">
                            <img
                              src={addCacheBuster(primaryImage)}
                              alt={project.title}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                if (img.src.includes("project-placeholder.svg")) return;
                                img.onerror = null;
                                img.src = "/project-placeholder.svg";
                              }}
                            />
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/25 to-black/50" />


                            {/* Glass morphism content */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10 backdrop-blur-[12.5px] bg-black/40 rounded-[32px] min-h-[200px]">
                              <div className="flex justify-between items-start gap-2 lg:gap-4">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h3 className="font-lufga font-bold text-3xl lg:text-4xl xl:text-5xl text-white mb-3 leading-tight truncate project-card-title">
                                    {(() => {
                                      const parts = splitTitle(project.title);
                                      return (
                                        <>
                                          <span className="text-white">{parts.pre && parts.pre + (parts.last ? ' ' : '')}</span>
                                          <span className="text-orange">{parts.last}</span>
                                        </>
                                      );
                                    })()}
                                  </h3>
                                  <p className="font-lufga text-xs lg:text-sm text-orange-lighter leading-relaxed line-clamp-3">
                                    {excerpt(project.description, off === 0 ? 140 : 100)}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 flex flex-wrap gap-2 justify-end">
                                  {project.links && project.links.length > 0 ? project.links.slice(0,6).map((l) => {
                                    const isGithub = (l.text || "").toLowerCase().includes("github") || (l.url || "").toLowerCase().includes("github");
                                    const label = (l.text && l.text.trim()) ? l.text : (l.url ? l.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] : 'Link');
                                    return (
                                      <a
                                        key={l.id || l.url}
                                        href={l.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-lufga"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={isGithub ? `Open ${label}` : `Open ${label}`}
                                      >
                                        {isGithub ? <Github className="w-3 lg:w-4 h-3 lg:h-4 text-white" /> : <ExternalLink className="w-3 lg:w-4 h-3 lg:h-4 text-white" />}
                                        <span className="truncate max-w-[120px]">{label}</span>
                                      </a>
                                    );
                                  }) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {!loading && n > 1 && (
                <div className="flex items-center gap-2">
                  {ordered.map((_, i) => {
                    const active = i === currentIndex;
                    const size = active ? Math.max(6, Math.min(16, Math.round(12 * scale))) : Math.max(5, Math.min(14, Math.round(10 * scale)));
                    return (
                      <button key={i} onClick={() => goto(i)} aria-label={`Go to project ${i + 1}`}>
                        <div
                          className={active ? "rounded-full bg-orange" : "rounded-full bg-gray-400 opacity-50"}
                          style={{ width: size, height: size }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {error && <p className="text-center text-gray-light font-lufga mt-6">{error}</p>}
        </div>
      </div>
    </section>
  );
}
