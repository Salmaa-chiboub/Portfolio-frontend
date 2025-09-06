import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import AdminGuard from "@/components/auth/AdminGuard";
import AdminBack from "@/components/ui/AdminBack";
import { Search, Trash2, Plus, RefreshCw } from "lucide-react";

type SkillRef = { id: number; name: string; icon?: string };

type Skill = { id: number; reference: SkillRef };

export default function AdminSkills() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Add/search references
  const [refQuery, setRefQuery] = useState("");
  const [refLoading, setRefLoading] = useState(false);
  const [refResults, setRefResults] = useState<SkillRef[]>([]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getApiUrl("/api/skills/"), { cache: "no-store" });
      const data = await res.json();
      setSkills(Array.isArray(data) ? data : []);
    } catch {
      setSkills([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSkills(); }, []);

  // Debounced ref search
  useEffect(() => {
    const q = refQuery.trim();
    if (!q) { setRefResults([]); return; }
    const t = setTimeout(async () => {
      setRefLoading(true);
      try {
        const res = await fetchWithAuth(getApiUrl(`/api/skills/references/?search=${encodeURIComponent(q)}`), { cache: "no-store" });
        const data = await res.json();
        setRefResults(Array.isArray(data) ? data : []);
      } catch { setRefResults([]); }
      finally { setRefLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [refQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(s => s.reference?.name?.toLowerCase().includes(q));
  }, [skills, query]);

  const onAdd = async (ref: SkillRef) => {
    // prevent duplicate
    if (skills.some((s) => s.reference?.id === ref.id)) { toast({ title: 'Already added', description: `Skill "${ref.name}" is already present.` }); return; }
    try {
      const res = await fetchWithAuth(getApiUrl("/api/skills/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_id: ref.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast({ title: "Added", description: `Skill \"${ref.name}\" added.` });
      setRefQuery("");
      setRefResults([]);
      await loadSkills();
    } catch {
      toast({ title: "Error", description: "Failed to add skill." });
    }
  };

  const onDelete = async (skill: Skill) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/skills/${skill.id}/`), { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(String(res.status));
      toast({ title: "Deleted", description: `Skill removed.` });
      setSkills(prev => prev.filter(s => s.id !== skill.id));
    } catch {
      toast({ title: "Error", description: "Failed to delete skill." });
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-dark overflow-hidden">

      <div className="container mx-auto max-w-7xl px-4 pt-0 pb-10 lg:pt-0 lg:pb-16 relative z-10">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <AdminBack variant="admin" />
            <h1 className="font-lufga text-3xl lg:text-4xl"><span className="text-dark">Manage </span><span className="text-orange">Skills</span></h1>
          </div>

          <div className="mt-3">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-border">
                <Search className="w-4 h-4 text-orange" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills" className="w-full font-lufga text-sm focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white text-gray-text border border-gray-border shadow-sm p-6 lg:p-10">

          {/* Add skill from references */}
          <div className="rounded-2xl bg-gray-bg border border-gray-border p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-orange" />
              <h2 className="font-lufga text-dark">Add from catalog</h2>
            </div>
            <div className="relative">
              <Input placeholder="Search in catalog (e.g., React, Python)" value={refQuery} onChange={(e) => setRefQuery(e.target.value)} />
              {refLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-lighter">Searching…</div>}
            </div>
            {refResults.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto">
                {refResults.map((r) => (
                  <button key={r.id} onClick={() => onAdd(r)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-border hover:bg-black/5 text-left">
                    {r.icon ? <img src={r.icon} alt={r.name} className="w-4 h-4" /> : <span className="w-4 h-4" />}
                    <span className="font-lufga text-sm text-dark">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Skills list (LinkedIn-inspired chips) */}
          <div>
            {loading ? (
              <div className="text-gray-text">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-gray-text">No skills.</div>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {filtered.map((s) => (
                  <li key={s.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-border shadow-sm">
                    {s.reference?.icon ? <img src={s.reference.icon} alt={s.reference.name} className="w-4 h-4" /> : null}
                    <span className="font-lufga text-sm text-dark">{s.reference?.name || `#${s.id}`}</span>
                    <button onClick={() => onDelete(s)} className="w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-black/5" aria-label="Delete skill">
                      <Trash2 className="w-4 h-4 text-orange" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
