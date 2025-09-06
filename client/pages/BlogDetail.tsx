import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Github, ExternalLink } from "lucide-react";
import { getApiUrl } from "@/lib/config";
import { stripHtml, cn } from "@/lib/utils";
import { useBlogs } from "@/hooks/use-api";

type BlogImage = { id: number; image: string; caption?: string | null };
export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  images: BlogImage[];
  links?: { id: number; url: string; text: string }[];
};

const BUILD_ID = typeof window !== "undefined" && (import.meta as any).hot ? String(Date.now()) : ((import.meta as any).env?.VITE_BUILD_ID as string) || "1";
const addCacheBuster = (u: string) => {
  try {
    const url = new URL(u, window.location.origin);
    url.searchParams.set("v", BUILD_ID);
    return url.toString();
  } catch {
    const sep = u.includes("?") ? "&" : "?";
    return `${u}${sep}v=${BUILD_ID}`;
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(d);
};

export default function BlogDetail({ slugParam }: { slugParam?: string } = {}) {
  const params = useParams<{ slug: string }>();
  const slug = slugParam ?? params.slug;
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [others, setOthers] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const openViewer = (index = 0) => { setActiveIndex(index); setViewerOpen(true); };
  const closeViewer = () => setViewerOpen(false);

  const splitTitle = (title: string) => {
    const parts = title.trim().split(/\s+/);
    if (parts.length <= 1) return { mainPart: title, lastWord: "" };
    const lastWord = parts.pop() as string;
    const mainPart = parts.join(" ");
    return { mainPart, lastWord };
  };

  const { data: blogsData, isLoading: blogsLoading } = useBlogs();

  useEffect(() => {
    if (!blogsData || !slug) return;
    const d = blogsData as any;
    const results = Array.isArray(d) ? d : d.results ?? [];
    const sorted = [...results].sort((a: BlogPost, b: BlogPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const current = sorted.find((p) => p.slug === slug) || null;
    setBlog(current);
    setOthers(sorted.filter((p) => p.slug !== slug).slice(0, 3));
    setActiveIndex(0);
  }, [blogsData, slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeViewer(); };
    if (viewerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen]);

  const heroImg = useMemo(() => (blog?.images && blog.images[activeIndex]?.image) || (blog?.images && blog.images[0]?.image) || "/project-placeholder.svg", [blog, activeIndex]);

  if (loading) return null;
  if (!blog) return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto max-w-3xl px-4">
        <button onClick={() => navigate(-1)} className="text-orange font-lufga mb-6">Back</button>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-lufga font-bold text-gray-text">Blog not found</h1>
      </div>
    </section>
  );

  return (
    <section className="pt-8 lg:pt-12 pb-16 lg:pb-24 bg-white min-h-screen">
      <div className="container mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-bold leading-tight inline-block">
              {(() => {
                const { mainPart, lastWord } = splitTitle(blog.title);
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

          <div>
            <button onClick={() => navigate(-1)} className="inline-flex items-center px-6 py-3 rounded-full bg-orange text-white font-lufga font-semibold hover:bg-orange/90 transition-colors">← Back</button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Images Section */}
          <div className="space-y-6">
            <div className="relative mx-auto w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%]">
              <div className="rounded-3xl overflow-hidden">
                <motion.img
                  key={heroImg}
                  loading="lazy"
                  decoding="async"
                  src={addCacheBuster(heroImg)}
                  alt={blog.title}
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

              {blog.images && blog.images.length > 1 && (
                <>
                  <button onClick={() => setActiveIndex((p) => (p === 0 ? blog.images!.length - 1 : p - 1))} className="absolute left-4 lg:-left-20 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/95 hover:bg-white border border-gray-border rounded-full flex items-center justify-center shadow-lg transition-colors z-50"><ChevronLeft className="w-5 h-5 text-gray-text" /></button>
                  <button onClick={() => setActiveIndex((p) => (p === blog.images!.length - 1 ? 0 : p + 1))} className="absolute right-4 lg:-right-20 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/95 hover:bg-white border border-gray-border rounded-full flex items-center justify-center shadow-lg transition-colors z-50"><ChevronRight className="w-5 h-5 text-gray-text" /></button>
                </>
              )}

              {/* Pagination dots */}
              {blog.images && blog.images.length > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  {blog.images.map((_, idx) => (
                    <button key={idx} onClick={() => setActiveIndex(idx)} className={cn("transition-all duration-200 border-0 bg-transparent p-0", idx === activeIndex ? "w-16 h-4 bg-orange rounded-full" : "w-4 h-4 bg-gray-border rounded-full hover:bg-gray-light")} aria-label={`Go to image ${idx + 1}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className={cn("grid gap-8", blog.links && blog.links.length > 0 ? "lg:grid-cols-[7fr,3fr]" : "lg:grid-cols-1")}>
              <div className="space-y-4">
                <article className="prose max-w-none font-lufga text-gray-text text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: blog.content }} />
              </div>

              {(blog.links && blog.links.length > 0) && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl lg:text-2xl font-lufga font-bold text-dark mb-4">Links</h2>
                    <div className="flex flex-col gap-3">
                      {blog.links.map((l) => {
                        const isGithub = (l.text || "").toLowerCase().includes("github") || (l.url || "").toLowerCase().includes("github");
                        const label = (l.text && l.text.trim()) ? l.text : (l.url ? l.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] : 'Link');
                        return (
                          <a key={l.id || l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-gray-text hover:text-orange transition-colors">
                            {isGithub ? <Github className="w-5 h-5 text-gray-text" /> : <ExternalLink className="w-5 h-5 text-gray-text" />}
                            <span className="font-lufga text-base">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Other posts */}
          {others.length > 0 && (
            <div className="pt-8">
              <h2 className="text-2xl sm:text-3xl font-lufga font-bold text-gray-text mb-6">Other blog posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
                {others.map((post) => {
                  const img = (post.images && post.images[0]?.image) || "/project-placeholder.svg";
                  return (
                    <article key={post.id} className="flex flex-col space-y-6">
                      <button onClick={() => navigate(`/blog/${post.slug}`)} className="group cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange/30 blog-image-frame overflow-hidden transition-all duration-300" aria-label={`Read blog post: ${post.title}`}>
                        <div className="relative group-hover:shadow-2xl transition-shadow duration-300 blog-image-frame overflow-hidden">
                          <div className="relative w-full h-[260px] shadow-[0_4px_55px_0_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_70px_0_rgba(0,0,0,0.15)] transition-shadow duration-300 blog-image-frame overflow-hidden">
                            <img loading="lazy" decoding="async" src={addCacheBuster(img)} alt={post.title} className="absolute inset-0 w-full h-full object-cover rounded-none" />
                          </div>
                        </div>
                      </button>
                      <h3 className="text-[28px] font-lufga text-[#344054] leading-tight">{post.title}</h3>
                      <p className="text-gray-text font-lufga text-base leading-relaxed whitespace-pre-wrap">{stripHtml(post.content).length > 140 ? `${stripHtml(post.content).slice(0, 140).trim()}…` : stripHtml(post.content)}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen viewer overlay */}
      {viewerOpen && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center bg-black/80 p-4 overflow-auto">
          <button onClick={closeViewer} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg z-50" aria-label="Close viewer">✕</button>
          <div className="max-w-[95vw] max-h-[95vh] my-8">
            <img src={addCacheBuster(blog.images[activeIndex]?.image || "/project-placeholder.svg")} alt={blog.title} className="w-full max-h-[90vh] object-contain rounded-md" />
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
