import { useNavigate, useLocation } from "react-router-dom";
import { BlogForm } from "./AdminDashboard";
import { Button } from "@/components/ui/button";
import AdminBack from "@/components/ui/AdminBack";

export default function AdminNewBlog() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as any;
  const initial = state.initial;
  const postId = state.postId as string | number | undefined;

  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <AdminBack variant="admin" />
          <h1 className="font-lufga text-3xl"><span className="text-dark">{postId ? "Edit" : "Create"} </span><span className="text-orange">Blog Post</span></h1>
        </div>
        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6">
          <BlogForm initial={initial} postId={postId} onDone={() => navigate("/admin/blog", { replace: true })} />
        </div>
      </div>
    </div>
  );
}
