import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderKanban, FileText, BadgeCheck, Briefcase, LogOut, Search, UserCircle2, MessageSquare, Menu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchWithAuth, clearTokens } from "@/lib/auth";
import { getApiUrl } from "@/lib/config";
import FabMenu from "@/components/ui/FabMenu";
import { Button } from "@/components/ui/button";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const url = getApiUrl('/api/core/admin/contacts/?page_size=100');
        if (!url) return;
        const res = await fetchWithAuth(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        const count = list.filter((m: any) => !m.is_read).length;
        setUnreadMessages(count);
      } catch (e) {
        // ignore
      }
    };
    loadUnread();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply as any);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", apply) : mq.removeListener(apply as any); };
  }, []);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, onClick: () => navigate("/admin/dashboard") },
    { key: "projects", label: "Projects", icon: FolderKanban, onClick: () => navigate("/admin/projects") },
    { key: "blogs", label: "Blogs", icon: FileText, onClick: () => navigate("/admin/blog") },
    { key: "content", label: "Content", icon: FileText, onClick: () => navigate("/admin/content") },
    { key: "skills", label: "Skills", icon: BadgeCheck, onClick: () => navigate("/admin/skills") },
    { key: "experiences", label: "Experiences", icon: Briefcase, onClick: () => navigate("/admin/experiences") },
  ];

  return (
    <div className="relative min-h-screen bg-white text-dark overflow-hidden">
      {/* Top transparent navbar */}
      <nav className="fixed top-0 left-0 right-0 z-30">
        <div className="container mx-auto max-w-7xl px-4" style={{ paddingRight: isMobile ? "0rem" : (sidebarOpen ? "20rem" : "3.5rem") }}>
          <div className="mt-3 flex items-center justify-between rounded-full border border-gray-border bg-white/50 backdrop-blur-md px-4 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <button className="lg:hidden p-2 rounded-full hover:bg-black/5" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(v => !v)}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 bg-orange rounded-full">
                <span className="font-lufga text-white text-sm">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Open search"
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <button onClick={() => navigate("/admin/messages")} className="p-2 rounded-full hover:bg-black/5 transition-colors" aria-label="Messages">
                  <MessageSquare className="w-5 h-5" />
                </button>
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange ring-2 ring-white" aria-hidden="true" />
                )}
              </div>

              <button onClick={() => navigate('/admin/profile')} className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-black/5 transition-colors" aria-label="Profile">
                <UserCircle2 className="w-6 h-6" />
                <span className="hidden sm:inline font-lufga text-sm">You</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-white/70 backdrop-blur-md border border-gray-border rounded-2xl w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-lufga text-dark">Search</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-orange" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-3 rounded-full bg-white border border-gray-border text-gray-text font-lufga text-base focus:outline-none"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Right hover sidebar (persistent) */}
      <div
        className="fixed right-0 top-0 h-screen z-40 group"
        onMouseEnter={() => { if (!isMobile) setSidebarOpen(true); }}
        onMouseLeave={() => { if (!isMobile) setSidebarOpen(false); }}
      >
        <div
          className={
            "h-full overflow-hidden border-l border-white/10 backdrop-blur-lg bg-black/80 transition-all duration-300 rounded-l-3xl " +
            (sidebarOpen ? (isMobile ? "w-64" : "w-80") : (isMobile ? "w-0" : "w-14"))
          }
        >
          <div className="h-16 flex items-center justify-center border-b border-white/10">
            <div className="flex items-center gap-2 px-3 py-1 bg-orange rounded-full">
              <span className="font-lufga text-white text-sm">Admin</span>
            </div>
          </div>

          <nav className="py-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <button
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-white shrink-0" />
                      <span className={(sidebarOpen ? "opacity-100" : "opacity-0") + " transition-opacity font-lufga text-sm text-orange"}>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="absolute bottom-4 left-0 right-0 px-2">
            <button
              onClick={() => { clearTokens(); navigate("/admin", { replace: true }); }}
              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5 text-white shrink-0" />
              <span className={(sidebarOpen ? "opacity-100" : "opacity-0") + " transition-opacity font-lufga text-sm"}>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content area where child routes render */}
      <div className="container mx-auto max-w-full px-4 pt-[5.5rem] pb-10 lg:pt-[5.5rem] lg:pb-16 relative z-10" style={{ paddingRight: isMobile ? "0rem" : (sidebarOpen ? "20rem" : "3.5rem") }}>
        <Outlet />
      </div>

      {/* Floating action button bottom-left (global) */}
      <FabMenu />
    </div>
  );
}
