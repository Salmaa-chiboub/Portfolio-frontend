import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApiUrl } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import AdminBack from "@/components/ui/AdminBack";
import BlogDetail from "./BlogDetail";

export default function AdminBlogDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slug, setSlug] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(getApiUrl(`/api/blog/posts/${id}/`), { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const s = data?.slug || (data?.id ? String(data.id) : null);
        setSlug(s);
      } catch (e) {
        toast({ title: "Error", description: "Failed to load article." });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-gray-text">Loading...</div>;
  if (!slug) return (
    <div className="p-8">
      <div className="mb-4">Article introuvable.</div>
      <AdminBack variant="admin" />
    </div>
  );

  // Render the public BlogDetail component and pass the resolved slug
  return <BlogDetail slugParam={slug} />;
}
