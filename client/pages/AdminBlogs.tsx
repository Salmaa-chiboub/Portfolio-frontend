import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Edit3, MoreHorizontal, Check, FileText } from "lucide-react";
import { getApiUrl } from "@/lib/config";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { fetchWithAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import useLongPress from "@/hooks/use-long-press";

type BlogImage = { id: number; image?: string | null; caption?: string | null };
type BlogPost = { id: number; title: string; slug?: string; content?: string | null; images?: BlogImage[]; created_at?: string };

export default function AdminBlogs() {
  const navigate = useNavigate();
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<number[]>([]);

  React.useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getApiUrl("/api/blog/posts/"), { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load articles." });
    } finally { setLoading(false); }
  };

  const toggle = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const delOne = async (identifier: string | number) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/blog/posts/${identifier}/`), { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      toast({ title: "Deleted", description: "Article deleted." });
      setPosts((prev) => prev.filter(p => String(p.slug || p.id) !== String(identifier)));
      setSelected((prev) => prev.filter(x => String(x) !== String(identifier)));
    } catch {
      toast({ title: "Error", description: "Failed to delete." });
    }
  };

  const delSelected = async () => {
    if (selected.length === 0) return toast({ title: "No article selected", description: "Select articles to delete." });
    try {
      for (const id of selected) {
        const identifier = (posts.find(p => p.id === id)?.slug) || id;
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchWithAuth(getApiUrl(`/api/blog/posts/${identifier}/`), { method: "DELETE" });
        if (!res.ok) throw new Error(String(res.status));
      }
      toast({ title: "Deleted", description: `${selected.length} article(s) deleted.` });
      setPosts((prev) => prev.filter(p => !selected.includes(p.id)));
      setSelected([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete selected articles." });
      await load();
    }
  };

  const delAll = async () => {
    try {
      for (const p of posts) {
        const identifier = p.slug || p.id;
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchWithAuth(getApiUrl(`/api/blog/posts/${identifier}/`), { method: "DELETE" });
        if (!res.ok) throw new Error(String(res.status));
      }
      toast({ title: "Deleted", description: "All articles have been deleted." });
      setPosts([]);
      setSelected([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete all articles." });
      await load();
    }
  };

  const openEdit = (post: BlogPost) => {
    const identifier = post.slug || post.id;
    navigate("/admin/blog/new", { state: { initial: post, postId: identifier } });
  };


  function BlogCard({ p, selected, setSelected, toggle, openEdit, delOne }: { p: BlogPost; selected: number[]; setSelected: (v: number[]) => void; toggle: (id: number) => void; openEdit: (post: BlogPost) => void; delOne: (identifier: string | number) => void; }) {
    const longPressHandlers = useLongPress(() => {
      if (!selected.includes(p.id)) setSelected(prev => [...prev, p.id]);
    }, 600);

    const clickTimerRef = React.useRef<number | null>(null);
    const navigateLocal = useNavigate();

    const handleClick = (e: any) => {
      e.stopPropagation();
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        navigateLocal(`/admin/blog/${p.slug || p.id}`);
      }, 250) as unknown as number;
    };

    const handleDouble = (e: any) => {
      e.stopPropagation();
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
      toggle(p.id);
    };

    return (
      <div
        onDoubleClick={handleDouble}
        onClick={handleClick}
        {...longPressHandlers}
        className={"group relative border rounded-xl overflow-hidden bg-gray-bg shadow-sm transition-transform transform hover:-translate-y-1 hover:shadow-lg " + (selected.includes(p.id) ? "ring-4 ring-orange" : "")}
      >
        {selected.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); toggle(p.id); }}
            className="absolute left-3 top-3 w-10 h-10 rounded-md border bg-white/80 flex items-center justify-center z-10"
            aria-label="Select post"
          >
            {selected.includes(p.id) ? <Check className="w-6 h-6 text-orange" /> : <div className="w-5 h-5 border border-gray-border rounded-sm" />}
          </button>
        )}

        {p.images && p.images[0] && p.images[0].image ? (
          <img src={p.images[0].image} alt={p.title} className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 bg-white/60 flex items-center justify-center text-sm">No image</div>
        )}

        <div className="p-4">
          <h3 className="font-lufga text-xl mb-2">{p.title}</h3>
          <div className="flex items-center justify-between text-sm text-gray-text">
            <div>{p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
            <div className="text-dark">Salma Chiboub</div>
          </div>
        </div>

        <div className="absolute right-3 bottom-3 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/80 hover:bg-white transition-shadow"><MoreHorizontal className="w-5 h-5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" onClick={(e) => e.stopPropagation()} className="bg-white/60 backdrop-blur-md border border-gray-border rounded-2xl shadow-lg p-2">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEdit(p); }} className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-orange"/>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); delOne(p.slug || p.id); }} className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600"/>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6">
          {selected.length > 0 ? (
            <div className="flex items-center justify-between bg-gray-bg px-3 py-2 rounded-xl">
              <div className="font-lufga text-sm text-dark">{selected.length} selected</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setSelected([])} className="px-3 py-1 text-sm">Cancel</Button>
                <Button variant="ghost" onClick={() => setSelected(prev => prev.length === posts.length ? [] : posts.map(p => p.id))} className="px-3 py-1 text-sm">Select all</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full bg-white/90 hover:bg-white transition-shadow" aria-label="Actions">
                      <MoreHorizontal className="w-5 h-5 text-dark" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" align="end" className="bg-white/60 backdrop-blur-md border border-gray-border rounded-2xl shadow-lg p-2 mt-1 z-50">
                    <DropdownMenuItem disabled={selected.length !== 1} onSelect={(e) => { e.preventDefault(); if (selected.length === 1) { const p = posts.find(x => x.id === selected[0]); if (p) openEdit(p); } }} className={`flex items-center gap-2 ${selected.length !== 1 ? 'opacity-50 cursor-not-allowed' : ''}`}><Edit3 className="w-4 h-4 text-orange"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); delSelected(); }} className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600"/>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h1 className="font-lufga text-3xl lg:text-4xl"><span className="text-dark">Manage </span><span className="text-orange">Posts</span></h1>
              <div className="flex items-center gap-3">
                <Button variant="admin" onClick={() => navigate("/admin/blog/new")} className="h-12 rounded-full inline-flex items-center gap-2"><FileText className="w-4 h-4" />Create</Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="ml-auto text-sm text-gray-text">{posts.length} posts</div>
          </div>

          {loading ? <div className="text-lg text-gray-text">Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
                <BlogCard key={p.id} p={p} selected={selected} setSelected={setSelected} toggle={toggle} openEdit={openEdit} delOne={delOne} />
              ))}

              {posts.length === 0 && !loading ? <div className="text-center text-gray-text col-span-full py-8">No articles found.</div> : null}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
