# Portfólio Lucas Miranda

Projeto React + Tailwind + Supabase.

## Comandos

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Supabase

Defina as variáveis de ambiente em `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ADMIN_PASSWORD`

### Tabela necessária

Crie uma tabela chamada `projects` no Supabase com pelo menos estas colunas:

- `id` (integer, primary key, auto increment)
- `title` (text)
- `description` (text)
- `link` (text)
- `image_url` (text) - URL da imagem ou thumbnail do projeto
- `category` (text)
- `published` (boolean)
- `created_at` (timestamp with time zone, default now())

### Uso

- Insira os projetos pelo painel Admin do próprio site de portfólio (painel admin no topo da página) ou diretamente no Supabase.
- Marque `published` como `true` para que o site exiba o projeto.
- O app carrega apenas projetos publicados.

## Deploy na Vercel

1. Crie um projeto na Vercel conectado ao repositório.
2. Em `Settings > Environment Variables`, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_ADMIN_PASSWORD`
3. Faça deploy.
4. Em `Domains`, adicione `www.animaestudio.site`.
5. No HostGator, aponte o `www` para a Vercel conforme as instruções da Vercel (CNAME para `cname.vercel-dns.com` ou registros indicados no painel).

> Lembre-se: a senha de admin funciona apenas no site, não no Supabase.
