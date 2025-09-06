import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/config";

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

export function useHero() {
  return useQuery({
    queryKey: ["hero"],
    queryFn: async ({ signal }) => {
      const data = await fetchJson(getApiUrl("/api/core/hero/"));
      if (Array.isArray(data)) {
        const list = [...data].sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
        const active = list.find((x: any) => x?.is_active) || list[0] || null;
        return active;
      }
      return data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useAbout() {
  return useQuery({
    queryKey: ["about"],
    queryFn: ({ signal }) => fetchJson(getApiUrl("/api/core/about/")),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useBlogs() {
  return useQuery({
    queryKey: ["blogs"],
    queryFn: ({ signal }) => fetchJson(getApiUrl("/api/blog/posts/?page=1")),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => fetchJson(getApiUrl("/api/projects/")),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useExperiences(query = "") {
  return useQuery({
    queryKey: ["experiences", query],
    queryFn: ({ signal }) => fetchJson(getApiUrl(`/api/experiences/?q=${encodeURIComponent(query)}`)),
    staleTime: 1000 * 60,
    retry: 1,
  });
}
