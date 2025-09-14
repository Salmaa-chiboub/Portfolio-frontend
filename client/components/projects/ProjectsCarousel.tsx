import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Github, ExternalLink, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

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

import { getApiUrl } from "@/lib/config";
import { useProjects } from "@/hooks/use-api";
import { makeSrcSet } from "@/lib/images";

function parseSkills(list?: unknown): string[] {
  let items: unknown[] = [];
  if (Array.isArray(list)) items = list;
  else if (typeof list === "string") {
    const s = list.trim();
    try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) items = parsed; } catch { items = s.split(",").map(x => x.trim()).filter(Boolean); }
  }
  const names: string[] = [];
  for (const it of items) {
    if (typeof it === "string") { const v = it.trim(); if (v) names.push(v); }
    else if (it && typeof it === "object") {
      const anyIt: any = it as any;
      const name = typeof anyIt.name === "string" ? anyIt.name : anyIt.skill_reference && typeof anyIt.skill_reference.name === "string" ? anyIt.skill_reference.name : "";
      if (name) names.push(name.trim());
    }
  }
  return Array.from(new Set(names.filter(Boolean)));
}

export default function ProjectsCarousel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [activeMedia, setActiveMedia] = useState<Record<number, number>>({});
  const touchByProjectRef = useRef<Record<number, { startX: number | null; time: number }>>({});

  const navigate = useNavigate();

  // Touch swipe state for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartTime.current = Date.now();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    const threshold = 40; // px
    if (Math.abs(dx) > threshold && dt < 800) {
      if (dx < 0) nextPage(); else prevPage();
    }
    touchStartX.current = null;
  };

  // Use react-query projects hook
  const { data: projectsData, isLoading: loading, error } = useProjects();

  useEffect(() => {
    setProjects(Array.isArray(projectsData) ? projectsData : (projectsData && (projectsData as any).results) || []);
  }, [projectsData]);

  const filteredProjects = projects;

  const totalPages = filteredProjects.length;
  const visibleProjects = filteredProjects.slice(0, Math.max(1, Math.min(visibleCount, filteredProjects.length)));

  const goToPage = (_page: number) => {};
  const nextPage = () => setVisibleCount((v) => Math.min(filteredProjects.length, v + 1));
  const prevPage = () => setVisibleCount((v) => Math.max(1, v - 1));

  if (!loading && (error || filteredProjects.length === 0)) return null;

  return (
    <section id="project" className="py-24 lg:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 lg:px-18">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h2 className="font-lufga font-semibold text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight">
            <span className="text-gray-text">Lets have a look at my </span>
            <span className="text-orange">Projects</span>
          </h2>
          
          <button 
            onClick={() => navigate("/projects")}
            className="flex items-center justify-center px-10 py-5 bg-orange rounded-full hover:bg-orange/90 transition-colors"
          >
            <span className="text-white font-lufga font-bold text-xl">See All</span>
          </button>
        </div>

        {/* Projects Stack */}
        <div className="flex flex-col items-center gap-12">
          <div className="w-full max-w-[1290px] space-y-12">
            {loading ? (
              <div className="flex justify-center">
                <div className="w-full md:w-[720px] lg:w-[860px] xl:w-[980px] h-[400px] sm:h-[420px] bg-gray-bg animate-pulse rounded-[20px]" />
              </div>
            ) : (
              visibleProjects.map((p, i) => {
                const media = Array.isArray(p.media) ? [...p.media].sort((a,b)=> (a.order ?? 0) - (b.order ?? 0)) : [];
                const idx = Math.min(Math.max(0, activeMedia[p.id] ?? 0), Math.max(0, media.length - 1));
                const src = media[idx]?.image || media[0]?.image || "/project-placeholder.svg";
                const skills = parseSkills(p.skills_list);
                const text = String(p.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                const excerpt = text.length > 220 ? text.slice(0, 219) + "…" : text;
                return (
                  <div key={p.id} className="flex flex-col items-center gap-6 w-full">
                    <button
                      className="block w-full text-left group"
                      onClick={() => navigate(`/projects/${p.id}`, { state: { project: p } })}
                      aria-label={`Open ${p.title}`}
                    >
                      <div
                        className="relative mx-auto w-full md:w-[720px] lg:w-[860px] xl:w-[980px] h-[400px] sm:h-[420px] rounded-[20px] overflow-hidden bg-white shadow-[0_4px_55px_0_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_70px_0_rgba(0,0,0,0.1)] transition-shadow duration-300"
                        onTouchStart={(e) => { touchByProjectRef.current[p.id] = { startX: e.touches[0]?.clientX ?? null, time: Date.now() }; }}
                        onTouchEnd={(e) => {
                          const info = touchByProjectRef.current[p.id];
                          if (!info || info.startX == null) return;
                          const dx = (e.changedTouches[0]?.clientX ?? 0) - info.startX;
                          const dt = Date.now() - info.time;
                          const threshold = 40;
                          if (Math.abs(dx) > threshold && dt < 800 && media.length > 1) {
                            setActiveMedia((prev) => {
                              const cur = Math.min(Math.max(0, prev[p.id] ?? 0), Math.max(0, media.length - 1));
                              const next = dx < 0 ? Math.min(media.length - 1, cur + 1) : Math.max(0, cur - 1);
                              return { ...prev, [p.id]: next };
                            });
                          }
                        }}
                      >
                        <picture>
                          <source type="image/avif" srcSet={makeSrcSet(addCacheBuster(src), [640, 768, 992, 1200, 1600], 'avif')} sizes="(max-width: 1280px) 100vw, 980px" />
                          <source type="image/webp" srcSet={makeSrcSet(addCacheBuster(src), [640, 768, 992, 1200, 1600], 'webp')} sizes="(max-width: 1280px) 100vw, 980px" />
                          <img
                            src={addCacheBuster(src)}
                            alt={p.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              if (img.src.includes("project-placeholder.svg")) return;
                              img.onerror = null;
                              img.src = "/project-placeholder.svg";
                            }}
                          />
                        </picture>
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/36 to-black/50 opacity-60" />
                      </div>
                    </button>

                    {media.length > 1 && (
                      <div className="flex items-center gap-3 mt-3">
                        {media.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveMedia((prev) => ({ ...prev, [p.id]: i }))}
                            className={`rounded-full transition-all duration-200 ${i === idx ? 'w-[60px] h-4 bg-orange' : 'w-4 h-4 bg-gray-border hover:bg-gray-light'}`}
                            aria-label={`Go to image ${i + 1} of project ${p.title}`}
                          />
                        ))}
                      </div>
                    )}

                    {skills.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-3.5">
                        {skills.slice(0, 12).map((s: string, i: number) => (
                          <span key={`${s}-${i}`} className="px-8 py-4 rounded-[24px] bg-gray-bg text-black font-inter text-xl border border-gray-border">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="w-full max-w-[860px] flex flex-col items-center gap-4">
                      <div className="flex items-end gap-4.5">
                        <h3 className="font-lufga font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-text leading-tight tracking-tight">
                          {p.title}
                        </h3>
                        <button
                          onClick={() => navigate(`/projects/${p.id}`, { state: { project: p } })}
                          className="flex items-center justify-center w-[58px] h-[58px] bg-orange rounded-full border-2 border-orange hover:bg-orange/90 transition-colors transform -rotate-90"
                          aria-label={`View ${p.title} project`}
                        >
                          <ArrowUpRight className="w-8 h-8 text-white" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="w-full text-center">
                        <p className="font-lufga text-xl text-gray-text leading-normal tracking-tight">{excerpt}</p>
                      </div>
                    </div>

                    {i < visibleProjects.length - 1 && (
                      <div className="w-full flex justify-center">
                        <div className="w-full md:w-[720px] lg:w-[860px] xl:w-[980px] h-px bg-gray-border" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* See more / See less controls */}
          {filteredProjects.length > 1 && (
            <div className="flex items-center gap-3">
              {visibleProjects.length > 1 && (
                <button onClick={() => setVisibleCount(1)} className="px-6 py-3 rounded-full border border-gray-border bg-white text-gray-text hover:bg-gray-bg font-lufga">See less</button>
              )}
              {visibleProjects.length < filteredProjects.length && (
                <button onClick={() => setVisibleCount((v) => Math.min(filteredProjects.length, v + 1))} className="px-6 py-3 rounded-full bg-orange text-white hover:bg-orange/90 font-lufga">See more projects</button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
