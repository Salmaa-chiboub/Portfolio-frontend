import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { clearTokens } from "@/lib/auth";
import { useEffect, useState, useRef } from "react";
import { LayoutDashboard, FolderKanban, FileText, BadgeCheck, Briefcase, LogOut, Search, X, UserCircle2, MessageSquare, Plus, Menu } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import RichTextTextarea from "@/components/ui/rich-text";
import { toast } from "@/hooks/use-toast";
import { getApiUrl, MAX_PROJECT_IMAGES, MAX_PROJECT_LINKS } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { isValidUrl } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="font-lufga text-3xl lg:text-4xl"><span className="text-dark">Admin </span><span className="text-orange">Dashboard</span></h1>
          </div>
        </div>

        <div className="rounded-3xl bg-white text-gray-text border border-gray-border shadow-sm p-6 lg:p-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-gray-bg border border-gray-border p-6">
              <h2 className="font-lufga text-xl mb-2 text-dark">Welcome</h2>
              <p className="text-gray-text font-lufga">You are authenticated. Tokens auto-refresh while you stay here.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function ExperienceForm({ skillRefs, loading, onDone, initial, experienceId, onCancel }: { skillRefs: { id: number; name: string; icon?: string }[]; loading: boolean; onDone: (updated?: any) => void; initial?: any; experienceId?: number; onCancel?: () => void; }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [type, setType] = useState(initial?.experience_type || "job");
  const [start, setStart] = useState(initial?.start_date || "");
  const [end, setEnd] = useState(initial?.end_date || "");
  const [current, setCurrent] = useState(Boolean(initial?.is_current));
  const [description, setDescription] = useState(initial?.description || "");
  const [selected, setSelected] = useState<number[]>(initial?.skills ? (Array.isArray(initial.skills) ? initial.skills.map((s: any) => s.skill_reference || s.id).filter(Boolean) : []) : (initial?.skills_list ? initial.skills_list.map((s: any) => s.id).filter(Boolean) : []));
  const [submitting, setSubmitting] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const [tzOpen, setTzOpen] = useState(false);

  // links support
  const [links, setLinks] = useState<{ id?: number; url: string; text: string }[]>(initial?.links ? initial.links : []);

  // LinkedIn-like skill input state (local only for experience form)
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);

  useEffect(() => {
    // when initial changes (editing), sync state
    setTitle(initial?.title || "");
    setCompany(initial?.company || "");
    setLocation(initial?.location || "");
    setType(initial?.experience_type || "job");
    setStart(initial?.start_date || "");
    setEnd(initial?.end_date || "");
    setCurrent(Boolean(initial?.is_current));
    setDescription(initial?.description || "");
    setSelected(initial?.skills ? (Array.isArray(initial.skills) ? initial.skills.map((s: any) => s.skill_reference || s.id).filter(Boolean) : []) : (initial?.skills_list ? initial.skills_list.map((s: any) => s.id).filter(Boolean) : []));
    setLinks(initial?.links ? initial.links.map((l: any) => ({ id: l.id, url: l.url || "", text: l.text || (l.url || "") })) : []);
  }, [initial]);

  const toggle = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const valid = title.trim().length >= 3 && description.trim().length >= 10 && !!start;

  const allTimeZones = (() => {
    try {
      // @ts-ignore
      if (typeof Intl !== "undefined" && (Intl as any).supportedValuesOf) {
        // @ts-ignore
        return (Intl as any).supportedValuesOf("timeZone") as string[];
      }
    } catch {}
    return ["UTC", "Europe/Paris", "Africa/Casablanca", "America/New_York", "Asia/Tokyo", "Europe/London"];
  })();
  const tzSuggestions = location.trim()
    ? allTimeZones.filter(z => z.toLowerCase().includes(location.trim().toLowerCase())).slice(0, 10)
    : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // validate links URLs
    const invalidLink = links.find((l) => l.url && !isValidUrl(l.url));
    if (invalidLink) { toast({ title: "Invalid URL", description: `Please enter a valid URL: ${invalidLink.url}` }); return; }

    if (!valid) { toast({ title: "Invalid form", description: "Please fill required fields." }); return; }
    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(), company: company.trim(), location: location.trim(),
        experience_type: type.trim(), start_date: start, end_date: current ? null : (end || null),
        description: description, is_current: current, skills_data: selected,
      };

      // include links_data to replace links when editing or creating
      if (links.length > 0) {
        const cleaned = links.map((l, i) => ({ url: (l.url || "").trim(), text: (l.text || l.url || "").trim(), order: i })).filter(l => l.url);
        payload.links_data = cleaned;
      } else if (experienceId) {
        // send empty array to clear existing links
        payload.links_data = [];
      }

      // include any newly added free-text skills on the frontend
      if (newSkills.length > 0) {
        payload.new_skills = newSkills;
      }

      const url = experienceId ? getApiUrl(`/api/experiences/${experienceId}/`) : getApiUrl('/api/experiences/');
      const method = experienceId ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json().catch(() => null);
      toast({ title: experienceId ? 'Updated' : 'Created', description: experienceId ? 'Experience updated.' : 'Experience added.' });
      onDone && onDone(data);
    } catch {
      toast({ title: 'Error', description: experienceId ? 'Failed to update experience.' : 'Failed to create experience.' });
    } finally { setSubmitting(false); }
  };

  const addLink = () => setLinks((prev) => [...prev, { url: '', text: '' }]);
  const removeNewLink = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index));

  const deleteExistingLink = async (linkId?: number) => {
    if (!experienceId || !linkId) return toast({ title: 'Error', description: "Unable to delete link without experienceId." });
    try {
      const url = getApiUrl(`/api/experiences/${experienceId}/links/${linkId}/`);
      const res = await fetchWithAuth(url, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(String(res.status));
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      toast({ title: 'Deleted', description: 'Link deleted.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete link.' });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <div className="relative">
          <Input placeholder="Location / Time zone" value={location} onChange={(e) => { setLocation(e.target.value); setTzOpen(true); }} onFocus={() => setTzOpen(true)} />
          {tzOpen && tzSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-border bg-white/90 backdrop-blur-md shadow-lg max-h-48 overflow-auto">
              {tzSuggestions.map((z) => (
                <button type="button" key={z} onClick={() => { setLocation(z); setTzOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-black/5 font-lufga text-sm text-dark">
                  {z}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Experience type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} disabled={current} />
      </div>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> Current</label>
      <RichTextTextarea placeholder="Description" value={description} onChange={(v) => setDescription(v)} rows={6} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-lufga text-sm">Skills</div>
        </div>

        {/* Tags for selected skills and new skills */}
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((id) => {
            const s = skillRefs.find((x: any) => x.id === id);
            return (
              <div key={id} className="px-3 py-1 rounded-full bg-white border border-gray-border text-sm flex items-center gap-2">
                {s?.icon ? <img src={s.icon} alt={s.name} className="w-4 h-4" /> : null}
                <span>{s?.name || id}</span>
                <button type="button" onClick={() => setSelected((prev) => prev.filter((x) => x !== id))} className="ml-2 p-1 rounded-full hover:bg-black/5">✖</button>
              </div>
            );
          })}

          {newSkills.map((ns, i) => (
            <div key={`ns-${i}`} className="px-3 py-1 rounded-full bg-white border border-gray-border text-sm flex items-center gap-2">
              <span>{ns}</span>
              <button type="button" onClick={() => setNewSkills((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 p-1 rounded-full hover:bg-black/5">✖</button>
            </div>
          ))}
        </div>

        {/* Add skill input (toggleable) */}
        {showSkillInput ? (
          <div className="relative">
            <Input placeholder="Search or add a skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} className="w-full" />
            <button type="button" onClick={() => { setShowSkillInput(false); setSkillInput(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5">✖</button>

            {/* Suggestions dropdown */}
            {(skillInput.trim().length > 0) && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-border bg-white/90 backdrop-blur-md shadow-lg max-h-48 overflow-auto">
                {loading ? <div className="p-2 text-sm text-gray-text">Loading...</div> : skillRefs
                  .filter((s) => s.name.toLowerCase().includes(skillInput.trim().toLowerCase()) && !selected.includes(s.id))
                  .slice(0, 20)
                  .map((s) => (
                    <button key={s.id} type="button" onClick={() => { setSelected((prev) => prev.includes(s.id) ? prev : [...prev, s.id]); setSkillInput(''); setShowSkillInput(false); }} className="w-full text-left px-3 py-2 hover:bg-black/5 font-lufga text-sm text-dark flex items-center gap-2">
                      {s.icon ? <img src={s.icon} alt={s.name} className="w-4 h-4" /> : null}
                      <span>{s.name}</span>
                    </button>
                  ))}

                {/* Option to add new skill if not found */}
                {!loading && !skillRefs.some((s) => s.name.toLowerCase() === skillInput.trim().toLowerCase()) && (
                  <div className="p-2">
                    <button type="button" onClick={() => { if (skillInput.trim()) { setNewSkills((prev) => [...prev, skillInput.trim()]); setSkillInput(''); setShowSkillInput(false); } }} className="w-full text-left px-3 py-2 hover:bg-black/5 font-lufga text-sm text-dark">Add "{skillInput.trim()}"</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Add Skill button always visible and moves below search */}
        <div className="mt-2">
          <Button type="button" variant="outline" onClick={() => setShowSkillInput(true)} className="rounded-full inline-flex items-center gap-2"><Plus className="w-4 h-4"/>Add Skill</Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-lufga text-sm">Liens</label>
          <Button type="button" variant="outline" onClick={addLink}>Add URL</Button>
        </div>
        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                <Input placeholder="URL" value={l.url} onChange={(e) => setLinks((prev) => { const arr = prev.slice(); arr[i] = { ...arr[i], url: e.target.value }; return arr; })} className="sm:col-span-3" />
                <Input placeholder="Text" value={l.text} onChange={(e) => setLinks((prev) => { const arr = prev.slice(); arr[i] = { ...arr[i], text: e.target.value }; return arr; })} className="sm:col-span-2" />
                <button type="button" onClick={async () => { if (links[i]?.id && experienceId) { await deleteExistingLink(links[i].id); } else { removeNewLink(i); } }} className="p-2 rounded-md bg-white/80 hover:bg-white border border-gray-border"><X className="w-4 h-4 text-dark" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel || onDone}>Cancel</Button><Button variant="admin" type="submit" disabled={!valid || submitting}>{submitting ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>Saving...</span> : "Save"}</Button></div>
    </form>
  );
}

export function ProjectForm({ skillRefs, loading, onDone, initial, projectId, onCancel }: { skillRefs: { id: number; name: string; icon?: string }[]; loading: boolean; onDone: (updated?: any) => void; initial?: any; projectId?: number; onCancel?: () => void; }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");

  // new files to upload
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // existing media fetched from initial
  const [existingMedia, setExistingMedia] = useState<{ id: number; image?: string | null }[]>(initial?.media ? initial.media.map((m: any) => ({ id: m.id, image: m.image })) : []);

  const [selected, setSelected] = useState<number[]>(initial?.skills_list ? initial.skills_list.map((s: any) => s.id).filter(Boolean) : []);
  const [submitting, setSubmitting] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const [links, setLinks] = useState<{ id?: number; url: string; text: string }[]>([]);

  // New LinkedIn-like skills UI state
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);

  const inputRefProj = useRef<HTMLInputElement | null>(null);
  const triggerPickerProj = () => inputRefProj.current?.click();

  useEffect(() => {
    // sync fields when initial changes
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setSelected(initial?.skills_list ? initial.skills_list.map((s: any) => s.id).filter(Boolean) : []);
    setExistingMedia(initial?.media ? initial.media.map((m: any) => ({ id: m.id, image: m.image })) : []);
    setNewImages([]);
    setPreviews([]);
    if (initial && Array.isArray(initial.links) && initial.links.length > 0) {
      setLinks(initial.links.map((l: any) => ({ id: l.id, url: l.url || '', text: l.text || (l.url || '') })));
    } else {
      setLinks([]);
    }
  }, [initial]);

  useEffect(() => {
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [newImages]);

  const addProjectFiles = (fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const incoming = Array.from(fl);
    setNewImages((prev) => {
      const currentCount = prev.length + existingMedia.length;
      const space = Math.max(0, MAX_PROJECT_IMAGES - currentCount);
      const next = prev.concat(incoming.slice(0, space));
      return next;
    });
  };

  const removeNewImage = (index: number) => setNewImages((prev) => prev.filter((_, i) => i !== index));

  const [deletedMediaIds, setDeletedMediaIds] = useState<number[]>([]);
  const [deletedProjectLinkIds, setDeletedProjectLinkIds] = useState<number[]>([]);

  const deleteExistingMedia = (mediaId: number) => {
    // defer deletion until submit
    setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
    setDeletedMediaIds((prev) => prev.includes(mediaId) ? prev : [...prev, mediaId]);
  };

  const deleteExistingLink = (linkId: number) => {
    // defer deletion until submit
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    setDeletedProjectLinkIds((prev) => prev.includes(linkId) ? prev : [...prev, linkId]);
  };

  const toggle = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const totalImages = existingMedia.length + newImages.length;
  const valid = title.trim().length >= 3 && description.trim().length >= 10 && totalImages <= MAX_PROJECT_IMAGES;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // validate links URLs
    const invalidLink = links.find((l) => l.url && !isValidUrl(l.url));
    if (invalidLink) { toast({ title: 'Invalid URL', description: `Please enter a valid URL: ${invalidLink.url}` }); return; }

    if (!valid) { toast({ title: 'Invalid form', description: `Please check fields (max ${MAX_PROJECT_IMAGES} images).` }); return; }
    setSubmitting(true);
    try {
      // if editing and there are deleted media ids, delete them first
      if (projectId && deletedMediaIds && deletedMediaIds.length > 0) {
        for (const mId of deletedMediaIds) {
          try {
            const delUrl = getApiUrl(`/api/projects/${projectId}/media/${mId}/`);
            await fetchWithAuth(delUrl, { method: 'DELETE' });
          } catch (e) {
            console.warn('Failed to delete media during submit', mId, e);
          }
        }
        setDeletedMediaIds([]);
      }

      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description || '');

      const cleanedLinks = links
        .map((l, i) => ({ url: (l.url || '').trim(), text: (l.text || l.url || '').trim(), order: i }))
        .filter((l) => l.url);
      fd.append('links_data', JSON.stringify(cleanedLinks));

      selected.forEach((id) => fd.append('skills', String(id)));
      // include any newly added free-text skills on the frontend
      if (newSkills.length > 0) {
        fd.append('new_skills', JSON.stringify(newSkills));
      }

      // include new media files if any (backend will replace existing media when provided)
      newImages.slice(0, MAX_PROJECT_IMAGES).forEach((f) => fd.append('media_files', f));

      const url = projectId ? getApiUrl(`/api/projects/${projectId}/`) : getApiUrl('/api/projects/');
      const method = projectId ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, body: fd });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      toast({ title: projectId ? 'Updated' : 'Created', description: projectId ? 'Project updated.' : 'Project added.' });
      onDone && onDone(data);
    } catch {
      toast({ title: 'Error', description: projectId ? 'Failed to update project.' : 'Failed to create project.' });
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-12 text-lg" />
      <RichTextTextarea placeholder="Description" value={description} onChange={(v) => setDescription(v)} rows={6} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-lufga text-sm">Skills</div>
        </div>

        {/* Tags for selected skills and new skills */}
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((id) => {
            const s = skillRefs.find((x: any) => x.id === id);
            return (
              <div key={id} className="px-3 py-1 rounded-full bg-white border border-gray-border text-sm flex items-center gap-2">
                {s?.icon ? <img src={s.icon} alt={s.name} className="w-4 h-4" /> : null}
                <span>{s?.name || id}</span>
                <button type="button" onClick={() => setSelected((prev) => prev.filter((x) => x !== id))} className="ml-2 p-1 rounded-full hover:bg-black/5">✖</button>
              </div>
            );
          })}

          {newSkills.map((ns, i) => (
            <div key={`ns-${i}`} className="px-3 py-1 rounded-full bg-white border border-gray-border text-sm flex items-center gap-2">
              <span>{ns}</span>
              <button type="button" onClick={() => setNewSkills((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 p-1 rounded-full hover:bg-black/5">✖</button>
            </div>
          ))}
        </div>

        {/* Add skill input (toggleable) */}
        {showSkillInput ? (
          <div className="relative">
            <Input placeholder="Search or add a skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} className="w-full" />
            <button type="button" onClick={() => { setShowSkillInput(false); setSkillInput(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5">✖</button>

            {/* Suggestions dropdown */}
            {(skillInput.trim().length > 0) && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-border bg-white/90 backdrop-blur-md shadow-lg max-h-48 overflow-auto">
                {loading ? <div className="p-2 text-sm text-gray-text">Loading...</div> : skillRefs
                  .filter((s) => s.name.toLowerCase().includes(skillInput.trim().toLowerCase()) && !selected.includes(s.id))
                  .slice(0, 20)
                  .map((s) => (
                    <button key={s.id} type="button" onClick={() => { setSelected((prev) => prev.includes(s.id) ? prev : [...prev, s.id]); setSkillInput(''); setShowSkillInput(false); }} className="w-full text-left px-3 py-2 hover:bg-black/5 font-lufga text-sm text-dark flex items-center gap-2">
                      {s.icon ? <img src={s.icon} alt={s.name} className="w-4 h-4" /> : null}
                      <span>{s.name}</span>
                    </button>
                  ))}

                {/* Option to add new skill if not found */}
                {!loading && !skillRefs.some((s) => s.name.toLowerCase() === skillInput.trim().toLowerCase()) && (
                  <div className="p-2">
                    <button type="button" onClick={() => { if (skillInput.trim()) { setNewSkills((prev) => [...prev, skillInput.trim()]); setSkillInput(''); setShowSkillInput(false); } }} className="w-full text-left px-3 py-2 hover:bg-black/5 font-lufga text-sm text-dark">Add "{skillInput.trim()}"</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Add Skill button always visible and moves below search */}
        <div className="mt-2">
          <Button type="button" variant="outline" onClick={() => setShowSkillInput(true)} className="rounded-full inline-flex items-center gap-2"><Plus className="w-4 h-4"/>Add Skill</Button>
        </div>
      </div>

      <div>
        <label className="font-lufga text-sm">Images (max {MAX_PROJECT_IMAGES})</label>
        <div className="flex items-center gap-3 mt-1">
          <input ref={inputRefProj} type="file" accept="image/*" multiple onChange={(e) => { addProjectFiles(e.target.files); if (inputRefProj.current) inputRefProj.current.value = ''; }} className="hidden" />
          <Button type="button" variant="outline" onClick={triggerPickerProj} disabled={totalImages >= MAX_PROJECT_IMAGES} className="rounded-full">Insert picture</Button>
          <span className="text-sm text-gray-light">{totalImages}/{MAX_PROJECT_IMAGES}</span>
        </div>

        {/* existing media */}
        {existingMedia.length > 0 && (
          <div className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {existingMedia.map((m) => (
                <div key={m.id} className="relative group">
                  <img src={m.image || '/project-placeholder.svg'} alt={`media-${m.id}`} className="w-full h-24 object-cover rounded-xl border border-gray-border" />
                  <button type="button" aria-label="Remove media" onClick={() => deleteExistingMedia(m.id)} className="absolute top-1 right-1 p-1 rounded-full bg-white/90 border border-gray-border hover:bg-white"><X className="w-4 h-4 text-dark" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* new images preview */}
        {newImages.length > 0 && (
          <div className="mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {newImages.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative group">
                  <img src={previews[i]} alt={f.name} className="w-full h-24 object-cover rounded-xl border border-gray-border" />
                  <button type="button" aria-label="Remove image" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-white/90 border border-gray-border hover:bg-white"><X className="w-4 h-4 text-dark" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-lufga text-sm">URLs</label>
          <Button type="button" variant="outline" onClick={() => setLinks((prev) => [...prev, { url: '', text: '' }])}>Add URL</Button>
        </div>
        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                <Input placeholder="URL" value={l.url} onChange={(e) => setLinks((prev) => { const arr = prev.slice(); arr[i] = { ...arr[i], url: e.target.value }; return arr; })} className="sm:col-span-3" />
                <Input placeholder="Text" value={l.text} onChange={(e) => setLinks((prev) => { const arr = prev.slice(); arr[i] = { ...arr[i], text: e.target.value }; return arr; })} className="sm:col-span-2" />
                <button type="button" onClick={async () => { if (l.id && projectId) { await deleteExistingLink(l.id); } else { setLinks((prev) => prev.filter((_, idx) => idx !== i)); } }} className="p-2 rounded-md bg-white/80 hover:bg-white border border-gray-border"><X className="w-4 h-4 text-dark" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button variant="admin" type="submit" disabled={!valid || submitting}>{submitting ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>Saving...</span> : 'Save'}</Button></div>
    </form>
  );
}

export function BlogForm({ onDone, initial, postId, onCancel }: { onDone: () => void; initial?: any; postId?: number | string; onCancel?: () => void; }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // newImages are files chosen in the editor
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newCaptions, setNewCaptions] = useState<string[]>([]);

  // existingImages come from the server and can be edited/deleted individually
  const [existingImages, setExistingImages] = useState<{ id: number; image?: string | null; caption?: string | null }[]>([]);

  const [links, setLinks] = useState<{ id?: number; url: string; text: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Use the shared project images limit so both forms stay consistent
  const MAX_BLOG_IMAGES = MAX_PROJECT_IMAGES;
  const totalImagesCount = existingImages.length + newImages.length;
  const valid = title.trim().length >= 3 && content.trim().length >= 10 && totalImagesCount <= MAX_BLOG_IMAGES;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerPicker = () => inputRef.current?.click();

  // previews for newly selected files
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [newImages]);

  // initialize form from `initial` when editing
  useEffect(() => {
    setTitle(initial?.title || "");
    setContent(initial?.content || "");
    // existing images
    if (initial && Array.isArray(initial.images) && initial.images.length > 0) {
      setExistingImages(initial.images.map((m: any) => ({ id: m.id, image: m.image || null, caption: m.caption || "" })));
    } else {
      setExistingImages([]);
    }
    // links
    if (initial && Array.isArray(initial.links) && initial.links.length > 0) {
      setLinks(initial.links.map((l: any) => ({ id: l.id, url: l.url || '', text: l.text || (l.url || '') })));
    } else {
      setLinks([]);
    }
    // reset new images
    setNewImages([]);
    setNewCaptions([]);
  }, [initial]);

  const addFiles = (fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const incoming = Array.from(fl);
    setNewImages((prev) => {
      const currentCount = existingImages.length + prev.length;
      const space = Math.max(0, MAX_BLOG_IMAGES - currentCount);
      const next = prev.concat(incoming.slice(0, space));
      // keep captions in sync with images length
      setNewCaptions((cPrev) => {
        const arr = cPrev.slice(0, next.length);
        while (arr.length < next.length) arr.push("");
        return arr;
      });
      return next;
    });
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== index));
    setNewCaptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [deletedLinkIds, setDeletedLinkIds] = useState<number[]>([]);

  const deleteExistingImage = (imageId: number) => {
    // Defer actual backend deletion until Save/submit.
    setExistingImages((prev) => prev.filter((m) => m.id !== imageId));
    setDeletedImageIds((prev) => prev.includes(imageId) ? prev : [...prev, imageId]);
  };

  const updateExistingCaption = async (imageId: number, caption: string) => {
    if (!postId) return;
    try {
      const url = getApiUrl(`/api/blog/posts/${postId}/images/${imageId}/`);
      const res = await fetchWithAuth(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption }) });
      if (!res.ok) throw new Error(String(res.status));
      setExistingImages((prev) => prev.map((m) => (m.id === imageId ? { ...m, caption } : m)));
      toast({ title: "Updated", description: "Caption updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update caption." });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // validate links URLs
    const invalidLink = links.find((l) => l.url && !isValidUrl(l.url));
    if (invalidLink) { toast({ title: "Invalid URL", description: `Please enter a valid URL: ${invalidLink.url}` }); return; }

    if (!valid) { toast({ title: "Invalid form", description: "Please fill required fields or reduce number of images." }); return; }
    // uniqueness check: ensure title is unique (case-insensitive)
    try {
      const q = title.trim();
      if (q.length > 0) {
        try {
          const checkRes = await fetchWithAuth(getApiUrl(`/api/blog/posts/?search=${encodeURIComponent(q)}`), { cache: "no-store" });
          if (checkRes.ok) {
            const list = await checkRes.json();
            const matches = Array.isArray(list) ? list : (list?.results || []);
            const identifier = String(postId ?? "");
            const conflicting = matches.find((item: any) => {
              const sameTitle = (item.title || "").trim().toLowerCase() === q.toLowerCase();
              const sameIdentity = String(item.id) === identifier || String(item.slug) === identifier;
              return sameTitle && !sameIdentity;
            });
            if (conflicting) {
              toast({ title: "Duplicate title", description: "A blog post with the same title already exists. Please choose a different title." });
              return;
            }
          }
        } catch (e) {
          // ignore check failures and continue to submit — backend should still validate
          console.warn("Title uniqueness check failed", e);
        }
      }
    } catch (e) {
      // fallthrough
    }

    setSubmitting(true);
    try {
      // if editing and there are deleted images, perform deletions first
      if (postId && deletedImageIds && deletedImageIds.length > 0) {
        for (const imgId of deletedImageIds) {
          try {
            const delUrl = getApiUrl(`/api/blog/posts/${postId}/images/${imgId}/`);
            await fetchWithAuth(delUrl, { method: 'DELETE' });
          } catch (e) {
            // ignore per-image delete errors
            console.warn('Failed to delete image during submit', imgId, e);
          }
        }
        // clear deletion list
        setDeletedImageIds([]);
      }

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content);

      // links: when editing we send full links_data to replace existing links
      if (links.length > 0) {
        const cleaned = links.map((l, i) => ({ url: (l.url || '').trim(), text: (l.text || l.url || '').trim(), order: i })).filter(l => l.url);
        if (cleaned.length > 0) fd.append("links_data", JSON.stringify(cleaned));
      } else {
        // send empty array to clear links if none
        fd.append("links_data", JSON.stringify([]));
      }

      // If there are newly selected images, include them. Note: backend will replace existing images when uploaded_images is provided.
      if (newImages.length > 0) {
        newImages.slice(0, MAX_BLOG_IMAGES).forEach((f) => fd.append("uploaded_images", f));
        const meta = newImages.map((_, i) => ({ caption: newCaptions[i] || "" }));
        fd.append("images_meta", JSON.stringify(meta));
      }

      const url = postId ? getApiUrl(`/api/blog/posts/${postId}/`) : getApiUrl("/api/blog/posts/");
      const method = postId ? "PUT" : "POST";
      const res = await fetchWithAuth(url, { method, body: fd });
      if (!res.ok) throw new Error(String(res.status));

      // if creating, backend handled images. If editing and we only modified captions/deletions, updates already applied.
      toast({ title: postId ? "Updated" : "Created", description: postId ? "Blog post updated." : "Blog post added." });
      onDone();
    } catch {
      toast({ title: "Error", description: postId ? "Failed to update blog post." : "Failed to create blog post." });
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <RichTextTextarea placeholder="Content" value={content} onChange={(v) => setContent(v)} rows={8} />

      <div>
        <label className="font-lufga text-sm">Images (max {MAX_BLOG_IMAGES})</label>
        <div className="flex items-center gap-3 mt-1">
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = ""; }} className="hidden" />
          <Button type="button" variant="outline" onClick={triggerPicker} disabled={totalImagesCount >= MAX_BLOG_IMAGES} className="rounded-full">Insert picture</Button>
          <span className="text-sm text-gray-light">{totalImagesCount}/{MAX_BLOG_IMAGES}</span>
        </div>

        {/* Existing images (editable captions + delete) */}
        {existingImages.length > 0 && (
          <div className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {existingImages.map((m) => (
                <div key={m.id} className="relative group">
                  <img src={m.image || '/project-placeholder.svg'} alt={`img-${m.id}`} className="w-full h-24 object-cover rounded-xl border border-gray-border" />
                  <button type="button" aria-label="Remove image" onClick={() => deleteExistingImage(m.id)} className="absolute top-1 right-1 p-1 rounded-full bg-white/90 border border-gray-border hover:bg-white"><X className="w-4 h-4 text-dark" /></button>
                  <div className="mt-2">
                    <Input placeholder="Caption (optional)" defaultValue={m.caption || ""} onBlur={(e) => updateExistingCaption(m.id, e.target.value)} className="h-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New images preview + captions */}
        {newImages.length > 0 && (
          <div className="mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {newImages.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative group">
                  <img src={previews[i]} alt={f.name} className="w-full h-24 object-cover rounded-xl border border-gray-border" />
                  <button type="button" aria-label="Remove image" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-white/90 border border-gray-border hover:bg-white"><X className="w-4 h-4 text-dark" /></button>
                  <div className="mt-2">
                    <Input placeholder="Caption (optional)" value={newCaptions[i] || ""} onChange={(e) => setNewCaptions((prev) => { const arr = prev.slice(); arr[i] = e.target.value; return arr; })} className="h-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-lufga text-sm">Links</label>
          <Button type="button" variant="outline" onClick={() => setLinks((prev) => [...prev, { url: "", text: "" }])}>Add link</Button>
        </div>
        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                <Input placeholder="URL" value={l.url} onChange={(e) => setLinks((prev) => { const arr = prev.slice(); arr[i] = { ...arr[i], url: e.target.value }; return arr; })} className="sm:col-span-3" />
                <Input placeholder="Text" value={l.text} onChange={(e) => setLinks((prev) => { const arr = prev.slice(); arr[i] = { ...arr[i], text: e.target.value }; return arr; })} className="sm:col-span-2" />
                <button type="button" onClick={() => {
                  if (l.id) {
                    // mark for deletion and remove from UI; actual delete happens on submit
                    setLinks((prev) => prev.filter((_, idx) => idx !== i));
                    setDeletedLinkIds((prev) => l.id && !prev.includes(l.id as number) ? [...prev, l.id as number] : prev);
                  } else {
                    setLinks((prev) => prev.filter((_, idx) => idx !== i));
                  }
                }} className="p-2 rounded-md bg-white/80 hover:bg-white border border-gray-border">
                  <X className="w-4 h-4 text-dark" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel || onDone}>Cancel</Button><Button variant="admin" type="submit" disabled={!valid || submitting}>{submitting ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>Saving...</span> : "Save"}</Button></div>
    </form>
  );
}
