import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/config";
import { stripHtml } from "@/lib/utils";
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

export default function Blogs() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { data: blogsData, isLoading: blogsLoading } = useBlogs();

  useEffect(() => {
    if (!blogsData) return;
    const d = blogsData as any;
    const results = Array.isArray(d) ? d : d.results ?? [];
    const sorted = [...results].sort((a: BlogPost, b: BlogPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setBlogs(sorted);
  }, [blogsData]);

  const items = useMemo(() => blogs, [blogs]);

  if (loading) return null;

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-lufga font-bold text-gray-text inline-block">All Blog Posts</h1>
            <div className="w-24 h-1 bg-orange rounded-full mt-3" />
          </div>
          <div>
            <button onClick={() => navigate(-1)} className="inline-flex items-center px-6 py-3 rounded-full bg-orange text-white font-lufga font-semibold hover:bg-orange/90 transition-colors">← Back</button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-gray-text">No blogs available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
            {items.map((post) => {
              const img = (post.images && post.images[0]?.image) || "/project-placeholder.svg";
              return (
                <article key={post.id} className="flex flex-col space-y-8">
                  <button
                    onClick={() => navigate(`/blog/${post.slug}`)}
                    className="group cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange/30 blog-image-frame overflow-hidden transition-all duration-300"
                    aria-label={`Read blog post: ${post.title}`}
                  >
                    <div className="relative group-hover:shadow-2xl transition-shadow duration-300 blog-image-frame overflow-hidden">
                      <div className="relative w-full h-[320px] lg:h-[360px] shadow-[0_4px_55px_0_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_70px_0_rgba(0,0,0,0.15)] transition-shadow duration-300 blog-image-frame overflow-hidden">
                        <div className="w-full h-full overflow-hidden relative blog-image-mask">
                          <img
                            loading="lazy"
                            decoding="async"
                            src={addCacheBuster(img)}
                            alt={post.title}
                            className="absolute inset-0 block w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 rounded-none"
                          />
                          <div className="absolute bottom-0 right-0 w-16 h-16 lg:w-20 lg:h-20">
                            <div className="w-full h-full blog-corner-cutout" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#FD853A] rounded-full" />
                        <span className="text-[#344054] font-inter text-xl">Salma Chiboub</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#FD853A] rounded-full" />
                        <span className="text-[#344054] font-inter text-xl">{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                    <h2 className="text-[32px] font-lufga text-[#344054] leading-tight">{post.title}</h2>
                    <p className="text-gray-text font-lufga text-lg leading-relaxed">{stripHtml(post.content).length > 180 ? `${stripHtml(post.content).slice(0, 180).trim()}…` : stripHtml(post.content)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
