import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, ExternalLink } from "lucide-react";
import { getApiUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { buildCloudinaryUrl, makeCloudinarySrcSet } from "@/lib/images";

type ProjectMedia = {
  id: number;
  image: string;
  order: number;
};

type Project = {
  id: number;
  title: string;
  description: string;
  media: ProjectMedia[];
  skills_list?: Array<string | { id: number; name: string; icon?: string }>;
  links?: { id?: number; url: string; text?: string; order?: number }[];
};

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

function parseSkills(skillsList?: unknown): string[] {
  let items: unknown[] = [];

  if (Array.isArray(skillsList)) {
    items = skillsList;
  } else if (typeof skillsList === "string") {
    const s = skillsList.trim();
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = s.split(",").map((x) => x.trim()).filter(Boolean);
    }
  }

  const names: string[] = [];
  for (const it of items) {
    if (typeof it === "string") {
      const v = it.trim();
      if (v) names.push(v);
    } else if (it && typeof it === "object") {
      const anyIt: any = it as any;
      const name = typeof anyIt.name === "string"
        ? anyIt.name
        : anyIt.skill_reference && typeof anyIt.skill_reference.name === "string"
          ? anyIt.skill_reference.name
          : "";
      if (name) names.push(name.trim());
    }
  }

  return Array.from(new Set(names.filter(Boolean)));
}

// Helper function to split title into parts (all words except last in black, last word in orange)
const splitTitle = (title: string) => {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return { mainPart: title, lastWord: "" };
  const lastWord = parts.pop() as string;
  const mainPart = parts.join(" ");
  return { mainPart, lastWord };
};

