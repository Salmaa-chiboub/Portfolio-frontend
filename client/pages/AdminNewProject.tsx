import { useEffect, useState } from "react";
import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ProjectForm } from "./AdminDashboard";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/config";
import AdminBack from "@/components/ui/AdminBack";
import { Button } from "@/components/ui/button";

export default function AdminNewProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as any;
  const initial = state.initial;
  const projectId = state.projectId as number | undefined;

  type SkillRef = { id: number; name: string; icon?: string };
  const [skillRefs, setSkillRefs] = React.useState<SkillRef[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const url = getApiUrl("/api/skills/references/");
    setLoading(true);
    fetchWithAuth(url, { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) ? setSkillRefs(d) : setSkillRefs([]))
      .catch(() => setSkillRefs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <AdminBack variant="admin" />
          <h1 className="font-lufga text-3xl"><span className="text-dark">{projectId ? "Edit" : "Create"} </span><span className="text-orange">Project</span></h1>
        </div>
        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6">
          <ProjectForm
            skillRefs={skillRefs}
            loading={loading}
            initial={initial}
            projectId={projectId}
            onDone={() => navigate("/admin/projects", { replace: true })}
          />
        </div>
      </div>
    </div>
  );
}
