import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Mock/proxy endpoints to support frontend during local dev
  app.get("/api/core/hero/", async (_req, res) => {
    try {
      if (!apiBase) {
        return res.json([
          {
            id: 1,
            headline: "Product Designer & UX Specialist",
            subheadline:
              "Creating exceptional digital experiences through innovative design solutions that drive business growth and user satisfaction.",
            image: null,
            instagram: "",
            linkedin: "",
            github: "",
            order: 1,
            is_active: true,
          },
        ]);
      }
      const target = `${apiBase}/api/core/hero/`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ([]));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  app.get("/api/core/about/", async (_req, res) => {
    try {
      if (!apiBase) {
        return res.json({
          id: 1,
          title: "About Me",
          description:
            "I'm Salma Chiboub, a passionate Product Designer creating digital experiences that make a difference.",
          cv: "",
          hiring_email: "salma.chiboub@gmail.com",
          updated_at: new Date().toISOString(),
        });
      }
      const target = `${apiBase}/api/core/about/`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  app.get("/api/skills/", async (_req, res) => {
    try {
      if (!apiBase) {
        return res.json([]);
      }
      const target = `${apiBase}/api/skills/`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ([]));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  app.get("/api/blog/posts/", async (_req, res) => {
    try {
      if (!apiBase) {
        return res.json([]);
      }
      const target = `${apiBase}/api/blog/posts/`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ([]));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  app.get("/api/experiences/", async (req, res) => {
    try {
      if (!apiBase) {
        return res.json({ count: 0, next: null, previous: null, results: [] });
      }
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const target = `${apiBase}/api/experiences/${qs}`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  // Proxy projects endpoints to external backend if VITE_API_BASE_URL is set
  const apiBase = (process.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  // Contact endpoint: mock in dev or proxy to backend when configured
  app.post("/api/core/contact/", async (req, res) => {
    try {
      const name = String(req.body?.name || "");
      const email = String(req.body?.email || "");
      const subject = String(req.body?.subject || "");
      const message = String(req.body?.message || "");
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ detail: "Invalid payload" });
      }
      if (!apiBase) {
        return res.status(200).json({ ok: true });
      }
      const target = `${apiBase}/api/core/contact/`;
      const r = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const status = r.status;
      const data = await r.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  app.get("/api/projects/", async (req, res) => {
    try {
      if (!apiBase) {
        // Provide sensible mock data in dev if no backend configured
        return res.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              title: "Sample Project A",
              description: "A sample project shown when no backend is configured.",
              media: [{ id: 11, image: "/project-placeholder.svg", order: 0 }],
              skills_list: ["React", "TypeScript", "TailwindCSS"],
              links: [],
            },
            {
              id: 2,
              title: "Sample Project B",
              description: "Another sample project with placeholder media.",
              media: [{ id: 21, image: "/project-placeholder.svg", order: 0 }],
              skills_list: ["Django", "REST API"],
              links: [],
            },
          ],
        });
      }
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const target = `${apiBase}/api/projects/${qs}`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  app.get("/api/projects/:id/", async (req, res) => {
    try {
      if (!apiBase) {
        const rawId = String(req.params.id || "0");
        const idNum = Number.parseInt(rawId, 10) || 0;
        return res.json({
          id: idNum,
          title: `Sample Project ${idNum}`,
          description: "Detailed project view when backend is not configured.",
          media: [{ id: idNum * 10 + 1, image: "/project-placeholder.svg", order: 0 }],
          skills_list: ["Placeholder", "Mock"],
          links: [],
        });
      }
      const id = encodeURIComponent(String(req.params.id));
      const target = `${apiBase}/api/projects/${id}/`;
      const r = await fetch(target, { headers: { Accept: "application/json" } });
      const status = r.status;
      const data = await r.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  // Forward experience creation with auth if backend configured
  app.post("/api/experiences/", async (req, res) => {
    try {
      if (!apiBase) {
        return res.status(501).json({ detail: "Backend not configured" });
      }
      const target = `${apiBase}/api/experiences/`;
      const auth = req.header("authorization") || req.header("Authorization");
      const r = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(auth ? { Authorization: auth } : {}),
        },
        body: JSON.stringify(req.body || {}),
      });
      const status = r.status;
      const data = await r.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (e) {
      res.status(502).json({ detail: "Upstream error" });
    }
  });

  return app;
}
