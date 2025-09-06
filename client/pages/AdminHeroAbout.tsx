import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextTextarea from "@/components/ui/rich-text";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/config";
import { Edit, Trash2 } from "lucide-react";

type Hero = {
  id: number;
  headline: string;
  subheadline: string;
  image: string | null;
  instagram?: string;
  linkedin?: string;
  github?: string;
  order?: number;
  is_active?: boolean;
};

type About = {
  id: number;
  title: string;
  description: string;
  cv?: string;
  hiring_email?: string;
  updated_at?: string;
};

export default function AdminHeroAbout() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [about, setAbout] = useState<About | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [k: string]: boolean }>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Admin endpoints require auth - fetch admin hero list
        const hr = await fetchWithAuth(getApiUrl("/api/core/admin/hero/"));
        const hb = hr.ok ? await hr.json() : [];
        // About public view returns the current about record; we'll update via admin detail endpoint
        const ar = await fetchWithAuth(getApiUrl("/api/core/about/"));
        const ab = ar.ok ? await ar.json() : null;
        if (!mounted) return;
        setHeroes(Array.isArray(hb) ? hb : []);
        setAbout(ab && typeof ab === "object" ? ab : null);
      } catch (e) {
        toast({ title: "Error", description: "Failed to load content." });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Local file states for hero images and about CV
  const [heroFiles, setHeroFiles] = useState<Record<number, File | null>>({});
  const [heroPreviews, setHeroPreviews] = useState<Record<number, string>>({});
  const [aboutCvFile, setAboutCvFile] = useState<File | null>(null);

  const updateHero = async (id: number) => {
    const hero = heroes.find((h) => h.id === id);
    if (!hero) return;
    setSaving((s) => ({ ...s, [`hero-${id}`]: true }));

    try {
      const fd = new FormData();
      fd.append("headline", hero.headline || "");
      fd.append("subheadline", hero.subheadline || "");
      fd.append("instagram", hero.instagram || "");
      fd.append("linkedin", hero.linkedin || "");
      fd.append("github", hero.github || "");
      fd.append("is_active", hero.is_active ? "true" : "false");

      const file = heroFiles[id];
      if (file) {
        fd.append("image", file);
      } else {
        // If hero.image is falsy and no file uploaded, instruct backend to clear image
        if (!hero.image) fd.append("image-clear", "1");
      }

      const res = await fetchWithAuth(getApiUrl(`/api/core/admin/hero/${id}/`), {
        method: "PUT",
        body: fd,
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = await res.json().catch(() => null);
      setHeroes((prev) => prev.map((h) => (h.id === id ? { ...(h as any), ...(updated || hero) } : h)));
      // clear file after successful upload
      setHeroFiles((prev) => ({ ...prev, [id]: null }));
      setHeroPreviews((prev) => ({ ...prev, [id]: prev[id] || "" }));
      toast({ title: "Saved", description: "Hero updated." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update hero." });
    } finally {
      setSaving((s) => ({ ...s, [`hero-${id}`]: false }));
    }
  };

  const saveAllHeroes = async () => {
    // Validate required fields before saving
    const invalid = heroes.filter((h) => !h.headline || h.headline.trim().length < 3);
    if (invalid.length > 0) {
      toast({ title: "Validation error", description: `Please ensure each hero has a headline (min 3 chars). Found ${invalid.length} invalid.` });
      return;
    }

    // Save all heroes sequentially
    for (const h of heroes) {
      // eslint-disable-next-line no-await-in-loop
      await updateHero(h.id);
    }
  };

  const updateAbout = async () => {
    if (!about) return;
    // Validate required about fields
    if (!about.title || about.title.trim().length < 3) { toast({ title: "Validation error", description: "Title must be at least 3 characters." }); return; }
    if (!about.description || about.description.trim().length < 10) { toast({ title: "Validation error", description: "Description must be at least 10 characters." }); return; }

    setSaving((s) => ({ ...s, about: true }));
    try {
      const fd = new FormData();
      fd.append("title", about.title || "");
      fd.append("description", about.description || "");
      fd.append("hiring_email", about.hiring_email || "");
      if (aboutCvFile) fd.append("cv", aboutCvFile);

      const res = await fetchWithAuth(getApiUrl(`/api/core/admin/about/${about.id}/`), {
        method: "PUT",
        body: fd,
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = await res.json().catch(() => null);
      setAbout((prev) => ({ ...(prev as About), ...(updated || about) }));
      setAboutCvFile(null);
      toast({ title: "Saved", description: "About updated." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update about." });
    } finally {
      setSaving((s) => ({ ...s, about: false }));
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-lufga text-3xl"><span className="text-dark">Edit </span><span className="text-orange">Content</span></h1>
        </div>

        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6 space-y-6">
          <section>
            <h2 className="font-lufga text-xl mb-3 text-dark">Hero section</h2>
            {loading ? <div className="text-sm text-gray-text">Loading...</div> : (
              <div className="space-y-4">
                {heroes.length === 0 && <div className="text-sm text-gray-text">No hero records found.</div>}
                {heroes.map((h) => (
                  <div key={h.id} className="rounded-xl border border-gray-border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-sm text-gray-light">Headline</label>
                        <Input value={h.headline} onChange={(e) => setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, headline: e.target.value } : x))} />

                        <label className="text-sm text-gray-light">Subheadline</label>
                        <Textarea value={h.subheadline} onChange={(e) => setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, subheadline: e.target.value } : x))} rows={3} />

                        <label className="text-sm text-gray-light">Instagram URL</label>
                        <Input value={h.instagram || ""} onChange={(e) => setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, instagram: e.target.value } : x))} placeholder="https://instagram.com/yourprofile" />

                        <label className="text-sm text-gray-light">LinkedIn URL</label>
                        <Input value={h.linkedin || ""} onChange={(e) => setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, linkedin: e.target.value } : x))} placeholder="https://linkedin.com/in/yourprofile" />

                        <label className="text-sm text-gray-light">Github URL</label>
                        <Input value={h.github || ""} onChange={(e) => setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, github: e.target.value } : x))} placeholder="https://github.com/yourusername" />

                      </div>
                      <div className="flex flex-col items-start gap-2">
                        <label className="text-sm text-gray-light">Active</label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={!!h.is_active} onChange={(e) => setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, is_active: e.target.checked } : x))} />
                          <span className="text-sm">Show</span>
                        </label>

                        <div className="mt-4">
                          <input
                            id={`hero-file-${h.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files ? e.target.files[0] : null;
                              setHeroFiles((prev) => ({ ...prev, [h.id]: f }));
                              if (f) setHeroPreviews((prev) => ({ ...prev, [h.id]: URL.createObjectURL(f) }));
                            }}
                            className="hidden"
                          />

                          <div className="group relative w-72 h-72 rounded-full overflow-hidden border border-gray-border bg-gray-bg flex items-center justify-center">
                            { (heroPreviews[h.id] || h.image) ? (
                              <img src={heroPreviews[h.id] || h.image || ""} alt={h.headline} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center text-sm text-gray-light">No image</div>
                            ) }

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <label htmlFor={`hero-file-${h.id}`} className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center cursor-pointer" title="Replace image"><Edit className="w-5 h-5 text-orange" /></label>
                              <button type="button" onClick={() => { setHeroes((prev) => prev.map(x => x.id === h.id ? { ...x, image: null } : x)); setHeroFiles((prev) => ({ ...prev, [h.id]: null })); }} className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center" title="Remove image"><Trash2 className="w-5 h-5 text-red-600" /></button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button variant="admin" onClick={saveAllHeroes} disabled={heroes.length === 0}>{"Save"}</Button>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-lufga text-xl mb-3 text-dark">About</h2>
            {loading ? <div className="text-sm text-gray-text">Loading...</div> : (
              <div className="space-y-3">
                {about ? (
                  <div className="rounded-xl border border-gray-border p-4">
                    <label className="text-sm text-gray-light">Title</label>
                    <Input value={about.title} onChange={(e) => setAbout((prev) => prev ? { ...prev, title: e.target.value } : prev)} />
                    <label className="text-sm text-gray-light mt-2">Description</label>
                    <RichTextTextarea value={about.description} onChange={(v) => setAbout((prev) => prev ? { ...prev, description: v } : prev)} rows={6} />
                    <label className="text-sm text-gray-light mt-2">CV</label>
                    <div className="flex items-center gap-3">
                      <input id="about-cv-file" type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => {
                        const f = e.target.files ? e.target.files[0] : null;
                        setAboutCvFile(f);
                      }} className="hidden" />
                      <label htmlFor="about-cv-file" className="px-3 py-2 rounded-full border border-gray-border hover:bg-black/5 cursor-pointer font-lufga text-sm">Insert CV</label>
                      <span className="text-sm text-gray-light">{aboutCvFile ? aboutCvFile.name : (about.cv ? "Existing CV" : "No CV")}</span>
                      {about.cv ? <a className="text-xs text-orange ml-2" href={about.cv} target="_blank" rel="noreferrer">View current</a> : null}
                    </div>
                    <label className="text-sm text-gray-light mt-2">Hiring Email</label>
                    <Input value={about.hiring_email || ""} onChange={(e) => setAbout((prev) => prev ? { ...prev, hiring_email: e.target.value } : prev)} />
                  </div>
                ) : (
                  <div className="text-sm text-gray-text">No about record found.</div>
                )}

                <div className="mt-4 flex justify-end">
                  <Button variant="admin" onClick={updateAbout} disabled={!!saving.about}>{saving.about ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>Saving...</span> : "Save"}</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
