# Sistema de Cache para Projetos 🚀

Este documento explica o novo sistema de cache implementado no portfólio de Lucas Miranda para melhorar o desempenho do carregamento de dados.

## 📋 Visão Geral

O sistema de cache foi implementado com os seguintes objetivos:

1. **Carregamento mais rápido** - Dados são servidos do cache em memória ou localStorage
2. **Redução de requisições ao Supabase** - Menos chamadas de API via TTL (Time To Live)
3. **Fallback inteligente** - Se houver erro, usa cache expirado como fallback
4. **Invalidação automática** - Cache é invalidado após modificações

## 🏗️ Arquitetura

### 1. `src/lib/cache.ts` - Serviço de Cache
Sistema principal de cache com dois níveis:

```typescript
const cacheManager = new CacheManager();

// Salva no cache (memória + localStorage)
cacheManager.set("projects", data, 5 * 60 * 1000); // 5 minutos

// Recupera do cache
const data = cacheManager.get("projects");

// Invalida um cache específico
cacheManager.invalidate("projects");

// Limpa tudo
cacheManager.clear();
```

**Características:**
- ✅ Cache em memória (rápido, per-sessão)
- ✅ Cache em localStorage (persistente entre abas)
- ✅ TTL automático com expiração
- ✅ Fallback para dados expirados em caso de erro

### 2. `src/hooks/useProjectsCache.ts` - Hooks React

#### `useProjects(onlyPublished: boolean)`
Hook para carregar projetos com cache automático.

```typescript
// Carrega apenas projetos publicados com cache de 5 minutos
const { projects, loading, error, refetch } = useProjects(true);

// Carrega todos os projetos (admin) com cache de 15 minutos
const { projects: allProjects } = useProjects(false);
```

**Opções:**
- `onlyPublished` (boolean): Filtrar apenas projetos publicados

**Retorno:**
- `projects` - Array de projetos
- `loading` - Estado de carregamento
- `error` - Mensagem de erro (se houver)
- `refetch()` - Função para recarregar e invalidar cache

#### `useUpdateProject()`
Hook para criar/atualizar projetos com invalidação de cache automática.

```typescript
const { updatePublished, createProject } = useUpdateProject();

// Atualizar status de publicação
await updatePublished(projectId, true);

// Criar novo projeto
await createProject({
  title: "Novo Projeto",
  description: "...",
  link: "https://...",
  image_url: "https://...",
  category: "React",
  published: true
});
```

**Comportamento:**
- Invalida cache de projetos automaticamente após qualquer mudança
- Força recarga de dados na próxima chamada a `useProjects()`

#### `useCacheManager()`
Hook para controle manual do cache (para debug/admin).

```typescript
const { invalidate, clear, getStats } = useCacheManager();

// Invalidar cache específico
invalidate("projects");

// Limpar tudo
clear();

// Ver estatísticas
const stats = getStats();
console.log(stats); // { memoryCacheSize: 2, keys: ["projects", "..."] }
```

## ⏱️ TTL (Time To Live)

Diferentes durações de cache para diferentes tipos de dados:

```typescript
CACHE_TTL.SHORT      // 1 minuto
CACHE_TTL.MEDIUM     // 5 minutos (projetos públicos)
CACHE_TTL.LONG       // 15 minutos (todos os projetos)
CACHE_TTL.VERY_LONG  // 1 hora
```

**Lógica no App:**
- Projetos públicos (visitantes): 5 minutos de cache
- Todos os projetos (admin): 15 minutos de cache
- Cache é invalidado quando admin cria/edita projetos

## 🔄 Fluxo de Funcionamento

### Carregamento Inicial
```
1. useProjects() chamado
2. Verifica cache em memória
3. Se não encontrar, verifica localStorage
4. Se não encontrar, faz requisição ao Supabase
5. Salva resposta no cache (memória + localStorage)
6. Retorna dados para renderizar
```

### Com Cache Válido
```
1. useProjects() chamado
2. Encontra dados no cache
3. Retorna imediatamente (sem requisição ao Supabase)
4. Renderiza interface com cache
```

