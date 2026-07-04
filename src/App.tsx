import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Project = {
  id: number;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
  category: string | null;
  published: boolean | null;
};

type NewProject = {
  title: string;
  description: string;
  link: string;
  image_url: string;
  category: string;
  published: boolean;
};

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "";

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [newProject, setNewProject] = useState<NewProject>({
    title: "",
    description: "",
    link: "",
    image_url: "",
    category: "",
    published: true,
  });

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadProjects(true);
    }
  }, [isAdmin]);

  async function loadProjects(adminMode = false) {
    setLoading(!adminMode);
    setAdminLoading(adminMode);
    const query = supabase.from<Project>("projects").select(
      "id,title,description,link,image_url,category,published,created_at",
    );

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setProjects([]);
      setAdminProjects([]);
    } else if (data) {
      setProjects(data.filter((project) => project.published));
      setAdminProjects(data);
      setError(null);
    }

    setLoading(false);
    setAdminLoading(false);
  }

  function handleLogin() {
    if (!ADMIN_PASSWORD) {
      setAdminError("Defina VITE_ADMIN_PASSWORD no .env antes de usar o painel admin.");
      return;
    }

    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminError(null);
      setAdminMessage("Você está logado como admin.");
    } else {
      setAdminError("Senha inválida. Tente novamente.");
      setAdminMessage(null);
    }
  }

  async function handleCreateProject() {
    setAdminMessage(null);
    const { error } = await supabase.from("projects").insert({
      title: newProject.title,
      description: newProject.description,
      link: newProject.link,
      image_url: newProject.image_url,
      category: newProject.category,
      published: newProject.published,
    });

    if (error) {
      setAdminError(error.message);
      return;
    }

    setAdminError(null);
    setAdminMessage("Projeto criado com sucesso.");
    setNewProject({
      title: "",
      description: "",
      link: "",
      image_url: "",
      category: "",
      published: true,
    });
    void loadProjects(true);
  }

  async function togglePublish(project: Project) {
    const { error } = await supabase
      .from("projects")
      .update({ published: !project.published })
      .eq("id", project.id);

    if (error) {
      setAdminError(error.message);
      return;
    }

    setAdminError(null);
    setAdminMessage(`Projeto ${project.title} atualizado.`);
    void loadProjects(true);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20">
        <header className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-sky-400">Portfólio</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Lucas Miranda</h1>
          <p className="mx-auto max-w-3xl text-base leading-7 text-slate-300">
            Portfólio com painel admin para criar projetos diretamente pelo site e publicar com Supabase.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <article className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-slate-700/70 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">Painel Admin</h2>
              <p className="mt-4 text-slate-300">
                Faça login com a senha de admin e adicione projetos diretamente pelo site. Isso evita que você precise entrar no Supabase para cada projeto.
              </p>
              {!isAdmin ? (
                <div className="mt-6 space-y-4">
                  <label className="block text-sm text-slate-300">
                    Senha de admin
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    Entrar como admin
                  </button>
                  {adminError ? <p className="text-rose-300">{adminError}</p> : null}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <p className="text-slate-300">Você está logado como admin. Use o formulário abaixo para adicionar projetos.</p>
                  {adminMessage ? <p className="text-sky-300">{adminMessage}</p> : null}
                </div>
              )}
            </article>

            {isAdmin ? (
              <article className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-slate-700/70 backdrop-blur">
                <h2 className="text-xl font-semibold text-white">Novo projeto</h2>
                <div className="mt-6 grid gap-4">
                  <input
                    value={newProject.title}
                    onChange={(event) => setNewProject({ ...newProject, title: event.target.value })}
                    placeholder="Título"
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  />
                  <textarea
                    value={newProject.description}
                    onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
                    placeholder="Descrição"
                    className="min-h-[120px] rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  />
                  <input
                    value={newProject.link}
                    onChange={(event) => setNewProject({ ...newProject, link: event.target.value })}
                    placeholder="Link do projeto"
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  />
                  <input
                    value={newProject.image_url}
                    onChange={(event) => setNewProject({ ...newProject, image_url: event.target.value })}
                    placeholder="URL da imagem"
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  />
                  <input
                    value={newProject.category}
                    onChange={(event) => setNewProject({ ...newProject, category: event.target.value })}
                    placeholder="Categoria"
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  />
                  <label className="inline-flex items-center gap-3 text-slate-300">
                    <input
                      type="checkbox"
                      checked={newProject.published}
                      onChange={(event) => setNewProject({ ...newProject, published: event.target.checked })}
                      className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-sky-400"
                    />
                    Publicado
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    className="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    Criar projeto
                  </button>
                  {adminError ? <p className="text-rose-300">{adminError}</p> : null}
                </div>
              </article>
            ) : null}
          </div>

          <div className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-slate-700/70 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Como publicar</h2>
            <p className="mt-4 text-slate-300">
              O painel admin permite criar projetos sem entrar no Supabase. Depois de criar, o projeto aparece na lista pública automaticamente se estiver com <strong>Publicado</strong> ativado.
            </p>
            <p className="mt-4 text-slate-300">
              Para usar no Vercel, configure as variáveis de ambiente no painel da Vercel:
            </p>
            <ul className="mt-4 space-y-2 text-slate-300">
              <li>- VITE_SUPABASE_URL</li>
              <li>- VITE_SUPABASE_PUBLISHABLE_KEY</li>
              <li>- VITE_ADMIN_PASSWORD</li>
            </ul>
          </div>
        </section>

        {isAdmin ? (
          <section className="mt-10 rounded-3xl bg-slate-950/80 p-6 ring-1 ring-slate-700/70 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Projetos do Admin</h2>
            <div className="mt-6 grid gap-4">
              {adminLoading ? (
                <p className="text-slate-300">Carregando projetos do admin...</p>
              ) : adminProjects.length === 0 ? (
                <p className="text-slate-300">Nenhum projeto encontrado.</p>
              ) : (
                adminProjects.map((project) => (
                  <article key={project.id} className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-sky-400">{project.category || "Projeto"}</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{project.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => void togglePublish(project)}
                        className={`rounded-2xl px-4 py-2 font-semibold transition ${project.published ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-amber-500 text-slate-950 hover:bg-amber-400"}`}
                      >
                        {project.published ? "Despublicar" : "Publicar"}
                      </button>
                    </div>
                    {project.link ? (
                      <a className="mt-3 block text-sky-300 hover:text-sky-200" href={project.link} target="_blank" rel="noreferrer">
                        {project.link}
                      </a>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <article key={project.id} className="overflow-hidden rounded-3xl bg-slate-950/80 ring-1 ring-slate-700/70 backdrop-blur transition hover:-translate-y-1 hover:border-sky-400/40">
                {project.image_url ? (
                  <div className="h-48 overflow-hidden bg-slate-900">
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    />
                  </div>
                ) : null}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-sky-400">{project.category || "Projeto"}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{project.title}</h3>
                    </div>
                    {project.link ? (
                      <a className="text-sky-300 hover:text-sky-200" href={project.link} target="_blank" rel="noreferrer">
                        Ver site
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-4 text-slate-300">{project.description ?? "Sem descrição fornecida."}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-10 text-center text-sm text-slate-400">
          <p>Use <code className="rounded bg-slate-800 px-2 py-1 text-slate-200">npm run dev</code> para iniciar.</p>
        </footer>
      </div>
    </main>
  );
}