export default function ProjectDetail() {
  const params = useParams();
  const id = params.id as string | undefined;
  const location = useLocation() as { state?: { project?: Project; fallbackPath?: string } };
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(location.state?.project ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [links, setLinks] = useState<{ id?: number; url: string; text?: string; order?: number }[]>([]);

  // Fullscreen viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const openViewer = (index: number) => { setActiveIndex(index); setViewerOpen(true); };
  const closeViewer = () => setViewerOpen(false);

  // initialize links if project provided via route state
  useEffect(() => {
    if (location.state?.project?.links) setLinks(location.state.project.links);
  }, [location.state]);

  const media = useMemo(() => {
    const m = project?.media || [];
    return [...m].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [project]);

  useEffect(() => {
    if (!id) return;
    if (project && String(project.id) === String(id)) return;

    const controller = new AbortController();
    const signal = controller.signal;
    const url = getApiUrl(`/api/projects/${id}/`);
    setLoading(true);
    setError(null);

    fetch(url, { cache: "no-store", signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Project) => {
        setProject(data);
        // fetch links separately (API exposes /links/ endpoint)
        const linksController = new AbortController();
        fetch(getApiUrl(`/api/projects/${id}/links/`), { cache: "no-store", signal: linksController.signal })
          .then((lr) => (lr.ok ? lr.json() : Promise.reject(lr.status)))
          .then((ld) => setLinks(Array.isArray(ld) ? ld : []))
          .catch(() => setLinks([]));
      })
      .catch((err) => {
        if ((err as any)?.name === 'AbortError') return;
        setError("Failed to load project.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const skills = useMemo(() => parseSkills(project?.skills_list), [project]);

  const mainImage = media[activeIndex]?.image || "/project-placeholder.svg";
  const hasMultipleImages = media.length > 1;

  // Navigation functions
  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  // Swipe/drag support
  const dragRef = (function() {
    return { current: { active: false, startX: 0, triggered: false } } as React.MutableRefObject<{ active: boolean; startX: number; triggered: boolean }>;
  })();
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.triggered = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const threshold = 50;
    if (!dragRef.current.triggered && Math.abs(dx) > threshold) {
      if (dx < 0) goToNext(); else goToPrevious();
      dragRef.current.triggered = true;
    }
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
    dragRef.current.triggered = false;
  };

  // Other projects
  const [otherProjects, setOtherProjects] = useState<Project[]>([]);
  const [otherLoading, setOtherLoading] = useState(false);
  const suggestions = useMemo(() => {
    const items = otherProjects.filter((p) => String(p.id) !== String(id));
    return items.slice(0, 4);
  }, [otherProjects, id]);

  useEffect(() => {
    const controller = new AbortController();
    setOtherLoading(true);
    fetch(getApiUrl("/api/projects/"), { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const results = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setOtherProjects(results || []);
      })
      .catch((err) => { if ((err as any)?.name === 'AbortError') return; setOtherProjects([]); })
      .finally(() => setOtherLoading(false));
    return () => controller.abort();
  }, [id]);

  // Close viewer on escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
    };
    if (viewerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen]);

  return (
    <section className="pt-8 lg:pt-12 pb-16 lg:pb-24 bg-white min-h-screen">
      <div className="container mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-6">
          {!loading && project && (
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-bold leading-tight inline-block">
                {(() => {
                  const { mainPart, lastWord } = splitTitle(project.title);
                  return (
                    <>
                      <span className="text-dark">{mainPart}{lastWord ? ' ' : ''}</span>
                      <span className="text-orange">{lastWord}</span>
                    </>
                  );
                })()}
              </h1>
              <div className="w-24 h-1 bg-orange rounded-full mt-3" />
            </div>
          )}

          <div>
            <button
              onClick={() => {
                const isAdmin = typeof window !== 'undefined' ? window.location.pathname.startsWith('/admin') : false;
                const fallback = location.state?.fallbackPath || (isAdmin ? '/admin/projects' : '/');
                if (window.history.length > 1) navigate(-1); else navigate(fallback, { replace: true });
              }}
              className="inline-flex items-center px-6 py-3 rounded-full bg-orange text-white font-lufga font-semibold hover:bg-orange/90 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>


        {!loading && error && (
          <p className="text-center text-gray-light font-lufga">{error}</p>
        )}

        {!loading && project && (
          <div className="space-y-8">
            {/* Images Section */}
            <div className="space-y-6">
              {/* Main image container - 70% width, centered */}
              <div className="relative mx-auto w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] touch-pan-y" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} style={{ touchAction: 'pan-y' }}>
                <div className="rounded-3xl overflow-hidden">
                  <motion.img
                    key={mainImage}
                    loading="lazy"
                    decoding="async"
                    src={buildCloudinaryUrl(mainImage, { w: 1600 })}
                    srcSet={makeCloudinarySrcSet(mainImage, [640, 768, 992, 1200, 1600])}
                    sizes="(max-width: 1024px) 100vw, 70vw"
                    alt={project.title}
                    width={1600}
                    height={900}
                    className="w-full h-[16rem] sm:h-[18rem] md:h-[22rem] lg:h-[30rem] object-cover cursor-zoom-in"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.src.includes("project-placeholder.svg")) return;
                      img.onerror = null;
                      img.src = "/project-placeholder.svg";
                    }}
                    onDoubleClick={() => openViewer(activeIndex)}
                  />
                </div>

              </div>

              {/* Pagination dots - Figma design */}
              {hasMultipleImages && (
                <div className="flex items-center justify-center gap-3">
                  {media.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "transition-all duration-200 border-0 bg-transparent p-0",
                        index === activeIndex
                          ? "w-16 h-4 bg-orange rounded-full"
                          : "w-4 h-4 bg-gray-border rounded-full hover:bg-gray-light"
                      )}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className={cn(
              "grid gap-8",
              skills.length > 0 || links.length > 0 
                ? "lg:grid-cols-[7fr,3fr]" 
                : "lg:grid-cols-1"
            )}>
              {/* Description - 70% or full width */}
              <div className="space-y-4">
                {project.description.includes("<") ? (
                  <div
                    className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                ) : (
                  <div className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </div>
                )}
              </div>

              {/* Sidebar - Stack and Links - 30% */}
              {(skills.length > 0 || links.length > 0) && (
                <div className="space-y-8">
                  {/* Stack */}
                  {skills.length > 0 && (
                    <div>
                      <h2 className="text-xl lg:text-2xl font-lufga font-bold text-dark mb-4">Stack</h2>
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 12).map((s, i) => (
                          <span 
                            key={`${s}-${i}`} 
                            className="px-4 py-2 rounded-full bg-gray-bg border border-gray-border text-gray-text text-sm font-lufga"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {links.length > 0 && (
                    <div>
                      <h2 className="text-xl lg:text-2xl font-lufga font-bold text-dark mb-4">Links</h2>
                      <div className="flex flex-col gap-3">
                        {links.map((l) => {
                          const isGithub = (l.text || "").toLowerCase().includes("github") || (l.url || "").toLowerCase().includes("github");
                          const label = (l.text && l.text.trim()) ? l.text : (l.url ? l.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] : 'Link');
                          return (
                            <a
                              key={l.id || l.url}
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-3 text-gray-text hover:text-orange transition-colors"
                            >
                              {isGithub ? <Github className="w-5 h-5 text-gray-text" /> : <ExternalLink className="w-5 h-5 text-gray-text" />}
                              <span className="font-lufga text-base">{label}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Other projects */}
            {suggestions.length > 0 && (
              <div className="pt-8">
                <h2 className="text-2xl sm:text-3xl font-lufga font-bold text-gray-text mb-6">Other Projects</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {suggestions.map((p: any) => (
                    <div key={p.id} className="rounded-2xl border border-gray-border bg-white p-3">
                      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-bg border border-gray-border">
                        <img
                          loading="lazy"
                          decoding="async"
                          src={buildCloudinaryUrl(p?.media?.[0]?.image || "/project-placeholder.svg", { w: 800 })}
                          srcSet={makeCloudinarySrcSet(p?.media?.[0]?.image || "/project-placeholder.svg", [400, 600, 800, 992])}
                          sizes="(max-width: 1024px) 100vw, 25vw"
                          alt={p?.title || "Project"}
                          width={600}
                          height={360}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (img.src.includes("project-placeholder.svg")) return;
                            img.onerror = null;
                            img.src = "/project-placeholder.svg";
                          }}
                        />
                      </div>
                      <h3 className="mt-3 text-lg font-lufga font-bold text-gray-text truncate" title={p?.title}>{p?.title || "Project"}</h3>
                      <Link
                        to={`/projects/${p.id}`}
                        state={{ project: p }}
                        className="inline-flex items-center mt-2 px-4 py-2 rounded-full bg-white border border-gray-border text-gray-text font-lufga text-sm hover:bg-gray-bg"
                      >
                        View details
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewerOpen && typeof document !== 'undefined' ? createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center bg-black/80 p-4 overflow-auto">
            <button onClick={closeViewer} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg z-50" aria-label="Close viewer">✕</button>
            <div className="max-w-[95vw] max-h-[95vh] my-8">
              <img src={buildCloudinaryUrl(media[activeIndex]?.image || "/project-placeholder.svg", { w: 1600 })} alt={project.title} width={1600} height={900} className="w-full max-h-[90vh] object-contain rounded-md" />
            </div>
          </div>,
          document.body
        ) : null}
      </div>
    </section>
  );
}
