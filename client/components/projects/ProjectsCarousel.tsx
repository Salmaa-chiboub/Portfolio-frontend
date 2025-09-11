import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Github, ExternalLink, ArrowUpRight } from "lucide-react";

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

  const navigate = useNavigate();

  // Use react-query projects hook
  const { data: projectsData, isLoading: loading, error } = useProjects();

  useEffect(() => {
    setProjects(Array.isArray(projectsData) ? projectsData : (projectsData && (projectsData as any).results) || []);
  }, [projectsData]);

  const filteredProjects = projects;

  const totalPages = filteredProjects.length;
  const currentProject = filteredProjects.length > 0 ? filteredProjects[Math.min(currentPage, filteredProjects.length - 1)] : null;

  // Featured project (last project)
  const featuredProject = projects.length > 0 ? projects[projects.length - 1] : null;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, Math.max(0, totalPages - 1))));
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

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

        {/* Projects Grid */}
        <div className="flex flex-col items-center gap-12">
          {/* Main Projects Grid */}
          <div className="w-full max-w-[1290px]">
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="w-full h-[371px] bg-gray-bg animate-pulse rounded-[20px]" />
                ))}
              </div>
            ) : (
              currentProject ? (() => {
                const media = Array.isArray(currentProject.media) ? [...currentProject.media].sort((a,b)=> (a.order ?? 0) - (b.order ?? 0)) : [];
                const first = media[0]?.image || "/project-placeholder.svg";
                const second = (media[1]?.image || media[0]?.image) || "/project-placeholder.svg";
                const single = media.length <= 1;
                const card = (src: string, key: string) => (
                  <div key={key} className="w-full">
                    <button
                      className="block w-full text-left group"
                      onClick={() => navigate(`/projects/${currentProject.id}`, { state: { project: currentProject } })}
                      aria-label={`Open ${currentProject.title}`}
                    >
                      <div className="relative w-full h-[371px] rounded-[20px] overflow-hidden bg-white shadow-[0_4px_55px_0_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_70px_0_rgba(0,0,0,0.1)] transition-shadow duration-300">
                        <img
                          src={addCacheBuster(src)}
                          alt={currentProject.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (img.src.includes("project-placeholder.svg")) return;
                            img.onerror = null;
                            img.src = "/project-placeholder.svg";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/36 to-black/50 opacity-60" />
                      </div>
                    </button>
                  </div>
                );

                return single ? (
                  <div className="flex justify-center">
                    <div className="w-full lg:w-[633px]">{card(first, 'single')}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {card(first, 'first')}
                    {card(second, 'second')}
                  </div>
                );
              })() : null
            )}
          </div>

          {/* Pagination Dots */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`rounded-full transition-all duration-200 ${
                    index === currentPage
                      ? 'w-[60px] h-4 bg-orange'
                      : 'w-4 h-4 bg-gray-border hover:bg-gray-light'
                  }`}
                  aria-label={`Go to project ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Project Skills Chips */}
          {currentProject && (()=>{
            const skills = parseSkills(currentProject.skills_list);
            return skills.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                {skills.slice(0, 12).map((s, i) => (
                  <span key={`${s}-${i}`} className="px-8 py-4 rounded-[24px] bg-gray-bg text-black font-inter text-xl border border-gray-border">
                    {s}
                  </span>
                ))}
              </div>
            ) : null;
          })()}

          {/* Featured Project Section */}
          {featuredProject && (
            <div className="w-full max-w-[742px] flex flex-col items-center gap-6">
              <div className="flex items-end gap-4.5">
                <h3 className="font-lufga font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-text leading-tight tracking-tight">
                  {featuredProject.title}
                </h3>
                
                <button
                  onClick={() => navigate(`/projects/${featuredProject.id}`, { state: { project: featuredProject } })}
                  className="flex items-center justify-center w-[58px] h-[58px] bg-orange rounded-full border-2 border-orange hover:bg-orange/90 transition-colors transform -rotate-90"
                  aria-label={`View ${featuredProject.title} project`}
                >
                  <ArrowUpRight className="w-8 h-8 text-white" strokeWidth={2} />
                </button>
              </div>
              
              <div className="w-full text-center">
                <p className="font-lufga text-xl text-gray-text leading-normal tracking-tight">
                  {(() => {
                    const html = String(featuredProject.description || "");
                    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                    const limit = 220;
                    return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
