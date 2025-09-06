import React, { useEffect, useRef, useState } from "react";
import { Plus, X, Briefcase, FolderKanban, BadgeCheck, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FabMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const actions = [
    { key: "experience", label: "Add Experience", icon: Briefcase, to: "/admin/experiences/new" },
    { key: "project", label: "Add Project", icon: FolderKanban, to: "/admin/projects/new" },
    { key: "skill", label: "Add Skill", icon: BadgeCheck, to: "/admin/skills" },
    { key: "blog", label: "Add Blog", icon: FileText, to: "/admin/blog/new" },
  ];

  const handleAction = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div ref={ref} className="fixed left-6 bottom-6 z-50 flex flex-col items-start">
      <div className="mb-4 flex flex-col items-start">
        {actions.map((a, idx) => {
          const Icon = a.icon as any;
          const delay = `${idx * 50}ms`;
          return (
            <button
              key={a.key}
              onClick={() => handleAction(a.to)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`group relative mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-border shadow-sm text-dark transform transition-all duration-200 ${open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95 pointer-events-none"}`}
              style={{ transitionDelay: open ? delay : "0ms" }}
              title={a.label}
            >
              <Icon className="w-5 h-5 text-orange" />
              <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-black text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {a.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close actions" : "Open actions"}
        className={`w-16 h-16 rounded-full bg-orange text-white shadow-xl flex items-center justify-center transform transition-all duration-200 ${open ? "rotate-45" : "rotate-0"}`}
      >
        {open ? <X className="w-7 h-7" /> : <Plus className="w-8 h-8" />}
      </button>
    </div>
  );
}
