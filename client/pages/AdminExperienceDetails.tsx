import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getApiUrl } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronLeft, Edit3, Trash2 } from "lucide-react";
import AdminBack from "@/components/ui/AdminBack";

export default function AdminExperienceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [links, setLinks] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(getApiUrl(`/api/experiences/${id}/`), { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setItem(data);
        try {
          const lr = await fetchWithAuth(getApiUrl(`/api/experiences/${id}/links/`), { cache: "no-store" });
          if (lr.ok) {
            const ld = await lr.json();
            setLinks(Array.isArray(ld) ? ld : []);
          }
        } catch (_) {}
      } catch (e) {
        toast({ title: "Error", description: "Failed to load experience." });
      } finally { setLoading(false); }
    })();
  }, [id]);

  const onEditNavigate = () => { if (!item) return; navigate('/admin/experiences/new', { state: { initial: item, experienceId: item.id } }); };

  const onDelete = async () => {
    if (!item) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/experiences/${item.id}/`), { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      toast({ title: "Deleted", description: "Experience deleted." });
      navigate('/admin/experiences', { replace: true });
    } catch {
      toast({ title: "Error", description: "Failed to delete." });
    }
  };

  if (loading) return <div className="p-8 text-gray-text">Loading...</div>;
  if (!item) return (
    <div className="p-8">
      <div className="mb-4">No experience selected.</div>
      <AdminBack variant="admin" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <AdminBack variant="admin" />
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors" aria-label="Actions">
                    <MoreHorizontal className="w-5 h-5 text-dark" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end" onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-border rounded-2xl shadow-lg p-2">
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEditNavigate(); }} className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-orange"/>Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(); }} className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600"/>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="font-lufga font-bold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              <span className="block text-dark">{item.title}</span>
              <span className="block h-1 mt-2 w-24 bg-orange rounded-full" aria-hidden="true" />
            </h1>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6">
          <div className="prose max-w-none">
            {(item.company || item.start_date || item.end_date || item.is_current || item.experience_type) && (
              <div className="mb-4">
                {item.company ? <div className="font-lufga text-sm font-semibold text-dark">{item.company}</div> : null}
                {item.experience_type ? <div className="font-lufga text-sm font-semibold text-dark">{item.experience_type}</div> : null}
                {(item.start_date || item.end_date || item.is_current) ? (
                  <div className="text-sm font-semibold text-dark">
                    {item.start_date ? item.start_date : ''}{item.end_date ? ` - ${item.end_date}` : (item.is_current ? ' • Present' : '')}
                  </div>
                ) : null}
              </div>
            )}

            {item.description && item.description.includes("<") ? (
              <div dangerouslySetInnerHTML={{ __html: item.description }} />
            ) : (
              <div className="whitespace-pre-wrap break-words break-all text-gray-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.description}</div>
            )}

            {item.skills && item.skills.length > 0 ? (
              <div className="mt-6">
                <h3 className="font-lufga text-xl font-bold text-orange mb-2">Stack / Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {item.skills.map((s: any, i: number) => (
                    <div key={i} className="px-3 py-1 rounded-full bg-white border border-gray-border text-sm flex items-center gap-2">
                      {s.icon ? <img src={s.icon} alt={s.name} className="w-4 h-4" /> : null}
                      <span className="text-dark">{s.name || s.skill_reference?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {links && links.length > 0 ? (
              <div className="mt-6">
                <h3 className="font-lufga text-xl font-bold text-orange mb-2">Liens</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  {links.map((l) => (
                    <a key={l.id || l.url} href={l.url} target="_blank" rel="noreferrer" className="text-orange underline">{l.text || l.url}</a>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}