### Em Caso de Erro
```
1. useProjects() chamado
2. Faz requisição ao Supabase
3. Erro na requisição
4. Verifica se há cache expirado
5. Se houver, usa cache expirado como fallback
6. Exibe dados do cache com aviso de erro
```

### Após Criar/Atualizar Projeto
```
1. handleCreateProject() ou togglePublish() chamado
2. Envia dados ao Supabase
3. Se bem-sucedido, invalida cache
4. useProjects() detecta cache inválido
5. Próxima renderização faz nova requisição ao Supabase
6. Cache é atualizado com novos dados
```

## 📊 Performance esperada

### Sem Cache
- 1º carregamento: ~500-1000ms (requisição ao Supabase)
- 2º carregamento (sem refresh): ~500-1000ms (repetido)

### Com Cache
- 1º carregamento: ~500-1000ms (requisição ao Supabase, salva em cache)
- 2º carregamento: ~1-10ms (carregado do cache em memória!)
- 3º abrir em nova aba: ~1-10ms (carregado do localStorage)

**Economia:** ~98% de redução em requisições de API durante sessão ativa!

## 🔧 Customização

### Alterar TTL de um tipo de dado

Em `src/hooks/useProjectsCache.ts`:

```typescript
// Antes (5 minutos para projetos públicos)
const cacheTTL = onlyPublished ? CACHE_TTL.MEDIUM : CACHE_TTL.LONG;

// Depois (1 minuto para projetos públicos)
const cacheTTL = onlyPublished ? CACHE_TTL.SHORT : CACHE_TTL.LONG;
```

### Adicionar novo tipo de cache

Em `src/lib/cache.ts`:

```typescript
export const CACHE_KEYS = {
  PROJECTS: "projects",
  PROJECTS_PUBLISHED: "projects_published",
  PROJECT_DETAIL: (id: number) => `project_${id}`,
  // Adicione novo
  TEAM_MEMBERS: "team_members",
} as const;
```

Em `src/hooks/useProjectsCache.ts`:

```typescript
export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = CACHE_KEYS.TEAM_MEMBERS;
  const cacheTTL = CACHE_TTL.LONG;

  const fetch = useCallback(async () => {
    const cached = cacheManager.get<TeamMember[]>(cacheKey);
    if (cached) {
      setMembers(cached);
      setLoading(false);
      return;
    }

    // ... fazer requisição ao Supabase
    cacheManager.set(cacheKey, data, cacheTTL);
  }, []);

  // ...
}
```

## 🐛 Debug

### Ver estado do cache no console

```javascript
// No arquivo useProjectsCache.ts
import { useCacheManager } from "./hooks/useProjectsCache";

const { getStats } = useCacheManager();
console.log(getStats()); // { memoryCacheSize: 2, keys: [...] }
```

### Limpar cache manualmente

```javascript
// No console do navegador
cacheManager.clear();
```

## 💾 Armazenamento

O cache usa **dois níveis**:

1. **Memória (rápido)**
   - Perdido ao fechar a aba
   - Acesso instantâneo (~1-10ms)
   - Limite: apenas dados da sessão atual

2. **localStorage (persistente)**
   - Persiste entre abas da mesma origem
   - Acesso rápido (~10-50ms)
   - Limite: ~5-10MB por domínio

## ⚠️ Possíveis Problemas

### Cache muito longo
Se o TTL estiver muito alto, dados desatualizados podem ser servidos por muito tempo.
- Solução: Reduzir TTL ou implementar invalidação manual

### localStorage cheio
Se muitos dados forem salvos em localStorage, pode ficar cheio.
- Solução: Limpar periodicamente com `cacheManager.clear()`

### Dados inconsistentes
Se dados forem modificados em outra aba e TTL não expirar.
- Solução: Implementar sincronização entre abas com `storage` event

## 🚀 Próximas Melhorias

1. **Sincronização entre abas** - Usar `window.storage` event
2. **Compressão de dados** - Para localStorage usar menos espaço
3. **Priorização de cache** - Cache LRU (Least Recently Used)
4. **Analytics** - Rastrear taxa de hit do cache
5. **Service Worker** - Cache mesmo offline

## 📚 Referências

- [MDN - Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN - Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [React Hooks](https://react.dev/reference/react)
