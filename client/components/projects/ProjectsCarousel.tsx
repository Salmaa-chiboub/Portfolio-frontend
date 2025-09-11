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

const categories = ["Landing Page", "Product Design", "Animation", "Glassmorphism", "Cards"];

export default function ProjectsCarousel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const navigate = useNavigate();
  const projectsPerPage = 2;

  // Use react-query projects hook
  const { data: projectsData, isLoading: loading, error } = useProjects();

  useEffect(() => {
    setProjects(Array.isArray(projectsData) ? projectsData : (projectsData && (projectsData as any).results) || []);
  }, [projectsData]);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === "All") return projects;
    // In a real app, you'd filter by project category/type
    return projects;
  }, [projects, selectedCategory]);

  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const currentProjects = filteredProjects.slice(currentPage * projectsPerPage, (currentPage + 1) * projectsPerPage);

  // Featured project (first project or fallback)
  const featuredProject = projects.length > 0 ? projects[0] : null;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
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
            <span className="text-orange">Portfolio</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentProjects.map((project) => {
                  const primaryImage = project?.media?.[0]?.image || "/project-placeholder.svg";
                  
                  return (
                    <div key={project.id} className="w-full">
                      <button
                        className="block w-full text-left group"
                        onClick={() => navigate(`/projects/${project.id}`, { state: { project } })}
                        aria-label={`Open ${project.title}`}
                      >
                        <div className="relative w-full h-[371px] rounded-[20px] overflow-hidden bg-white shadow-[0_4px_55px_0_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_70px_0_rgba(0,0,0,0.1)] transition-shadow duration-300">
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
                          {/* Gradient overlay matching Figma design */}
                          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/36 to-black/50 opacity-60" />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
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
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-8 py-4 rounded-[24px] font-inter text-xl font-normal transition-colors ${
                  selectedCategory === category
                    ? 'bg-orange text-white'
                    : 'bg-gray-bg text-black hover:bg-gray-border'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

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
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed congue interdum ligula a dignissim. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed lobortis orci elementum egestas lobortis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
