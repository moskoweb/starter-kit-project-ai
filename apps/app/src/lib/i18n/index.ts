export type Locale = "pt-BR" | "en";

export const messages = {
  "pt-BR": {
    navigation: "Navegação", account: "Minha conta", security: "Segurança",
    organizations: "Organizações", signOut: "Sair da conta", signOutError: "Não foi possível sair. Tente novamente.", openMenu: "Abrir navegação",
    closeMenu: "Fechar navegação", collapseSidebar: "Recolher navegação",
    theme: "Alternar tema", language: "Idioma", overview: "Visão geral", globalMetrics: "Métricas globais", users: "Usuários", save: "Salvar", cancel: "Cancelar", search: "Buscar", dashboard: "Painel", light: "Claro", dark: "Escuro", system: "Sistema", appearance: "Aparência", commandPlaceholder: "Ir para página ou executar ação…", noResults: "Nenhum resultado.", pages: "Páginas", workspace: "Espaço de trabalho", manageOrganizations: "Gerenciar organizações", personal: "Pessoal", settings: "Configurações", notifications: "Notificações", welcome: "Bem-vindo(a)", dashboardDescription: "Resumo do seu espaço de trabalho.", emptyDashboard: "Nada por aqui ainda", emptyDashboardDescription: "Este painel ainda não tem widgets nem recursos.", emptyDashboardHint: "Desenvolvimento: gere um recurso com", records: "Registros",
  },
  en: {
    navigation: "Navigation", account: "Account", security: "Security",
    organizations: "Organizations", signOut: "Sign out", signOutError: "Could not sign out. Try again.", openMenu: "Open navigation",
    closeMenu: "Close navigation", collapseSidebar: "Collapse navigation",
    theme: "Toggle theme", language: "Language", overview: "Overview", globalMetrics: "Global metrics", users: "Users", save: "Save", cancel: "Cancel", search: "Search", dashboard: "Dashboard", light: "Light", dark: "Dark", system: "System", appearance: "Appearance", commandPlaceholder: "Go to page or run action…", noResults: "No results.", pages: "Pages", workspace: "Workspace", manageOrganizations: "Manage organizations", personal: "Personal", settings: "Settings", notifications: "Notifications", welcome: "Welcome", dashboardDescription: "Summary of your workspace.", emptyDashboard: "Nothing here yet", emptyDashboardDescription: "This panel has no widgets or resources yet.", emptyDashboardHint: "Development: generate a resource with", records: "Records",
  },
} as const;
