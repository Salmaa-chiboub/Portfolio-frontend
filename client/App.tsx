import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Blogs = lazy(() => import("./pages/Blogs"));
const Projects = lazy(() => import("./pages/Projects"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminGuard = lazy(() => import("./components/auth/AdminGuard"));
const AdminLayout = lazy(() => import("./components/layouts/AdminLayout"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const AdminNewProject = lazy(() => import("./pages/AdminNewProject"));
const AdminProjectDetails = lazy(() => import("./pages/AdminProjectDetails"));
const AdminNewExperience = lazy(() => import("./pages/AdminNewExperience"));
const AdminExperiences = lazy(() => import("./pages/AdminExperiences"));
const AdminExperienceDetails = lazy(() => import("./pages/AdminExperienceDetails"));
const AdminNewBlog = lazy(() => import("./pages/AdminNewBlog"));
const AdminSkills = lazy(() => import("./pages/AdminSkills"));
const AdminHeroAbout = lazy(() => import("./pages/AdminHeroAbout"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminProjects = lazy(() => import("./pages/AdminProjects"));
const AdminBlogs = lazy(() => import("./pages/AdminBlogs"));
const AdminBlogDetails = lazy(() => import("./pages/AdminBlogDetails"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

// Compute build id consistent with addCacheBuster and update preload for LCP image to match final URL
try {
  const BUILD_ID = (typeof window !== 'undefined' && (import.meta as any).hot) ? String(Date.now()) : ((import.meta as any).env?.VITE_BUILD_ID as string) || '1';
  // find preload for caracter.avif and append cache buster
  if (typeof document !== 'undefined') {
    const sel = 'link[rel="preload"][as="image"]';
    const links = Array.from(document.querySelectorAll(sel));
    for (const l of links) {
      const href = (l as HTMLLinkElement).href || (l as HTMLLinkElement).getAttribute('href') || '';
      if (href && href.indexOf('caracter.avif') !== -1 && !/([?&])v=/.test(href)) {
        try {
          const url = new URL(href, window.location.href);
          url.searchParams.set('v', BUILD_ID);
          (l as HTMLLinkElement).href = url.toString();
        } catch {
          // ignore
        }
      }
    }
  }
} catch (e) {
  // ignore errors
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/blog" element={<Blogs />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin/*" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id" element={<AdminProjectDetails />} />
            <Route path="projects/new" element={<AdminNewProject />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="experiences" element={<AdminExperiences />} />
            <Route path="experiences/:id" element={<AdminExperienceDetails />} />
            <Route path="experiences/new" element={<AdminNewExperience />} />
            <Route path="blog" element={<AdminBlogs />} />
            <Route path="blog/new" element={<AdminNewBlog />} />
            <Route path="blog/:id" element={<AdminBlogDetails />} />
            <Route path="skills" element={<AdminSkills />} />
            <Route path="content" element={<AdminHeroAbout />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
