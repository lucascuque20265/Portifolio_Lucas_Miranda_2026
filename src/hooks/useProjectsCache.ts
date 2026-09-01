import { useEffect, useState, useCallback } from "react";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "../lib/cache";
import { supabase } from "../lib/supabase";

export type Project = {
  id: number;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
  category: string | null;
  published: boolean | null;
  created_at?: string;
};

type UseProjectsResult = {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Hook que carrega projetos com cache inteligente
 * Primeiro tenta cache, depois Supabase
 */
export function useProjects(onlyPublished = false): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = onlyPublished ? CACHE_KEYS.PROJECTS_PUBLISHED : CACHE_KEYS.PROJECTS;
  const cacheTTL = onlyPublished ? CACHE_TTL.MEDIUM : CACHE_TTL.LONG;

  const fetchProjects = useCallback(async (forceRefresh = false) => {
    // Se não está forçando refresh, tenta carregar do cache primeiro
    if (!forceRefresh) {
      const cachedData = cacheManager.get<Project[]>(cacheKey);
      if (cachedData) {
        setProjects(cachedData);
        setError(null);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const query = supabase
        .from<Project>("projects")
        .select("id,title,description,link,image_url,category,published,created_at");

      const { data, error: supabaseError } = await query.order("created_at", {
        ascending: false,
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado");
      }

      let filteredData = data;

      // Filtra apenas projetos publicados se necessário
      if (onlyPublished) {
        filteredData = data.filter((project) => project.published);
      }

      // Salva no cache
      cacheManager.set(cacheKey, filteredData, cacheTTL);

      setProjects(filteredData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar projetos";
      setError(errorMessage);

      // Tenta usar cache expirado como fallback
      const fallbackData = cacheManager.get<Project[]>(cacheKey);
      if (fallbackData) {
        setProjects(fallbackData);
        console.warn("Usando cache expirado como fallback:", fallbackData);
      } else {
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cacheTTL, onlyPublished]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const refetch = useCallback(async () => {
    // Invalida o cache e força novo carregamento
    cacheManager.invalidate(cacheKey);
    await fetchProjects(true);
  }, [cacheKey, fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook para atualizar projeto (invalida cache automaticamente)
 */
export function useUpdateProject() {
  const updatePublished = useCallback(
    async (id: number, published: boolean) => {
      const { error } = await supabase
        .from("projects")
        .update({ published })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      // Invalida cache de projetos para forçar recarga
      cacheManager.invalidate(CACHE_KEYS.PROJECTS);
      cacheManager.invalidate(CACHE_KEYS.PROJECTS_PUBLISHED);
    },
    []
  );

  const createProject = useCallback(
    async (data: Omit<Project, "id" | "created_at">) => {
      const { error } = await supabase.from("projects").insert({
        title: data.title,
        description: data.description,
        link: data.link,
        image_url: data.image_url,
        category: data.category,
        published: data.published,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Invalida cache para forçar recarga
      cacheManager.invalidate(CACHE_KEYS.PROJECTS);
      cacheManager.invalidate(CACHE_KEYS.PROJECTS_PUBLISHED);
    },
    []
  );

  return {
    updatePublished,
    createProject,
  };
}

/**
 * Hook para limpar cache manualmente
 */
export function useCacheManager() {
  const invalidate = useCallback((key: string) => {
    cacheManager.invalidate(key);
  }, []);

  const clear = useCallback(() => {
    cacheManager.clear();
  }, []);

  const getStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  return {
    invalidate,
    clear,
    getStats,
  };
}
