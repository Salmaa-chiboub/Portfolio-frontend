import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProjectDetail from "./pages/ProjectDetail";
import Blogs from "./pages/Blogs";
import BlogDetail from "./pages/BlogDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGuard from "./components/auth/AdminGuard";
import AdminLayout from "./components/layouts/AdminLayout";
import AdminMessages from "./pages/AdminMessages";
import AdminNewProject from "./pages/AdminNewProject";
import AdminProjectDetails from "./pages/AdminProjectDetails";
import AdminNewExperience from "./pages/AdminNewExperience";
import AdminExperiences from "./pages/AdminExperiences";
import AdminExperienceDetails from "./pages/AdminExperienceDetails";
import AdminNewBlog from "./pages/AdminNewBlog";
import AdminSkills from "./pages/AdminSkills";
import AdminHeroAbout from "./pages/AdminHeroAbout";
import AdminProfile from "./pages/AdminProfile";
import AdminProjects from "./pages/AdminProjects";
import AdminBlogs from "./pages/AdminBlogs";
import AdminBlogDetails from "./pages/AdminBlogDetails";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/blog" element={<Blogs />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/admin" element={<AdminLogin />} />

        {/* Admin area uses a persistent layout so sidebar remains fixed */}
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

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
