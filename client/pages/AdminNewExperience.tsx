import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ExperienceForm } from "./AdminDashboard";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import AdminBack from "@/components/ui/AdminBack";

export default function AdminNewExperience() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: any = location.state;
  const initial = state?.initial;
  const experienceId = state?.experienceId;

  type SkillRef = { id: number; name: string; icon?: string };
  const [skillRefs, setSkillRefs] = useState<SkillRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = getApiUrl("/api/skills/references/");
    setLoading(true);
    fetchWithAuth(url, { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) ? setSkillRefs(d) : setSkillRefs([]))
      .catch(() => setSkillRefs([]))
      .finally(() => setLoading(false));
  }, []);

  const onDone = (updated?: any) => {
    if (experienceId) {
      // when editing, go back to the experience details
      navigate(`/admin/experiences/${experienceId}`, { replace: true });
    } else {
      navigate('/admin/experiences', { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-dark">
      <div className="container mx-auto max-w-full px-4 pt-0 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <AdminBack variant="admin" />
          <h1 className="font-lufga text-3xl"><span className="text-dark">{experienceId ? 'Edit' : 'Create'} </span><span className="text-orange">Experience</span></h1>
        </div>
        <div className="rounded-3xl bg-white border border-gray-border shadow-sm p-6">
          <ExperienceForm
            skillRefs={skillRefs}
            loading={loading}
            onDone={onDone}
            initial={initial}
            experienceId={experienceId}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
}
