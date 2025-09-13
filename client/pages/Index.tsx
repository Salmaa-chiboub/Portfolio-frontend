import { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getApiUrl } from "@/lib/config";
import { makeSrcSet, netlifyImagesEnabled, pingNetlifyImages } from "@/lib/images";
import { cn } from "@/lib/utils";
import { useHero, useAbout, useBlogs, useProjects, useExperiences } from "@/hooks/use-api";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";

const ExperiencesSectionLazy = lazy(() => import("@/components/experiences/ExperiencesSection"));
const ProjectsCarouselLazy = lazy(() => import("@/components/projects/ProjectsCarousel"));
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Quote,
  Send,
  ArrowUpRight,
  Menu,
  X,
  Sun,
  Moon,
  Github,
  Linkedin,
  Instagram,
} from "lucide-react";

type SkillReference = {
  id: number;
  name: string;
  icon: string;
};

type Skill = {
  id: number;
  reference: SkillReference;
};

type HeroItem = {
  id: number;
  headline: string;
  subheadline: string;
  image: string | null;
  instagram: string;
  linkedin: string;
  github: string;
  order: number;
  is_active: boolean;
};

type AboutItem = {
  id: number;
  title: string;
  description: string;
  cv: string;
  hiring_email: string | null;
  updated_at: string;
};

type ExperienceSkill = {
  id: number;
  name: string;
  icon: string | null;
};

type ExperienceItem = {
  id: number;
  skills: ExperienceSkill[];
  title: string;
  company: string;
  location: string;
  experience_type: string;
  start_date: string; // ISO
  end_date: string | null; // ISO or null
  description: string;
  is_current: boolean;
};

type BlogImage = { id: number; image: string; caption?: string | null };

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  images: BlogImage[];
  links?: { id: number; url: string; text: string }[];
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const BUILD_ID = typeof window !== "undefined" && (import.meta as any).hot ? String(Date.now()) : ((import.meta as any).env?.VITE_BUILD_ID as string) || "1";
const addCacheBuster = (u: string) => {
  try {
    const url = new URL(u, window.location.origin);
    // Only append cache buster for same-origin or root-relative assets
    const sameOrigin = url.origin === window.location.origin;
    if (sameOrigin) {
      url.searchParams.set("v", BUILD_ID);
      return url.toString();
    }
    return u; // do not mutate external URLs (avoid breaking signed URLs/CORS)
  } catch {
    const isRootRelative = u.startsWith("/");
    if (isRootRelative) {
      const sep = u.includes("?") ? "&" : "?";
      return `${u}${sep}v=${BUILD_ID}`;
    }
    return u;
  }
};

