/**
 * Sistema de cache com TTL (Time To Live) e persistência em localStorage
 * Melhora o desempenho do carregamento de dados
 */

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // em milissegundos
};

export class CacheManager {
  private static readonly STORAGE_PREFIX = "app_cache_";
  private memoryCache = new Map<string, CacheEntry<any>>();

  /**
   * Define um valor no cache (memória + localStorage)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    // Cache em memória
    this.memoryCache.set(key, entry);

    // Persistir em localStorage
    try {
      localStorage.setItem(
        `${CacheManager.STORAGE_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (e) {
      console.warn("Falha ao salvar no localStorage:", e);
    }
  }

  /**
   * Obtém um valor do cache (verifica validade)
   */
  get<T>(key: string): T | null {
    // Primeiro tenta cache em memória
    let entry = this.memoryCache.get(key);

    // Se não encontrou em memória, tenta localStorage
    if (!entry) {
      try {
        const stored = localStorage.getItem(`${CacheManager.STORAGE_PREFIX}${key}`);
        if (stored) {
          entry = JSON.parse(stored) as CacheEntry<T>;
          this.memoryCache.set(key, entry);
        }
      } catch (e) {
        console.warn("Falha ao ler do localStorage:", e);
      }
    }

    if (!entry) {
      return null;
    }

    // Verifica se o cache expirou
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.invalidate(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Verifica se uma chave está em cache e é válida
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove um valor do cache
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`${CacheManager.STORAGE_PREFIX}${key}`);
    } catch (e) {
      console.warn("Falha ao remover do localStorage:", e);
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CacheManager.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("Falha ao limpar localStorage:", e);
    }
  }

  /**
   * Obtém informações sobre o cache (para debug)
   */
  getStats(): {
    memoryCacheSize: number;
    keys: string[];
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}

// Instância singleton do cache
export const cacheManager = new CacheManager();

// Chaves de cache predefinidas
export const CACHE_KEYS = {
  PROJECTS: "projects",
  PROJECTS_PUBLISHED: "projects_published",
  PROJECT_DETAIL: (id: number) => `project_${id}`,
} as const;

// TTLs padrão (em milissegundos)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minuto
  MEDIUM: 5 * 60 * 1000, // 5 minutos
  LONG: 15 * 60 * 1000, // 15 minutos
  VERY_LONG: 60 * 60 * 1000, // 1 hora
} as const;
