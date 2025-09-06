import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Trash2 } from "lucide-react";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  is_read: boolean;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export default function AdminMessages() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) =>
      (m.name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.subject || "").toLowerCase().includes(q) ||
      (m.message || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const buildNextUrl = (u: string | null) => {
    if (!u) return null;
    try {
      const parsed = new URL(u);
      const pathWithQuery = `${parsed.pathname}${parsed.search}`;
      const rel = getApiUrl(pathWithQuery);
      return rel || u;
    } catch {
      return getApiUrl(u) || u;
    }
  };

  useEffect(() => {
    const url = getApiUrl("/api/core/admin/contacts/");
    if (!url) return;
    setLoading(true);
    setError(null);
    fetchWithAuth(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Paginated<ContactMessage> | ContactMessage[]) => {
        if (Array.isArray(data)) {
          setItems(data);
          setNextUrl(null);
        } else {
          setItems(data.results || []);
          setNextUrl(data.next ?? null);
        }
      })
      .catch(() => setError("Failed to load messages."))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    const u = buildNextUrl(nextUrl);
    if (!u) return;
    try {
      setLoading(true);
      const r = await fetchWithAuth(u, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const data: Paginated<ContactMessage> | ContactMessage[] = await r.json();
      if (Array.isArray(data)) {
        setItems((prev) => [...prev, ...data]);
        setNextUrl(null);
      } else {
        setItems((prev) => [...prev, ...(data.results || [])]);
        setNextUrl(data.next ?? null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load more messages." });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    const url = getApiUrl(`/api/core/admin/contacts/${id}/`);
    try {
      const r = await fetchWithAuth(url, { method: "DELETE" });
      if (!r.ok) throw new Error(String(r.status));
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Deleted", description: "Message removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete." });
    }
  };

  return (
    <div className="min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="px-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl lg:text-3xl font-lufga">Messages</h1>
          </div>
          <div className="w-64">
            <Input placeholder="Search messages" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-gray-light font-lufga mb-4">{error}</p>}

        <div className="border border-gray-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-bg px-4 py-3 text-sm font-lufga text-gray-lighter">
            <div className="col-span-3">From</div>
            <div className="col-span-3">Subject</div>
            <div className="col-span-4">Message</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div>
            {loading && items.length === 0 && (
              <div className="p-6 text-gray-text">Loading...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-gray-text">No messages.</div>
            )}
            {filtered.map((m) => (
              <div key={m.id} className="grid grid-cols-12 px-4 py-4 border-t border-gray-border items-start">
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange" />
                    <div>
                      <div className="font-lufga text-sm text-dark">{m.name || "Anonymous"}</div>
                      <div className="text-xs text-gray-light">{m.email}</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 font-lufga text-sm text-gray-text break-words whitespace-normal">{m.subject || "(no subject)"}</div>
                <div className="col-span-4 font-lufga text-sm text-gray-text break-words whitespace-normal">{m.message}</div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => remove(m.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {nextUrl && (
          <div className="flex justify-center mt-4">
            <Button onClick={loadMore} disabled={loading} className="bg-orange text-white hover:bg-orange/90">{loading ? "Loading..." : "Load more"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
