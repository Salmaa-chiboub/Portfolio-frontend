import { useEffect, useMemo, useRef, useState, memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/config";
import { useDebouncedValue } from "@/hooks/use-debounce";

// Local types matching API
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

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

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

export default function ExperiencesSection() {
  // Perf flags
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true } as any);
    return () => window.removeEventListener("resize", check as any);
  }, []);
  const lowPerf = prefersReducedMotion || isMobile;

  // Data state
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expLoadingMore, setExpLoadingMore] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [expNext, setExpNext] = useState<string | null>(null);
  const [expTotalCount, setExpTotalCount] = useState<number | null>(null);

  // Filters/search
  const [expFilter, setExpFilter] = useState<string>("All");
  const [expQuery, setExpQuery] = useState("");
  const debouncedExpQuery = useDebouncedValue(expQuery, 250);
  const [expandedExp, setExpandedExp] = useState<Record<number, boolean>>({});

  const expTypes = useMemo(
    () => Array.from(new Set((experiences || []).map((e) => e.experience_type).filter(Boolean))),
    [experiences]
  );

  const displayedExperiences = useMemo(() => {
    const toTime = (e: ExperienceItem) => {
      const t = e?.start_date ? Date.parse(e.start_date) : NaN;
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };
    let list = experiences;
    if (expFilter !== "All") list = list.filter((e) => e.experience_type === expFilter);
    const q = (debouncedExpQuery || "").trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.company.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    // Oldest first (ascending by start_date)
    return list.slice().sort((a, b) => toTime(a) - toTime(b));
  }, [experiences, expFilter, debouncedExpQuery]);

  // Timeline progress
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineProgress, setTimelineProgress] = useState(0);
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

  // Initial fetch with AbortController
  useEffect(() => {
    const url = getApiUrl("/api/experiences/");
    if (!url) return;
    const controller = new AbortController();
    setExpLoading(true);
    setExpError(null);
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Paginated<ExperienceItem> | ExperienceItem[]) => {
        if (Array.isArray(data)) {
          setExperiences(data);
          setExpNext(null);
          setExpTotalCount(data.length);
        } else if (data && Array.isArray((data as Paginated<ExperienceItem>).results)) {
          const d = data as Paginated<ExperienceItem>;
          setExperiences(d.results);
          setExpNext(d.next ?? null);
          setExpTotalCount(typeof d.count === "number" ? d.count : d.results?.length ?? 0);
        } else {
          setExperiences([]);
          setExpNext(null);
          setExpTotalCount(0);
        }
      })
      .catch((err) => {
        if ((err as any)?.name === 'AbortError') return; // ignore abort
        setExpError("Failed to load experiences.");
        setExperiences([]);
        setExpNext(null);
        setExpTotalCount(0);
      })
      .finally(() => setExpLoading(false));

    return () => controller.abort();
  }, []);

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && expNext && !expLoadingMore) {
          const nextUrl = buildNextUrl(getApiUrl, expNext);
          if (!nextUrl) return;
          setExpLoadingMore(true);
          fetch(nextUrl, { cache: "no-store" })
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
    return () => io.disconnect();
  }, [expNext, expLoadingMore]);

  const showExperiences = expLoading || ((expTotalCount ?? experiences.length) > 0);

  return (
    <>
      <section id="resume" className="relative z-20 py-12 lg:py-16 bg-background">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, ease: "easeOut" }} className="container mx-auto max-w-7xl px-4">
            <div className="hidden lg:block text-center mb-12 lg:mb-16">
              <motion.h2
                initial={lowPerf ? undefined : { opacity: 0, y: 16 }}
                whileInView={lowPerf ? undefined : { opacity: 1, y: 0 }}
                viewport={lowPerf ? undefined : { once: true, amount: 0.5 }}
                transition={lowPerf ? undefined : { duration: 1.0, ease: "easeOut" }}
                className="text-4xl sm:text-5xl lg:text-6xl font-lufga font-semibold leading-tight tracking-tight"
              >
                <span className="text-gray-text">Professional </span>
                <span className="text-orange">Experiences</span>
              </motion.h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-center mt-12">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 lg:gap-3">
                  {["All", ...expTypes].map((label) => (
                    <button
                      key={label}
                      onClick={() => setExpFilter(label)}
                      className={cn(
                        "px-5 py-2.5 rounded-full border text-base font-lufga",
                        expFilter === label
                          ? "bg-orange text-white border-orange"
                          : "bg-gray-bg text-gray-text border-gray-border hover:bg-gray-bg/70"
                      )}
                      aria-pressed={expFilter === label}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full lg:w-80">
                <div className="flex items-center gap-2 bg-white border border-gray-border rounded-full px-4 py-2">
                  <input
                    value={expQuery}
                    onChange={(e) => setExpQuery(e.target.value)}
                    placeholder="Search role or company..."
                    className="flex-1 bg-transparent outline-none text-gray-text font-lufga text-sm lg:text-base py-2"
                    aria-label="Search experiences"
                  />
                </div>
              </div>
            </div>

            <div ref={timelineRef} className="relative max-w-6xl mx-auto lg:px-4 mt-4 lg:mt-0">
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-orange/30 -translate-x-1/2" />
              <div className="hidden lg:block absolute left-1/2 top-0 w-1 bg-orange -translate-x-1/2 transition-[height] duration-500" style={{ height: `${timelineProgress}%` }} />

              <div className="space-y-10">

                {!expLoading && expError && (
                  <p className="text-center text-gray-light font-lufga">{expError}</p>
                )}

                {!expLoading && !expError && displayedExperiences.length === 0 && (
                  <p className="text-center text-gray-light font-lufga">No experiences to display.</p>
                )}

                {!expLoading && !expError && displayedExperiences.map((exp, idx) => (
                  <TimelineRow
                    key={exp.id}
                    exp={exp}
                    idx={idx}
                    onLeft={idx % 2 === 0}
                    lowPerf={lowPerf}
                    expanded={!!expandedExp[exp.id]}
                    setExpanded={(v) =>
                      setExpandedExp((prev) => ({ ...prev, [exp.id]: typeof v === "boolean" ? v : !prev[exp.id] }))
                    }
                  />
                ))}

                <div ref={loadMoreRef} />
                {expLoadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-border border-t-orange animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

    </>
  );
}

function buildNextUrl(getUrl: (p: string) => string | undefined, u: string | null) {
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const pathWithQuery = `${parsed.pathname}${parsed.search}`;
    const rel = getUrl(pathWithQuery);
    return rel || u;
  } catch {
    return getUrl(u) || u;
  }
}

function TimelineRowBase({
  exp,
  idx,
  onLeft,
  lowPerf,
  expanded,
  setExpanded,
}: {
  exp: ExperienceItem;
  idx: number;
  onLeft: boolean;
  lowPerf: boolean;
  expanded: boolean;
  setExpanded: (v?: boolean) => void;
}) {
  const start = formatMonthYear(exp.start_date);
  const end = exp.is_current ? "Present" : formatMonthYear(exp.end_date);
  const skills = (exp.skills || []).slice(0, 5);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const [bubbleTop, setBubbleTop] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const row = rowRef.current;
      const card = cardRef.current as HTMLElement | null;
      if (!row || !card) return;
      const rowRect = row.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const top = (cardRect.top - rowRect.top) + cardRect.height / 2;
      setBubbleTop(top);
    };
    update();
    const onResize = () => requestAnimationFrame(update);
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(update, 60);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [expanded, exp.description, exp.title, exp.company, start, end]);

  return (
    <div ref={rowRef} className={cn("relative lg:py-12")}> 
      {/* Dot */}
      <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-3 w-6 h-6 bg-orange rounded-full shadow-lg" />

      {/* Row grid: two cols (card | empty) with absolute center bubble */}
      <div className="grid lg:grid-cols-2 items-stretch gap-6 lg:gap-10">
        {/* Number bubble in side space (not on the timeline) */}
        <div
          className="hidden lg:block absolute"
          style={{
            top: bubbleTop ? `${bubbleTop}px` : "50%",
            left: onLeft ? "calc(75%)" : "calc(25%)",
            transform: "translate(-50%, calc(-50% - 4px))",
            zIndex: 2,
          }}
        >
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 bg-orange rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-urbanist font-bold text-4xl leading-none">{idx + 1}</span>
            </div>
            <div className="mt-2 experience-bubble-title text-dark font-lufga font-bold text-sm lg:text-base">{exp.title}</div>
          </div>
        </div>

        {onLeft ? (
          <>
            <div className="self-center">
              <motion.article ref={cardRef as any}
                initial={lowPerf ? undefined : { opacity: 0, y: 24 }}
                whileInView={lowPerf ? undefined : { opacity: 1, y: 0 }}
                viewport={lowPerf ? undefined : { once: true, amount: 0.5 }}
                transition={lowPerf ? undefined : { duration: 0.7, ease: "easeOut" }}
                className="border border-gray-border rounded-2xl p-5 lg:p-6 bg-background shadow-sm"
              >
                <header className="mb-2">
                  <h3 className="text-2xl lg:text-3xl font-lufga font-bold text-dark mb-1">{exp.title}</h3>
                  <div className="text-sm lg:text-base font-lufga text-gray-light">
                    <span>{start}</span>
                    <span className="mx-1">-</span>
                    <span>{end}</span>
                    <span className="mx-2">•</span>
                    <span>{exp.company}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {exp.location && (
                      <span className="px-3 py-1 rounded-full bg-gray-bg border border-gray-border text-gray-text text-xs font-lufga">
                        {exp.location}
                      </span>
                    )}
                    {exp.experience_type && (
                      <span className="px-3 py-1 rounded-full bg-orange/10 border border-orange/30 text-orange text-xs font-lufga">
                        {exp.experience_type}
                      </span>
                    )}
                  </div>
                </header>

                {(() => {
                  const raw = String(exp.description || "");
                  const hasHtml = raw.includes("<");
                  const excerpt = (() => {
                    if (!expanded) {
                      const plain = hasHtml ? raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : raw;
                      return truncate(plain, 220);
                    }
                    return null;
                  })();
                  return expanded ? (
                    hasHtml ? (
                      <div className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: raw }} />
                    ) : (
                      <p className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed whitespace-pre-wrap mb-3">{raw}</p>
                    )
                  ) : (
                    <p className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed mb-3">{excerpt}</p>
                  );
                })()}
                {(() => {
                  const raw = String(exp.description || "");
                  const plain = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                  return plain.length > 220 ? (
                    <button
                      onClick={() => setExpanded()}
                      className="text-orange font-lufga text-sm lg:text-base mb-3"
                      aria-expanded={!!expanded}
                    >
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  ) : null;
                })()}

                {skills.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <li key={s.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-bg border border-gray-border text-gray-text text-sm">
                        {s.icon ? (
                          <img loading="lazy" decoding="async" src={s.icon} alt={s.name} className="w-4 h-4 object-contain transition-opacity duration-700" />
                        ) : null}
                        <span>{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.article>
            </div>
            <div className="hidden lg:block" />
          </>
        ) : (
          <>
            <div className="hidden lg:block" />
            <div className="self-center">
              <motion.article ref={cardRef as any}
                initial={lowPerf ? undefined : { opacity: 0, y: 24 }}
                whileInView={lowPerf ? undefined : { opacity: 1, y: 0 }}
                viewport={lowPerf ? undefined : { once: true, amount: 0.5 }}
                transition={lowPerf ? undefined : { duration: 0.7, ease: "easeOut" }}
                className="border border-gray-border rounded-2xl p-5 lg:p-6 bg-background shadow-sm"
              >
                <header className="mb-2">
                  <h3 className="text-2xl lg:text-3xl font-lufga font-bold text-dark mb-1">{exp.title}</h3>
                  <div className="text-sm lg:text-base font-lufga text-gray-light">
                    <span>{start}</span>
                    <span className="mx-1">-</span>
                    <span>{end}</span>
                    <span className="mx-2">•</span>
                    <span>{exp.company}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {exp.location && (
                      <span className="px-3 py-1 rounded-full bg-gray-bg border border-gray-border text-gray-text text-xs font-lufga">
                        {exp.location}
                      </span>
                    )}
                    {exp.experience_type && (
                      <span className="px-3 py-1 rounded-full bg-orange/10 border border-orange/30 text-orange text-xs font-lufga">
                        {exp.experience_type}
                      </span>
                    )}
                  </div>
                </header>

                {(() => {
                  const raw = String(exp.description || "");
                  const hasHtml = raw.includes("<");
                  const excerpt = (() => {
                    if (!expanded) {
                      const plain = hasHtml ? raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : raw;
                      return truncate(plain, 220);
                    }
                    return null;
                  })();
                  return expanded ? (
                    hasHtml ? (
                      <div className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: raw }} />
                    ) : (
                      <p className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed whitespace-pre-wrap mb-3">{raw}</p>
                    )
                  ) : (
                    <p className="text-gray-text font-lufga text-base lg:text-lg leading-relaxed mb-3">{excerpt}</p>
                  );
                })()}
                {(() => {
                  const raw = String(exp.description || "");
                  const plain = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                  return plain.length > 220 ? (
                    <button
                      onClick={() => setExpanded()}
                      className="text-orange font-lufga text-sm lg:text-base mb-3"
                      aria-expanded={!!expanded}
                    >
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  ) : null;
                })()}

                {skills.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <li key={s.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-bg border border-gray-border text-gray-text text-sm">
                        {s.icon ? (
                          <img loading="lazy" decoding="async" src={s.icon} alt={s.name} className="w-4 h-4 object-contain transition-opacity duration-700" />
                        ) : null}
                        <span>{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.article>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Memoized row to avoid unnecessary re-renders during scroll and timeline updates
const TimelineRow = memo(TimelineRowBase, (prev, next) => {
  return (
    prev.exp.id === next.exp.id &&
    prev.idx === next.idx &&
    prev.onLeft === next.onLeft &&
    prev.lowPerf === next.lowPerf &&
    prev.expanded === next.expanded
  );
});
