export type Locale = "pt-BR" | "en";

export const messages = {
  "pt-BR": {
    navigation: "Navegação", account: "Minha conta", security: "Segurança",
    organizations: "Organizações", signOut: "Sair da conta", signOutError: "Não foi possível sair. Tente novamente.", openMenu: "Abrir navegação",
    closeMenu: "Fechar navegação", collapseSidebar: "Recolher navegação",
    theme: "Alternar tema", language: "Idioma", overview: "Visão geral", projects: "Projetos", tasks: "Tarefas", createdProjects: "Projetos criados", projectsByMonth: "Projetos por mês nos últimos 12 meses.", projectsSeries: "Projetos", noProjects: "Nenhum projeto criado neste período.", globalMetrics: "Métricas globais", users: "Usuários", save: "Salvar", cancel: "Cancelar", search: "Buscar", searchProjects: "Buscar projeto",
  },
  en: {
    navigation: "Navigation", account: "Account", security: "Security",
    organizations: "Organizations", signOut: "Sign out", signOutError: "Could not sign out. Try again.", openMenu: "Open navigation",
    closeMenu: "Close navigation", collapseSidebar: "Collapse navigation",
    theme: "Toggle theme", language: "Language", overview: "Overview", projects: "Projects", tasks: "Tasks", createdProjects: "Projects created", projectsByMonth: "Projects by month during the last 12 months.", projectsSeries: "Projects", noProjects: "No projects created in this period.", globalMetrics: "Global metrics", users: "Users", save: "Save", cancel: "Cancel", search: "Search", searchProjects: "Search projects",
  },
} as const;
