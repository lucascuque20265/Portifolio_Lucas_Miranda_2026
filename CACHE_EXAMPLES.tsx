/**
 * EXEMPLO: Como adicionar cache para novos tipos de dados
 * 
 * Este arquivo mostra como estender o sistema de cache para outros dados
 * além de projetos (ex: comments, tags, user data, etc)
 */

import { useCallback, useEffect, useState } from "react";
import { cacheManager, CACHE_KEYS as EXISTING_KEYS, CACHE_TTL } from "../lib/cache";
import { supabase } from "../lib/supabase";

// ============================================================
// PASSO 1: Definir tipos de dados
// ============================================================

export type BlogPost = {
  id: number;
  title: string;
  content: string;
  author: string;
  published_at: string;
  views: number;
};

export type ProjectStats = {
  total_projects: number;
  published_count: number;
  last_updated: string;
};

// ============================================================
// PASSO 2: Adicionar chaves de cache
// ============================================================

// Adicione isto em src/lib/cache.ts
export const CACHE_KEYS_EXTENDED = {
  ...EXISTING_KEYS,
  // Novos tipos de dados
  BLOG_POSTS: "blog_posts",
  BLOG_POST_DETAIL: (id: number) => `blog_post_${id}`,
  PROJECT_STATS: "project_stats",
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
} as const;

// ============================================================
// PASSO 3: Criar hooks para cada tipo de dado
// ============================================================

/**
 * Exemplo 1: Hook para carregar blog posts
 */
export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = CACHE_KEYS_EXTENDED.BLOG_POSTS;
  const cacheTTL = CACHE_TTL.LONG; // 15 minutos

  useEffect(() => {
    const fetchPosts = async () => {
      // 1. Tentar carregar do cache
      const cached = cacheManager.get<BlogPost[]>(cacheKey);
      if (cached) {
        setPosts(cached);
        setLoading(false);
        return;
      }

      // 2. Se não tiver cache, fazer requisição
      setLoading(true);
      try {
        const { data, error: supabaseError } = await supabase
          .from<BlogPost>("blog_posts")
          .select("*")
          .order("published_at", { ascending: false });

        if (supabaseError) throw new Error(supabaseError.message);
        if (!data) throw new Error("Nenhum dado retornado");

        // 3. Salvar no cache
        cacheManager.set(cacheKey, data, cacheTTL);
        setPosts(data);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMsg);

        // 4. Usar cache expirado como fallback
        const fallback = cacheManager.get<BlogPost[]>(cacheKey);
        if (fallback) {
          setPosts(fallback);
          console.warn("Usando blog posts em cache expirado");
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, []);

  const refetch = useCallback(async () => {
    cacheManager.invalidate(cacheKey);
    // Refetch logic aqui...
  }, []);

  return { posts, loading, error, refetch };
}

/**
 * Exemplo 2: Hook para carregar estatísticas (com menos frequência)
 */
export function useProjectStats() {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  const cacheKey = CACHE_KEYS_EXTENDED.PROJECT_STATS;
  // Stats mudam raro, então cache de 1 hora
  const cacheTTL = CACHE_TTL.VERY_LONG;

  useEffect(() => {
    const fetch = async () => {
      const cached = cacheManager.get<ProjectStats>(cacheKey);
      if (cached) {
        setStats(cached);
        setLoading(false);
        return;
      }

      try {
        // Chamar função no Supabase ou agregação local
        const { data } = await supabase
          .from("projects")
          .select("id,published");

        const stats: ProjectStats = {
          total_projects: data?.length ?? 0,
          published_count: data?.filter((p) => p.published).length ?? 0,
          last_updated: new Date().toISOString(),
        };

        cacheManager.set(cacheKey, stats, cacheTTL);
        setStats(stats);
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, []);

  return { stats, loading };
}

/**
 * Exemplo 3: Hook para carregar dados de usuário (TTL curto, sensível a tempo)
 */
export function useUserProfile(userId: string) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const cacheKey = CACHE_KEYS_EXTENDED.USER_PROFILE(userId);
  // Dados de usuário mudam frequentemente
  const cacheTTL = CACHE_TTL.SHORT; // 1 minuto

  useEffect(() => {
    const fetch = async () => {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        setUser(cached);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        cacheManager.set(cacheKey, data, cacheTTL);
        setUser(data);
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [userId, cacheKey]);

  return { user, loading };
}

// ============================================================
// PASSO 4: Usar os hooks em componentes
// ============================================================

/**
 * Exemplo de uso em um componente
 */
export function BlogSection() {
  const { posts, loading, error } = useBlogPosts();

  if (loading) return <div>Carregando posts...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          <time>{new Date(post.published_at).toLocaleDateString("pt-BR")}</time>
        </article>
      ))}
    </div>
  );
}

// ============================================================
// PASSO 5: Invalidar cache após atualizações
// ============================================================

export function useCreateBlogPost() {
  const createPost = useCallback(
    async (post: Omit<BlogPost, "id">) => {
      const { error } = await supabase.from("blog_posts").insert(post);

      if (error) throw new Error(error.message);

      // Invalidar cache para forçar recarga
      cacheManager.invalidate(CACHE_KEYS_EXTENDED.BLOG_POSTS);
      cacheManager.invalidate(CACHE_KEYS_EXTENDED.PROJECT_STATS);
    },
    []
  );

  return { createPost };
}

// ============================================================
// CHECKLIST: Como adicionar cache para novo tipo de dado
// ============================================================
/*

1. ✅ Definir tipo TypeScript (ex: BlogPost)

2. ✅ Adicionar chave em CACHE_KEYS_EXTENDED
   export const CACHE_KEYS_EXTENDED = {
     MY_NEW_DATA: "my_new_data",
   }

3. ✅ Criar hook useMyData() que:
   - Verifica cache
   - Faz requisição se não houver cache válido
   - Salva resultado em cache com TTL apropriado
   - Usa fallback em caso de erro

4. ✅ Usar hook em componentes
   const { data, loading, error } = useMyData();

5. ✅ Criar hook useUpdateMyData() que:
   - Faz atualização no Supabase
   - Invalida cache relacionado
   - Força recarga automática

6. ✅ Usar hook em event handlers
   const { updateData } = useUpdateMyData();
   await updateData(newValue);

7. ✅ (Opcional) Adicionar teste para cache
   - Verificar que cache é usado
   - Verificar que cache é invalidado após update
   - Verificar fallback em caso de erro

*/

// ============================================================
// DICAS DE PERFORMANCE
// ============================================================

/*

TTL Recomendado por tipo de dado:

⚡ VERY_SHORT (30 segundos)
   - Dados que mudam muito frequentemente
   - Status em tempo real
   - Pontuações/rankings

⚡ SHORT (1-5 minutos) 
   - Dados de usuário
   - Preferências de sessão
   - Dados sensíveis a tempo

⚡ MEDIUM (5-15 minutos)
   - Listas públicas (posts, projetos)
   - Dados que mudam regularmente
   - Conteúdo que pode ficar ligeiramente desatualizado

⚡ LONG (15 minutos - 1 hora)
   - Metadados e configurações
   - Dados que raramente mudam
   - Listas inteiras (admin)

⚡ VERY_LONG (1+ hora)
   - Estatísticas
   - Dados imutáveis
   - Configurações do app

*/