export default function Index() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { data: hero, isLoading: heroLoading, isError: heroError } = useHero();
  const { data: about, isLoading: aboutLoading, isError: aboutError } = useAbout();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsPage, setSkillsPage] = useState(0);
  const [perPage, setPerPage] = useState(12);
  const [skillsGridMinH, setSkillsGridMinH] = useState(0);

  // API availability derived from hero query
  const apiReady = heroLoading ? null : heroError ? false : true;

  // Experiences state
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expLoadingMore, setExpLoadingMore] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [expNext, setExpNext] = useState<string | null>(null);
  const [expTotalCount, setExpTotalCount] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Experiences filters/search and expansion state
  const [expFilter, setExpFilter] = useState<string>("All");
  const [expQuery, setExpQuery] = useState("");
  const [expandedExp, setExpandedExp] = useState<Record<number, boolean>>({});
  const expTypes = useMemo(() => Array.from(new Set((experiences || []).map(e => e.experience_type).filter(Boolean))), [experiences]);
  const displayedExperiences = useMemo(() => {
    let list = experiences;
    if (expFilter !== "All") list = list.filter(e => e.experience_type === expFilter);
    const q = expQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.company.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [experiences, expFilter, expQuery]);

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineProgress, setTimelineProgress] = useState(0);

  const navigate = useNavigate();
  const [contactName, setContactName] = useState("");

  // Lazy load flags for sections
  const servicesRef = useRef<HTMLDivElement | null>(null);
  const experiencesRef = useRef<HTMLDivElement | null>(null);
  const projectsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const blogRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);

  const [showServices, setShowServices] = useState(false);
  const [showExperiences, setShowExperiences] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const lowPerf = prefersReducedMotion || isMobile;
  const [useNImages, setUseNImages] = useState(netlifyImagesEnabled());
  useEffect(() => {
    let mounted = true;
    pingNetlifyImages().then((ok) => {
      if (mounted) setUseNImages(ok);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const createObs = (ref: React.RefObject<Element>, cb: () => void) => {
      if (!ref.current) return;
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            cb();
            io.disconnect();
          }
        }
      }, { rootMargin: '200px 0px' });
      io.observe(ref.current);
      observers.push(io);
    };
    try {
      if (servicesRef.current) createObs(servicesRef, () => setShowServices(true));
      if (experiencesRef.current) createObs(experiencesRef, () => setShowExperiences(true));
      if (projectsRef.current) createObs(projectsRef, () => setShowProjects(true));
      if (ctaRef.current) createObs(ctaRef, () => setShowCta(true));
      if (blogRef.current) createObs(blogRef, () => setShowBlog(true));
      if (contactRef.current) createObs(contactRef, () => setShowContact(true));
    } catch (e) {
      // ignore
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // About section lazy-load
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const [aboutInView, setAboutInView] = useState(false);
  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setAboutInView(true);
        io.disconnect();
      }
    }, { rootMargin: "200px 0px", threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, subject: false, message: false });

  const validateName = (v: string) => (v.trim().length >= 2 ? null : "Name must be at least 2 characters.");
  const validateEmail = (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Please enter a valid email.");
  const validateSubject = (v: string) => (v.trim().length >= 3 ? null : "Subject must be at least 3 characters.");
  const validateMessage = (v: string) => (v.trim().length >= 10 ? null : "Message must be at least 10 characters.");

  // Auto-dismiss contact alerts after 5s
  useEffect(() => {
    if (!contactSuccess && !contactError) return;
    const t = window.setTimeout(() => {
      setContactSuccess(null);
      setContactError(null);
    }, 5000);
    return () => window.clearTimeout(t);
  }, [contactSuccess, contactError]);

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const wheelAccumX = useRef(0);
  const wheelCooldownRef = useRef(false);
  const wheelTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let ticking = false;
    let prev = window.scrollY > 50;
    setIsScrolled(prev);
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const v = window.scrollY > 50;
        if (v !== prev) {
          prev = v;
          setIsScrolled(v);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const { data: skillsData, isLoading: skillsQueryLoading } = useQuery({
    queryKey: ["skills", skillsPage, perPage],
    queryFn: async () => {
      const url = getApiUrl(`/api/skills/?page=${skillsPage + 1}&page_size=${perPage}`);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  useEffect(() => {
    if (!skillsData) return;
    if (Array.isArray(skillsData)) setSkills(skillsData as Skill[]);
    else if (Array.isArray((skillsData as any).results)) setSkills((skillsData as any).results);
    else setSkills([]);
    setSkillsLoading(!!skillsQueryLoading);
  }, [skillsData, skillsQueryLoading]);

  // Experiences: use hook
  const { data: expData, isLoading: expQueryLoading, isError: expQueryError } = useExperiences("");

  useEffect(() => {
    if (!expData) return;
    const d = expData as any;
    const results = Array.isArray(d) ? d : d.results ?? [];
    setExperiences(results as ExperienceItem[]);
    setExpNext(d.next ?? null);
    setExpTotalCount(typeof d.count === "number" ? d.count : results.length);
    setExpLoading(!!expQueryLoading);
    setExpError(expQueryError ? "Failed to load experiences." : null);
  }, [expData, expQueryLoading, expQueryError]);

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

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (apiReady === true && entry.isIntersecting && expNext && !expLoadingMore) {
          const nextUrl = buildNextUrl(expNext);
          if (!nextUrl) return;
          setExpLoadingMore(true);
          fetch(getApiUrl(nextUrl), { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then((data: Paginated<ExperienceItem> | ExperienceItem[]) => {
              if (Array.isArray(data)) {
                setExperiences((prev) => [...prev, ...data]);
                setExpNext(null);
              } else {
                const d = data as Paginated<ExperienceItem>;
                setExperiences((prev) => [...prev, ...(d.results || [])]);
                setExpNext(d.next ?? null);
              }
            })
            .catch(() => {})
            .finally(() => setExpLoadingMore(false));
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [expNext, expLoadingMore]);

  // Timeline fill progress using IntersectionObserver (less work per scroll)
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    let last = -1;
    const thresholds = Array.from({ length: 9 }, (_, i) => i / 8);
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const p = Math.round((entry.intersectionRatio || 0) * 100);
      if (p !== last) {
        last = p;
        setTimelineProgress(p);
      }
    }, { threshold: thresholds });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const total = Math.ceil(skills.length / perPage);
    if (skillsPage >= total && total > 0) {
      setSkillsPage(total - 1);
    }
    if (total === 0 && skillsPage !== 0) {
      setSkillsPage(0);
    }
  }, [skills, perPage, skillsPage]);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      let cols = 2; // xs
      if (w >= 1280) cols = 6; // xl
      else if (w >= 1024) cols = 5; // lg
      else if (w >= 768) cols = 4; // md
      else if (w >= 640) cols = 3; // sm
      let rows = w < 768 ? 3 : 2; // default
      if (w >= 1024) rows = 3; // increase rows on desktop

      // Compute a consistent minimum height for the grid based on breakpoint styles
      let itemH = 64; // h-16 -> 4rem
      if (w >= 1024) itemH = 112; // lg:h-28 -> 7rem
      else if (w >= 768) itemH = 96; // md:h-24 -> 6rem
      else if (w >= 640) itemH = 80; // sm:h-20 -> 5rem

      let gap = 8; // gap-2 -> 0.5rem
      if (w >= 1280) gap = 24; // xl:gap-6 -> 1.5rem
      else if (w >= 1024) gap = 20; // lg:gap-5 -> 1.25rem
      else if (w >= 768) gap = 16; // md:gap-4 -> 1rem
      else if (w >= 640) gap = 12; // sm:gap-3 -> 0.75rem

      const minH = rows * itemH + (rows - 1) * gap;
      setSkillsGridMinH(minH);

      const computed = cols * rows;
      setPerPage(w >= 1024 ? Math.min(computed, 15) : computed);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleTheme = () => {
    setIsDarkMode((v) => !v);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      let initial = isDarkMode;
      if (saved === "dark") initial = true;
      else if (saved === "light") initial = false;
      else if (window.matchMedia) initial = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(initial);
      document.documentElement.classList.toggle("dark", initial);
    } catch {
      document.documentElement.classList.toggle("dark", isDarkMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    try { localStorage.setItem("theme", isDarkMode ? "dark" : "light"); } catch {}
  }, [isDarkMode]);

  // Hero typing animation
  const heroFirst = "I'm ";
  const heroSecond = "Salma Chiboub";
  const heroTotal = heroFirst.length + heroSecond.length;
  const [typedIdx, setTypedIdx] = useState(0);
  useEffect(() => {
    let id: number | null = null;
    const tick = () => setTypedIdx((v) => (v >= heroTotal ? v : v + 1));
    id = window.setInterval(tick, 80);
    return () => {
      if (id) window.clearInterval(id);
    };
  }, []);

  const aboutTitle = about?.title?.trim() || "";
  const aboutWords = aboutTitle.split(" ");
  const aboutLast = aboutWords.pop() || "";
  const aboutFirst = aboutWords.join(" ");

  const hireEmail = about?.hiring_email?.trim() || null;
  const aboutHasDesc = !!(about?.description && String(about.description).trim());
  const aboutHasCv = !!(about?.cv && String(about.cv).trim());
  const aboutHasEmail = !!(about?.hiring_email && String(about.hiring_email).trim());
  const aboutHasTitle = !!(about?.title && String(about.title).trim());
  const aboutIsEmpty = !aboutHasTitle && !aboutHasDesc && !aboutHasCv && !aboutHasEmail;
  const aboutCollapsed = aboutIsEmpty;
  const aboutDescOnly = !aboutLoading && aboutHasDesc && !aboutHasCv && !aboutHasEmail;
  const aboutCtaOnly = !aboutLoading && !aboutHasDesc && aboutHasCv && aboutHasEmail;

  // Ensure About content becomes visible once data loads, even if the observer didn't attach on first render
  useEffect(() => {
    if (!aboutCollapsed) setAboutInView(true);
  }, [aboutCollapsed]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);

    const name = contactName.trim();
    const email = contactEmail.trim();
    const subject = contactSubject.trim();
    const message = contactMessage.trim();

    // client-side validation
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    const sErr = validateSubject(subject);
    const mErr = validateMessage(message);
    setTouched({ name: true, email: true, subject: true, message: true });
    setNameError(nErr);
    setEmailError(eErr);
    setSubjectError(sErr);
    setMessageError(mErr);
    if (nErr || eErr || sErr || mErr) {
      setContactError("Please correct the highlighted fields.");
      return;
    }

    const url = getApiUrl("/api/core/contact/");
    if (!url) {
      setContactError("API URL not configured.");
      return;
    }
    setContactLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setContactSuccess("Message sent successfully.");
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
    } catch (err) {
      setContactError("Failed to send message. Please try again.");
    } finally {
      setContactLoading(false);
    }
  };

  const totalSkillPages = Math.ceil(skills.length / perPage);
  const skillsStart = skillsPage * perPage;
  const paginatedSkills = skills.slice(skillsStart, skillsStart + perPage);

  // Calculate dynamic min height based on current breakpoint columns and number of rows
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => {
      const w = window.innerWidth;
      // determine columns based on Tailwind breakpoints used in the grid
      let cols = 2;
      if (w >= 1280) cols = 6; // xl
      else if (w >= 1024) cols = 5; // lg
      else if (w >= 768) cols = 4; // md
      else if (w >= 640) cols = 3; // sm
      else cols = 2; // base

      // determine item height in px based on tailwind classes (h-16, sm:h-20, md:h-24, lg:h-28)
      let itemH = 64; // h-16 = 4rem = 64px
      if (w >= 1024) itemH = 112; // lg:h-28 = 7rem
      else if (w >= 768) itemH = 96; // md:h-24 = 6rem
      else if (w >= 640) itemH = 80; // sm:h-20 = 5rem
      else itemH = 64;

      // gap sizes in px for gap-2..gap-6
      let gap = 8;
      if (w >= 1280) gap = 24; // xl: gap-6
      else if (w >= 1024) gap = 20; // lg: gap-5
      else if (w >= 768) gap = 16; // md: gap-4
      else if (w >= 640) gap = 12; // sm: gap-3
      else gap = 8; // base gap-2

      const visibleCount = paginatedSkills.length || 0;
      const rows = visibleCount > 0 ? Math.ceil(visibleCount / cols) : 0;
      const minH = rows > 0 ? rows * itemH + Math.max(0, rows - 1) * gap : 0;
      setSkillsGridMinH(minH);
    };

    compute();
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [paginatedSkills, perPage, skills.length]);

  const pageDirRef = useRef(1);
  const skillsWheelRef = useRef<HTMLDivElement | null>(null);
  const goPrevSkillsPage = () => {
    pageDirRef.current = -1;
    setSkillsPage(Math.max(0, skillsPage - 1));
  };
  const goNextSkillsPage = () => {
    pageDirRef.current = 1;
    setSkillsPage(Math.min(Math.max(totalSkillPages - 1, 0), skillsPage + 1));
  };

  const skillsPageVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0.2 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0.2 }),
  };

  const handleSkillsTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };
  const handleSkillsTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current !== null) {
      touchDeltaX.current = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
    }
  };
  const handleSkillsTouchEnd = () => {
    const threshold = 50;
    if (Math.abs(touchDeltaX.current) > threshold) {
      if (touchDeltaX.current < 0) {
        pageDirRef.current = 1;
        goNextSkillsPage();
      } else {
        pageDirRef.current = -1;
        goPrevSkillsPage();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  useEffect(() => {
    const el = skillsWheelRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const dx = e.deltaX;
      const dy = e.deltaY;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (wheelCooldownRef.current) return;

      wheelAccumX.current += dx;
      const threshold = 80;
      if (Math.abs(wheelAccumX.current) > threshold) {
        if (wheelAccumX.current < 0) {
          pageDirRef.current = -1;
          goPrevSkillsPage();
        } else {
          pageDirRef.current = 1;
          goNextSkillsPage();
        }
        wheelAccumX.current = 0;
        wheelCooldownRef.current = true;
        if (wheelTimeoutRef.current) window.clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = window.setTimeout(() => {
          wheelCooldownRef.current = false;
        }, 500);
      }
    };
    el.addEventListener("wheel", handler, { passive: true });
    return () => {
      el.removeEventListener("wheel", handler);
      if (wheelTimeoutRef.current) window.clearTimeout(wheelTimeoutRef.current);
    };
  }, [skillsPage, totalSkillPages]);

  const formatMonthYear = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(d);
  };
  const truncate = (s: string, max: number) => {
    const str = s || "";
    if (str.length <= max) return str;
    const cut = str.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
  };

  const hasExperiences = expLoading || ((expTotalCount ?? experiences.length) > 0);

  // Blogs state
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);

  const { data: blogsData, isLoading: blogsQueryLoading, isError: blogsQueryError } = useBlogs();

  useEffect(() => {
    if (!blogsData) return;
    const d = blogsData as any;
    const results = Array.isArray(d) ? d : d.results ?? [];
    const sorted = [...results].sort((a: BlogPost, b: BlogPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setBlogs(sorted.slice(0, 3));
    setBlogsLoading(!!blogsQueryLoading);
    if (blogsQueryError) setBlogs([]);
  }, [blogsData, blogsQueryLoading, blogsQueryError]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Animated fixed background blobs (non-geometric organic shapes) */}
      {!lowPerf && (
        <div className="hero-animated-bg hidden md:block">
          <div className="hero-blob hero-blob-1 bg-orange-light" />
          <div className="hero-blob hero-blob-2 bg-orange-light" />
          <div className="hero-blob hero-blob-3 bg-orange-light" />
        </div>
      )}
      {/* Navigation - Fixed and Responsive */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "py-1" : "py-3"
        }`}
      >
        <div className="container mx-auto px-4">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between bg-dark rounded-full border border-white/10 backdrop-blur-lg px-2 py-1">
            <div className="flex items-center space-x-2">
              <div className="flex items-center px-6 py-3 bg-orange rounded-full">
                <span className="text-white font-lufga font-bold text-base tracking-tight">
                  Home
                </span>
              </div>
              <a
                href="#about"
                className="text-white font-lufga text-base px-4 py-3 hover:text-orange transition-colors rounded-full"
              >
                About
              </a>
              <a
                href="#services"
                className="text-white font-lufga text-base px-4 py-3 hover:text-orange transition-colors rounded-full"
              >
                Stack
              </a>
            </div>

            <div className="flex items-center justify-center px-4 py-3">
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-3 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors group"
                aria-label="Toggle theme"
              >
                <div className="w-9 h-9 bg-orange rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-white" />
                  ) : (
                    <Moon className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="text-white font-lufga font-bold text-base tracking-wider">
                  {isDarkMode ? "Light" : "Dark"}
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href="#resume"
                className="text-white font-lufga text-base px-4 py-3 hover:text-orange transition-colors rounded-full"
              >
                Experience
              </a>
              <a
                href="#project"
                className="text-white font-lufga text-base px-4 py-3 hover:text-orange transition-colors rounded-full"
              >
                Project
              </a>
              <a
                href="#contact"
                className="text-white font-lufga text-base px-4 py-3 hover:text-orange transition-colors rounded-full"
              >
                Contact
              </a>
            </div>
          </div>

          {/* Tablet Navigation */}
          <div className="hidden md:flex lg:hidden items-center justify-between bg-dark rounded-full border border-white/10 backdrop-blur-lg px-3 py-2">
            <div className="flex items-center space-x-1">
              <div className="flex items-center px-6 py-3 bg-orange rounded-full">
                <span className="text-white font-lufga font-bold text-sm">
                  Home
                </span>
              </div>
              <a
                href="#about"
                className="text-white font-lufga text-sm px-3 py-2 hover:text-orange transition-colors"
              >
                About
              </a>
              <a
                href="#services"
                className="text-white font-lufga text-sm px-3 py-2 hover:text-orange transition-colors"
              >
                Stack
              </a>
            </div>

            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors group"
              aria-label="Toggle theme"
            >
              <div className="w-7 h-7 bg-orange rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-white" />
                ) : (
                  <Moon className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-white font-lufga font-bold text-sm">
                {isDarkMode ? "Light" : "Dark"}
              </span>
            </button>

            <div className="flex items-center space-x-1">
              <a
                href="#resume"
                className="text-white font-lufga text-sm px-3 py-2 hover:text-orange transition-colors"
              >
                Experience
              </a>
              <a
                href="#project"
                className="text-white font-lufga text-sm px-3 py-2 hover:text-orange transition-colors"
              >
                Project
              </a>
              <a
                href="#contact"
                className="text-white font-lufga text-sm px-3 py-2 hover:text-orange transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex items-center justify-between bg-dark rounded-full border border-white/10 px-3 py-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors group"
                aria-label="Toggle theme"
              >
                <div className="w-7 h-7 bg-orange rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-white" />
                  ) : (
                    <Moon className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-white font-lufga font-bold text-sm">
                  {isDarkMode ? "Light" : "Dark"}
                </span>
              </button>

              {/* Home button */}
              <div className="flex items-center px-3 py-1 bg-orange rounded-full">
                <span className="text-white font-lufga font-bold text-sm">
                  Home
                </span>
              </div>

              {/* Menu button */}
              <button
                onClick={toggleMobileMenu}
                className="text-white p-2 hover:text-orange transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-dark rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex flex-col">
                  <a
                    href="#about"
                    className="text-white font-lufga text-sm px-5 py-3 hover:bg-orange/10 hover:text-orange transition-colors border-b border-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About
                  </a>
                  <a
                    href="#services"
                    className="text-white font-lufga text-sm px-5 py-3 hover:bg-orange/10 hover:text-orange transition-colors border-b border-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Stack
                  </a>
                  <a
                    href="#resume"
                    className="text-white font-lufga text-sm px-5 py-3 hover:bg-orange/10 hover:text-orange transition-colors border-b border-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Experience
                  </a>
                  <a
                    href="#project"
                    className="text-white font-lufga text-sm px-5 py-3 hover:bg-orange/10 hover:text-orange transition-colors border-b border-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Project
                  </a>
                  <a
                    href="#about"
                    className="text-white font-lufga text-sm px-5 py-3 hover:bg-orange/10 hover:text-orange transition-colors border-b border-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About
                  </a>
                  <a
                    href="#contact"
                    className="text-white font-lufga text-base px-6 py-4 hover:bg-orange/10 hover:text-orange transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Contact
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with proper spacing */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden pt-28 lg:pt-32">
        <div className="container mx-auto max-w-7xl relative">
          {/* Hero Content */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            {/* Left side - Text content */}
            <div className="flex-1 space-y-8 lg:space-y-12 text-center lg:text-left max-w-2xl">
              {/* Hello Badge */}
              <div className="relative inline-block">
                <div className="inline-flex items-center px-4 lg:px-6 py-2 lg:py-3 bg-white/10 border border-dark rounded-full">
                  <span className="text-dark font-lufga text-lg lg:text-xl">
                    Hello!
                  </span>
                </div>
                {/* Decorative arrow - hidden on mobile */}
                <svg
                  className="hidden lg:block absolute -top-4 -right-8 w-6 h-6 lg:w-8 lg:h-8 text-orange-light"
                  viewBox="0 0 33 33"
                  fill="none"
                >
                  <path
                    d="M2.74512 20C2.74512 17 5.74512 11 2.74512 2M10.2451 23.5C14.5785 19.3333 23.4451 9.2 24.2451 2M13.2451 30.5C15.9118 30.5 23.0451 29.1 30.2451 23.5"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Main heading - Responsive text sizes */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-urbanist font-bold leading-none tracking-tight">
                <span className="text-dark">{typedIdx <= heroFirst.length ? heroFirst.slice(0, typedIdx) : heroFirst}</span>
                <span className="text-orange">{typedIdx > heroFirst.length ? heroSecond.slice(0, Math.min(typedIdx - heroFirst.length, heroSecond.length)) : ""}</span>
              </h1>

              {/* Headline */}
              {apiReady === true && hero?.headline ? (
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-lufga font-bold text-foreground leading-tight break-words whitespace-normal">
                  {hero.headline}
                </h2>
              ) : apiReady === null ? (
                <div className="h-6 sm:h-8 lg:h-10 bg-white/10 animate-pulse rounded-md max-w-lg mx-auto lg:mx-0" />
              ) : null}

              {/* Subheadline */}
              {apiReady === true && hero?.subheadline ? (
                <p className="text-muted-foreground font-lufga text-lg lg:text-xl leading-relaxed max-w-lg mx-auto lg:mx-0">
                  {hero.subheadline}
                </p>
              ) : apiReady === null ? (
                <div className="h-4 sm:h-6 lg:h-8 bg-white/5 animate-pulse rounded-md max-w-lg mx-auto lg:mx-0" />
              ) : null}

              {/* Decorative arrow bottom - hidden on mobile */}
              <div className="hidden lg:block relative">
                <svg
                  className="w-12 h-12 lg:w-16 lg:h-16 text-orange-light"
                  viewBox="0 0 74 85"
                  fill="none"
                >
                  <path
                    d="M71.3106 36.2314C69.6282 43.8914 58.6036 57.529 61.2166 82.1913M54.1233 23.0889C40.7223 31.2977 12.4002 52.1992 6.31996 70.1346M50.3888 3.53325C43.5799 2.03784 24.5811 1.61227 3.05674 11.8733"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Right side - Image with background */}
            <div className="flex-1 flex justify-center lg:justify-end relative">
              <div className="relative -translate-y-6 sm:-translate-y-8">
                {/* Orange semicircle background */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md lg:max-w-lg xl:max-w-xl h-64 sm:h-80 lg:h-96 bg-orange-light rounded-t-full"></div>

                {/* Main image */}
                <div className="relative z-10">
                  <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg">
                    <div className="relative aspect-[4/5]">
                      {(hero && hero.image && hero.image.trim() !== "") ? (
                        <picture>
                          <source
                            type="image/avif"
                            srcSet={useNImages
                              ? makeSrcSet(addCacheBuster(hero.image), [280, 400, 512, 640, 768], "avif")
                              : addCacheBuster(hero.image)}
                            sizes="(max-width: 640px) 280px, (max-width: 1024px) 400px, 512px"
                          />
                          <source
                            type="image/webp"
                            srcSet={useNImages ? makeSrcSet(addCacheBuster(hero.image), [280, 400, 512, 640, 768], "webp") : undefined}
                            sizes="(max-width: 640px) 280px, (max-width: 1024px) 400px, 512px"
                          />
                          <motion.img
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            src={addCacheBuster(hero.image)}
                            alt={hero?.headline || "Salma Chiboub - Product Designer"}
                            className="absolute inset-0 w-full h-full object-cover rounded-none"
                            sizes="(max-width: 640px) 280px, (max-width: 1024px) 400px, 512px"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              if (!img.dataset.fallback) {
                                img.dataset.fallback = "1";
                                img.src = "/placeholder.svg";
                              }
                            }}
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: false, amount: 0.4 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                          />
                        </picture>
                      ) : (
                        <motion.img
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                          src={addCacheBuster("/caracter.avif")}
                          alt={hero?.headline || "Salma Chiboub - Product Designer"}
                          className="absolute inset-0 w-full h-full object-cover rounded-none"
                          sizes="(max-width: 640px) 280px, (max-width: 1024px) 400px, 512px"
                          onError={(e) => {
                            // ensure we always show something
                            const img = e.currentTarget as HTMLImageElement;
                            if (!img.dataset.fallback) {
                              img.dataset.fallback = "1";
                              img.src = "/placeholder.svg"; // plain path without cache buster
                            }
                          }}
                          initial={{ opacity: 0, scale: 0.98 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: false, amount: 0.4 }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Social icons - show only if at least one link exists */}
                {(() => {
                  const github = hero?.github?.trim() || "";
                  const linkedin = hero?.linkedin?.trim() || "";
                  const instagram = hero?.instagram?.trim() || "";
                  const hasAny = !!(github || linkedin || instagram);
                  if (!hasAny) return null;
                  return (
                    <div className="absolute bottom-8 sm:bottom-12 lg:bottom-16 right-4 sm:right-8 lg:right-12 z-20">
                      <div className="flex items-center bg-white/10 backdrop-blur-lg border-2 border-white rounded-full p-1 lg:p-2">
                        {github && (
                          <a
                            href={github}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="GitHub"
                            className="w-10 h-10 lg:w-12 lg:h-12 bg-orange rounded-full flex items-center justify-center mx-1 hover:bg-orange/90 transition-colors"
                          >
                            <Github className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                          </a>
                        )}
                        {linkedin && (
                          <a
                            href={linkedin}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="LinkedIn"
                            className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 border border-white/30 rounded-full flex items-center justify-center mx-1 hover:bg-white/20 transition-colors"
                          >
                            <Linkedin className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                          </a>
                        )}
                        {instagram && (
                          <a
                            href={instagram}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Instagram"
                            className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 border border-white/30 rounded-full flex items-center justify-center mx-1 hover:bg-white/20 transition-colors"
                          >
                            <Instagram className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated divider between Hero and About */}
      {!aboutCollapsed && (
        <div className="py-4 bg-background">
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-1 bg-orange rounded-full mx-auto"
            style={{ width: 96, transformOrigin: "center" }}
          />
        </div>
      )}

      {/* About Section */}
      {aboutCollapsed ? (
        <div style={{ height: 0 }} />
      ) : (
        <section id="about" className="pt-2.5 pb-16 lg:pt-2.5 lg:pb-24 bg-background" ref={aboutRef}>
          <div className="container mx-auto max-w-7xl px-4">
            {aboutCtaOnly ? (
              <div className="w-full flex items-center justify-center">
                <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                  {about?.cv && (
                    <a
                      href={about.cv}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-10 py-5 bg-orange rounded-full text-white font-lufga text-xl font-medium hover:bg-orange/90 transition-colors shadow-lg"
                    >
                      Download CV
                    </a>
                  )}
                  {about?.hiring_email && about.hiring_email.trim() !== "" && (
                    <a
                      href={`mailto:${about.hiring_email}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const email = about?.hiring_email?.trim();
                        if (!email) {
                          e.preventDefault();
                          return;
                        }
                        window.location.href = `mailto:${email}`;
                      }}
                      className="inline-flex items-center px-10 py-5 bg-white border border-gray-text rounded-full text-muted-foreground font-lufga text-xl font-medium hover:bg-gray-text hover:text-white transition-colors shadow"
                    >
                      Get in touch
                    </a>
                  )}
                </div>
              </div>
            ) : aboutDescOnly ? (
              <div className="max-w-3xl mx-auto text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-bold">
                    {aboutFirst && <span className="text-dark">{aboutFirst} </span>}
                    <span className="text-orange">{aboutLast}</span>
                  </h2>
                  <div className="w-20 h-1 bg-orange mx-auto rounded-full"></div>
                </div>
                {about?.description ? (
                  <div className="text-muted-foreground font-lufga text-lg lg:text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: about.description }} />
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
                {aboutInView && (
                  <>
                    {/* Left 35% - Motifs + Download */}
                    <div className="order-2 lg:order-1 lg:col-span-1 flex items-center justify-center">
                      <div className="relative w-full max-w-sm flex flex-col items-center justify-center min-h-[360px]">
                        {(about?.cv || (about?.hiring_email && about.hiring_email.trim() !== "")) && (
                          <>
                            <div className="mt-6 flex items-center gap-3">
                              {about?.cv && (
                                <a
                                  href={about.cv}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center px-10 py-5 bg-orange rounded-full text-white font-lufga text-xl font-medium hover:bg-orange/90 transition-colors shadow-lg"
                                >
                                  Download CV
                                </a>
                              )}
                              {about?.hiring_email && about.hiring_email.trim() !== "" && (
                                <a
                                  href={`mailto:${about.hiring_email}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const email = about?.hiring_email?.trim();
                                    if (!email) {
                                      e.preventDefault();
                                      return;
                                    }
                                    window.location.href = `mailto:${email}`;
                                  }}
                                  className="inline-flex items-center px-10 py-5 bg-white border border-gray-text rounded-full text-muted-foreground font-lufga text-xl font-medium hover:bg-gray-text hover:text-white transition-colors shadow"
                                >
                                  Get in touch
                                </a>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right 65% - About content */}
                    <div className="order-1 lg:order-2 lg:col-span-2 space-y-8 lg:space-y-10 text-center lg:text-left">
                      <div className="space-y-4">
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-bold">
                          {aboutFirst && <span className="text-dark">{aboutFirst} </span>}
                          <span className="text-orange">{aboutLast}</span>
                        </h2>
                        <div className="w-20 h-1 bg-orange mx-auto lg:mx-0 rounded-full"></div>
                      </div>

                      <div className="space-y-6">
                        {about?.description ? (
                          <div className="text-muted-foreground font-lufga text-lg lg:text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: about.description }} />
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Services Section (Section 3) - lazy render */}
      <div ref={servicesRef}>
        {(skillsLoading || skills.length > 0) ? (
          <section
            id="services"
            className="py-16 lg:py-24 bg-dark rounded-t-[50px] relative z-0 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-30 hidden md:block">
              <div className="absolute top-20 right-0 w-96 h-96 bg-orange-light rounded-full blur-3xl transform translate-x-1/2"></div>
              <div className="absolute top-10 left-1/3 w-48 h-48 bg-orange-light rounded-full blur-2xl transform -rotate-45"></div>
              <div className="absolute top-0 left-0 w-72 h-96 bg-orange-light rounded-full blur-2xl transform -translate-x-1/2 rotate-45"></div>
            </div>

            <div className="container mx-auto max-w-7xl px-4 relative z-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 lg:mb-24 space-y-6 lg:space-y-0">
                <motion.h2
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="text-3xl sm:text-4xl lg:text-5xl font-lufga font-medium"
                >
                  <span className="text-white">Tech </span>
                  <span className="text-orange">Stack</span>
                </motion.h2>
              </div>

              <div className="px-2 sm:px-4 md:px-6 lg:px-10 xl:px-14">
                <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2 sm:gap-3 md:gap-4">
                  <div className="flex justify-start">
                    {totalSkillPages > 1 && (
                      <button
                        onClick={goPrevSkillsPage}
                        aria-label="Previous skills page"
                        className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none"
                        disabled={skillsPage === 0}
                      >
                        <ChevronLeft className="w-6 h-6 text-white" />
                      </button>
                    )}
                  </div>
                  <div style={{ minHeight: skillsGridMinH }} ref={skillsWheelRef} className="relative mb-6">
                    <AnimatePresence initial={false} mode="wait" custom={pageDirRef.current}>
                      <motion.div
                        key={skillsPage}
                        custom={pageDirRef.current}
                        variants={skillsPageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.8 }}
                        className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6"
                        style={{ willChange: "transform" }}
                        onTouchStart={handleSkillsTouchStart}
                        onTouchMove={handleSkillsTouchMove}
                        onTouchEnd={handleSkillsTouchEnd}
                      >
                        {!skillsLoading &&
                          paginatedSkills.map((item) => (
                            <div key={item.id} className="relative group">
                              <div className="relative bg-gray-400/20 backdrop-blur-lg border border-white/20 rounded-3xl p-1 sm:p-1.5 md:p-2 h-16 sm:h-20 md:h-24 lg:h-28 flex flex-col items-center justify-center text-center">
                                <img
                                  loading="lazy"
                                  decoding="async"
                                  src={item.reference.icon}
                                  alt={item.reference.name}
                                  className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 object-contain mb-1 sm:mb-2 transition-opacity duration-700"
                                />
                                <h3 className="text-white font-lufga text-xs sm:text-sm md:text-base font-medium truncate w-full">
                                  {item.reference.name}
                                </h3>
                              </div>
                            </div>
                          ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="flex justify-end">
                    {totalSkillPages > 1 && (
                      <button
                        onClick={goNextSkillsPage}
                        aria-label="Next skills page"
                        className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none"
                        disabled={skillsPage >= totalSkillPages - 1}
                      >
                        <ChevronRight className="w-6 h-6 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {totalSkillPages > 1 && (
                <div className="flex justify-center space-x-3">
                  {Array.from({ length: totalSkillPages }).map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to skills page ${i + 1}`}
                      onClick={() => {
                        pageDirRef.current = i > skillsPage ? 1 : -1;
                        setSkillsPage(i);
                      }}
                      className={`w-3 h-3 rounded-full transition-colors ${i === skillsPage ? "bg-orange" : "bg-white"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : <div style={{ height: 0 }} />}
      </div>

      {/* Experiences Section */}
  <div ref={experiencesRef}>
    {(expTotalCount ?? experiences.length) > 0 ? (
      <Suspense fallback={null}>
        <ExperiencesSectionLazy />
      </Suspense>
    ) : <div style={{ height: 0 }} />}
  </div>


  {/* Projects Section */}
  <div ref={projectsRef}>
    {showProjects ? (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
        <Suspense fallback={<div style={{ minHeight: 220 }} />}>
          <ProjectsCarouselLazy />
        </Suspense>
      </motion.div>
    ) : (
      <div style={{ minHeight: 0 }} />
    )}
  </div>

      {/* CTA Section (Section 6) - lazy render */}
      <div ref={ctaRef}>
        {showCta ? (
          <section className="py-16 lg:py-24 bg-dark rounded-[50px] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 hidden md:block">
              <div className="absolute top-20 right-0 w-96 h-96 bg-orange-light rounded-full blur-3xl transform translate-x-1/2"></div>
              <div className="absolute bottom-20 left-0 w-96 h-96 bg-orange-light rounded-full blur-3xl transform -translate-x-1/2"></div>
            </div>

            <div className="container mx-auto max-w-7xl px-4 relative z-10">
              <div className="text-center py-10 lg:py-16 space-y-8">
                <motion.h2
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-2xl sm:text-4xl lg:text-5xl font-lufga font-bold"
                >
                  <span className="text-white">Have an Awesome Project Idea? </span>
                  <span className="text-orange">Let's Discuss</span>
                </motion.h2>
                <div className="mt-8">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-3 sm:gap-4 px-8 py-5 sm:px-12 sm:py-6 lg:px-14 lg:py-7 bg-orange rounded-full text-white font-lufga text-xl sm:text-2xl lg:text-3xl font-bold hover:bg-orange/90 transition-colors shadow-lg"
                  >
                    <Send className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    Let’s Contact
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div style={{ minHeight: 300 }} />
        )}
      </div>


      {/* Skills/Services stripe (Section 7) - Animated marquee design */}
      <section className="relative overflow-hidden mt-10 md:mt-12 lg:mt-16" style={{ height: '130px' }}>
        <div className="absolute inset-0 bg-orange rounded-r-[24px] flex items-center justify-end">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute left-[-10%] w-[220%]"
              style={{ height: '120px', top: '15%', transform: 'rotate(-2deg)' }}
            >
              <motion.div
                className={`bg-white flex items-center gap-4 ${lowPerf ? 'w-full' : 'w-[200%]'}`}
                animate={lowPerf ? undefined : { x: ['0%', '-50%'] }}
                transition={lowPerf ? undefined : { duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                {/* First set of items */}
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  Software Engineering
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  Web Development
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  APIs
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  DevOps
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  Cloud Computing
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />

                {/* Repeated set for seamless loop */}
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  Software Engineering
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  Web Development
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  APIs
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  DevOps
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
                <span className="text-black font-lufga text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight whitespace-nowrap px-4">
                  Cloud Computing
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 fill-orange text-orange flex-shrink-0" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider between Stack and Blog */}
      <div className="py-4 bg-background">
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-1 bg-orange rounded-full mx-auto"
          style={{ width: 96, transformOrigin: "center" }}
        />
      </div>

      {/* Blog Section (Section 8) - lazy render */}
      <div ref={blogRef}>
        {showBlog ? (
          blogsLoading ? (
            <section id="blog" className="py-8 lg:py-12 bg-background">
              <div className="container mx-auto max-w-7xl px-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-6 lg:space-y-0">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-lufga font-bold leading-tight">
                    <span className="text-gray-text">From my </span><span className="text-orange">blog post</span>
                  </h2>
                  <div className="w-32 h-10 bg-white/10 animate-pulse rounded-md" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <article key={i} className="flex flex-col space-y-4">
                      <div className="w-full h-48 bg-gray-bg border border-gray-border rounded-md animate-pulse" />
                      <div className="h-4 bg-white/10 animate-pulse rounded-md max-w-[60%]" />
                      <div className="h-3 bg-white/10 animate-pulse rounded-md max-w-[80%]" />
                      <div className="h-3 bg-white/10 animate-pulse rounded-md max-w-[90%]" />
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            // If not loading and there are no blog posts, collapse the section entirely to avoid empty vertical space
            blogs.length > 0 ? (
              <section id="blog" className="py-16 lg:py-24 bg-background">
                <div className="container mx-auto max-w-7xl px-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 space-y-6 lg:space-y-0">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-lufga font-bold leading-tight">
                      <span className="text-gray-text">From my </span><span className="text-orange">blog post</span>
                    </h2>
                    <button onClick={() => navigate("/blog")} className="flex items-center px-8 lg:px-10 py-4 lg:py-5 bg-orange rounded-full">
                      <span className="text-white font-lufga text-lg lg:text-xl font-bold">
                        See All
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
                    {blogs.map((post) => {
                      const img = (post.images && post.images[0]?.image) || "/project-placeholder.svg";
                      const dateStr = formatMonthYear(post.created_at);
                      return (
                        <article key={post.id} className="flex flex-col space-y-8">
                          <button
                            onClick={() => navigate(`/blog/${post.slug}`)}
                            className="group cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange/30 blog-image-frame overflow-hidden transition-all duration-300"
                            aria-label={`Read blog post: ${post.title}`}
                          >
                            <div className="relative group-hover:shadow-2xl transition-shadow duration-300 blog-image-frame overflow-hidden">
                              <div className="relative w-full h-[400px] lg:h-[432px] shadow-[0_4px_55px_0_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_70px_0_rgba(0,0,0,0.15)] transition-shadow duration-300 blog-image-frame overflow-hidden">
                                <div className="w-full h-full overflow-hidden relative blog-image-mask">
                                  <picture>
                                    <source
                                      type="image/avif"
                                      srcSet={useNImages ? makeSrcSet(addCacheBuster(img), [400, 600, 800, 992, 1200], "avif") : undefined}
                                      sizes="(max-width: 1024px) 100vw, 33vw"
                                    />
                                    <source
                                      type="image/webp"
                                      srcSet={useNImages ? makeSrcSet(addCacheBuster(img), [400, 600, 800, 992, 1200], "webp") : undefined}
                                      sizes="(max-width: 1024px) 100vw, 33vw"
                                    />
                                    <img
                                      loading="lazy"
                                      decoding="async"
                                      src={addCacheBuster(img)}
                                      alt={post.title}
                                      className="absolute inset-0 block w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 rounded-none"
                                      sizes="(max-width: 1024px) 100vw, 33vw"
                                    />
                                  </picture>
                                  <div className="absolute bottom-0 right-0 w-16 h-16 lg:w-20 lg:h-20">
                                    <div className="w-full h-full blog-corner-cutout"></div>
                                  </div>
                                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                <div className="absolute bottom-2 right-2 lg:bottom-3 lg:right-3">
                                  <div className="w-16 h-16 lg:w-[72px] lg:h-[72px] bg-[#1D2939] group-hover:bg-[#FD853A] rounded-full flex items-center justify-center -rotate-90 group-hover:rotate-0 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                                    <ArrowUpRight className="w-7 h-7 lg:w-8 lg:h-8 text-white rotate-90 group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>

                          <div className="flex flex-col space-y-6">
                            <div className="flex items-center space-x-8">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-[#FD853A] rounded-full"></div>
                                <span className="text-[#344054] font-inter text-xl">Salma Chiboub</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-[#FD853A] rounded-full"></div>
                                <span className="text-[#344054] font-inter text-xl">{dateStr}</span>
                              </div>
                            </div>
                            <h3 className="text-[32px] font-lufga text-[#344054] leading-tight">{post.title}</h3>
                            <p className="text-muted-foreground font-lufga text-lg leading-relaxed">{truncate(post.content || "", 180)}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : null
          )
        ) : (
          <div style={{ minHeight: 0 }} />
        )}
      </div>

      {/* Footer */}
      {/* Contact/Footer (Section 9) - lazy render */}
      <div ref={contactRef}>
        {showContact ? (
          <footer className="bg-dark rounded-t-3xl relative overflow-hidden" id="contact">
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-10 right-0 w-96 h-96 bg-orange-light rounded-full blur-3xl transform translate-x-1/2"></div>
      <div className="absolute bottom-10 left-0 w-96 h-96 bg-orange-light rounded-full blur-3xl transform -translate-x-1/2"></div>
    </div>
    <div className="container mx-auto max-w-7xl px-4 py-10 lg:py-16 relative z-10">
          {/* Header */}
          <div className="mb-6 lg:mb-8 text-center flex flex-col justify-center items-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-bold leading-tight">
              <span className="text-white">Contact </span>
              <span className="text-orange">Me</span>
            </h2>
            <div className="w-20 h-1 bg-orange mx-auto lg:mx-0 rounded-full mt-3" />
            <p className="text-white/80 font-lufga text-lg lg:text-xl mt-4">
              Have a project in mind? Send me a message or reach me directly:
            </p>
          </div>

          {/* Contact layout: left info + right form, no inner card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-10">
            {/* Left column: info and vertical nav */}
            <div className="space-y-6">
              <ul className="space-y-2">
                <li className="text-white/80 font-lufga"><span className="text-white font-bold">Email:</span> {hireEmail}</li>
              </ul>
              <nav className="pt-2 hidden lg:block">
                <ul className="space-y-2">
                  <li><a href="#about" className="text-white font-lufga hover:text-orange transition-colors">About</a></li>
                  <li><a href="#services" className="text-white font-lufga hover:text-orange transition-colors">Service</a></li>
                  <li><a href="#resume" className="text-white font-lufga hover:text-orange transition-colors">Resume</a></li>
                  <li><a href="#project" className="text-white font-lufga hover:text-orange transition-colors">Project</a></li>
                  <li><a href="#contact" className="text-white font-lufga hover:text-orange transition-colors">Contact</a></li>
                </ul>
              </nav>
            </div>

            {/* Right column: compact form */}
            <div className="lg:col-span-2 lg:pl-12">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white font-lufga text-sm">Name</label>
                    <input
                      value={contactName}
                      onChange={(e) => {
                        setContactName(e.target.value);
                        const err = validateName(e.target.value);
                        setNameError(err);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      type="text"
                      name="name"
                      autoComplete="name"
                      aria-invalid={touched.name && !!nameError}
                      aria-describedby={touched.name && nameError ? "name-error" : undefined}
                      className={cn(
                        "w-full px-4 py-2 rounded-2xl bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange",
                        { "ring-2 ring-red-400": touched.name && !!nameError }
                      )}
                      placeholder="Your name"
                      required
                    />
                    {touched.name && nameError && (
                      <p id="name-error" className="text-red-200 text-sm">{nameError}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white font-lufga text-sm">Email</label>
                    <input
                      value={contactEmail}
                      onChange={(e) => {
                        setContactEmail(e.target.value);
                        const err = validateEmail(e.target.value);
                        setEmailError(err);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      type="email"
                      name="email"
                      autoComplete="email"
                      aria-invalid={touched.email && !!emailError}
                      aria-describedby={touched.email && emailError ? "email-error" : undefined}
                      className={cn(
                        "w-full px-4 py-2 rounded-2xl bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange",
                        { "ring-2 ring-red-400": touched.email && !!emailError }
                      )}
                      placeholder="you@example.com"
                      required
                    />
                    {touched.email && emailError && (
                      <p id="email-error" className="text-red-200 text-sm">{emailError}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-white font-lufga text-sm">Subject</label>
                  <input
                    value={contactSubject}
                    onChange={(e) => {
                      setContactSubject(e.target.value);
                      const err = validateSubject(e.target.value);
                      setSubjectError(err);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
                    type="text"
                    name="subject"
                    aria-invalid={touched.subject && !!subjectError}
                    aria-describedby={touched.subject && subjectError ? "subject-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2 rounded-2xl bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange",
                      { "ring-2 ring-red-400": touched.subject && !!subjectError }
                    )}
                    placeholder="Subject"
                    required
                  />
                  {touched.subject && subjectError && (
                    <p id="subject-error" className="text-red-200 text-sm">{subjectError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-white font-lufga text-sm">Message</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => {
                      setContactMessage(e.target.value);
                      const err = validateMessage(e.target.value);
                      setMessageError(err);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                    name="message"
                    rows={5}
                    aria-invalid={touched.message && !!messageError}
                    aria-describedby={touched.message && messageError ? "message-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2 rounded-2xl bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange",
                      { "ring-2 ring-red-400": touched.message && !!messageError }
                    )}
                    placeholder="Write your message..."
                    required
                  />
                  {touched.message && messageError && (
                    <p id="message-error" className="text-red-200 text-sm">{messageError}</p>
                  )}
                </div>

                {contactError && (
                  <div className="text-red-200 bg-red-500/20 border border-red-400/50 rounded-xl px-4 py-2">
                    {contactError}
                  </div>
                )}
                {contactSuccess && (
                  <div className="text-green-200 bg-green-500/20 border border-green-400/50 rounded-xl px-4 py-2">
                    {contactSuccess}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="inline-flex items-center px-6 lg:px-8 py-3 lg:py-4 bg-orange rounded-full disabled:opacity-60"
                  >
                    <span className="text-white font-lufga text-base lg:text-lg font-bold">
                      {contactLoading ? "Sending..." : "Send Message"}
                    </span>
                  </button>
                </div>
              </form>

            </div>
          </div>

          <div className="h-1 w-24 bg-orange rounded-full mx-auto mb-8" />

          {/* Footer bottom */}
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <p className="text-white font-lufga text-lg lg:text-xl text-center lg:text-left">
              Copyright© {new Date().getFullYear()} Salma. All Rights Reserved.
            </p>
            <p className="text-white font-lufga text-lg lg:text-xl text-center lg:text-right">
              User Terms & Conditions | Privacy Policy
            </p>
          </div>
        </div>
          </footer>
        ) : (
          <div style={{ minHeight: 420 }} />
        )}
      </div>
    </div>
  );
}
