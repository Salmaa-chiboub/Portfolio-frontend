import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/use-api";

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

export default function Projects() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useProjects();

  const projects = useMemo(() => {
    const raw = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
    return raw as Array<{ id: number; title: string; description: string; media?: { image: string }[] }>; 
  }, [data]);

  return (
    <section className="pt-12 lg:pt-16 pb-20 lg:pb-28 bg-white min-h-screen">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-10 flex items-center justify-between gap-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-bold leading-tight">
            <span className="text-dark">All </span>
            <span className="text-orange">Projects</span>
          </h1>
          <button onClick={() => navigate('/')} className="inline-flex items-center px-6 py-3 rounded-full bg-orange text-white font-lufga font-semibold hover:bg-orange/90 transition-colors">← Back</button>
        </div>

        {error && !isLoading && <p className="text-center text-gray-text font-lufga">Failed to load projects.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-border bg-white p-3 animate-pulse">
                <div className="w-full h-48 rounded-xl bg-gray-bg" />
                <div className="mt-3 h-5 bg-gray-bg rounded" />
              </div>
            ))
          ) : (
            projects.map((p) => {
              const img = p?.media?.[0]?.image || '/project-placeholder.svg';
              const text = String(p.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              const excerpt = text.length > 120 ? text.slice(0, 119) + '…' : text;
              return (
                <div key={p.id} className="rounded-2xl border border-gray-border bg-white p-3">
                  <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-bg border border-gray-border">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={addCacheBuster(img)}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (el.src.includes('project-placeholder.svg')) return;
                        el.onerror = null;
                        el.src = '/project-placeholder.svg';
                      }}
                    />
                  </div>
                  <h3 className="mt-3 text-lg font-lufga font-bold text-gray-text line-clamp-2" title={p.title}>{p.title}</h3>
                  {excerpt && <p className="mt-1 text-sm text-gray-lighter line-clamp-2">{excerpt}</p>}
                  <Link to={`/projects/${p.id}`} state={{ project: p }} className="inline-flex items-center mt-3 px-4 py-2 rounded-full bg-white border border-gray-border text-gray-text font-lufga text-sm hover:bg-gray-bg">View details</Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
