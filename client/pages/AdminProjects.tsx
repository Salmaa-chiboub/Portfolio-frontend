import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Edit3, MoreHorizontal, Check } from "lucide-react";
import { getApiUrl } from "@/lib/config";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { fetchWithAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectForm } from "./AdminDashboard";
import useLongPress from "@/hooks/use-long-press";
import { useDebouncedValue } from "@/hooks/use-debounce";

type Project = {
  id: number;
  title: string;
  description: string | null;
  media: { id: number; image?: string | null }[];
  skills_list?: { id?: number; name?: string; icon?: string }[];
};

export default function AdminProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [skillRefs, setSkillRefs] = React.useState<{ id: number; name: string; icon?: string }[]>([]);
  const [skillsLoading, setSkillsLoading] = React.useState(false);

  React.useEffect(() => {
    load();
    // load skills references
    (async () => {
      setSkillsLoading(true);
      try {
        const res = await fetchWithAuth(getApiUrl("/api/skills/references/"), { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const d = await res.json();
        setSkillRefs(Array.isArray(d) ? d : []);
      } catch {
        setSkillRefs([]);
      } finally { setSkillsLoading(false); }
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getApiUrl("/api/projects/"), { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load projects." });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const clickTimer = React.useRef<number | null>(null);

  const delOne = async (id: number) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/projects/${id}/`), { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      toast({ title: "Deleted", description: "Project deleted." });
      setProjects((prev) => prev.filter(p => p.id !== id));
      setSelected((prev) => prev.filter(x => x !== id));
    } catch {
      toast({ title: "Error", description: "Failed to delete." });
    }
  };

  const delSelected = async () => {
    if (selected.length === 0) return toast({ title: "No project selected", description: "Select projects to delete." });
    try {
      for (const id of selected) {
        // send individual deletes to be safe
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchWithAuth(getApiUrl(`/api/projects/${id}/`), { method: "DELETE" });
        if (!res.ok) throw new Error(String(res.status));
      }
      toast({ title: "Deleted", description: `${selected.length} project(s) deleted.` });
      setProjects((prev) => prev.filter(p => !selected.includes(p.id)));
      setSelected([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete selected projects." });
      await load();
    }
  };

  const delAll = async () => {
    try {
      for (const p of projects) {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchWithAuth(getApiUrl(`/api/projects/${p.id}/`), { method: "DELETE" });
        if (!res.ok) throw new Error(String(res.status));
      }
      toast({ title: "Deleted", description: "All projects have been deleted." });
      setProjects([]);
      setSelected([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete all projects." });
      await load();
    }
  };

  const openEdit = (p: Project) => {
    // navigate to creation page with initial data for editing
    navigate("/admin/projects/new", { state: { initial: p, projectId: p.id } });
  };

  const filtered = projects.filter(p => p.title.toLowerCase().includes(debouncedQuery.trim().toLowerCase()));

  function ProjectCard({ p, selected, setSelected, toggle, openEdit, delOne }: { p: Project; selected: number[]; setSelected: (v: number[]) => void; toggle: (id: number) => void; openEdit: (p: Project) => void; delOne: (id: number) => void; }) {
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
        navigateLocal(`/admin/projects/${p.id}`);
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
            aria-label="Select project"
          >
            {selected.includes(p.id) ? <Check className="w-6 h-6 text-orange" /> : <div className="w-5 h-5 border border-gray-border rounded-sm" />}
          </button>
        )}

        {/* Image */}
        {p.media && p.media[0] && p.media[0].image ? (
          <img src={p.media[0].image} alt={p.title} className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 bg-white/60 flex items-center justify-center text-sm">No image</div>
        )}

        <div className="p-4">
          <h3 className="font-lufga text-xl mb-2">{p.title}</h3>
        </div>

        {/* three-dots menu bottom-right */}
        <div className="absolute right-3 bottom-3 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/80 hover:bg-white transition-shadow"><MoreHorizontal className="w-5 h-5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" onClick={(e) => e.stopPropagation()} className="bg-white/60 backdrop-blur-md border border-gray-border rounded-2xl shadow-lg p-2">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEdit(p); }} className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-orange"/>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); delOne(p.id); }} className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600"/>Delete</DropdownMenuItem>
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
                <Button variant="ghost" onClick={() => setSelected(prev => prev.length === projects.length ? [] : projects.map(p => p.id))} className="px-3 py-1 text-sm">Select all</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full bg-white/90 hover:bg-white transition-shadow" aria-label="Actions">
                      <MoreHorizontal className="w-5 h-5 text-dark" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" align="end" className="bg-white/60 backdrop-blur-md border border-gray-border rounded-2xl shadow-lg p-2 mt-1 z-50">
                    <DropdownMenuItem disabled={selected.length !== 1} onSelect={(e) => { e.preventDefault(); if (selected.length === 1) { const p = projects.find(x => x.id === selected[0]); if (p) openEdit(p); } }} className={`flex items-center gap-2 ${selected.length !== 1 ? 'opacity-50 cursor-not-allowed' : ''}`}><Edit3 className="w-4 h-4 text-orange"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); delSelected(); }} className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600"/>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h1 className="font-lufga text-3xl lg:text-4xl"><span className="text-dark">Manage </span><span className="text-orange">Projects</span></h1>
              <div className="flex items-center gap-3">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="h-12 w-64" />
                <Button variant="admin" onClick={() => navigate("/admin/projects/new")} className="h-12 rounded-full">Create</Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="ml-auto text-sm text-gray-text">{projects.length} projet(s)</div>
          </div>

          {loading ? <div className="text-lg text-gray-text">Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProjectCard key={p.id} p={p} selected={selected} setSelected={setSelected} toggle={toggle} openEdit={openEdit} delOne={delOne} />
              ))}

              {filtered.length === 0 && !loading ? <div className="text-center text-gray-text col-span-full py-8">No projects found.</div> : null}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
