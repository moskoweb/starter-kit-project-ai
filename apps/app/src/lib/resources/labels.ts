import type { ResourceLabels } from "@vibe/ui/components/resource/types";
import type { Locale } from "../i18n";

/** Plain-data labels; function labels are rebuilt client-side by `toLabels`. */
export const resourceText = {
  "pt-BR": {
    search: "Buscar", filters: "Filtros", resetFilters: "Limpar filtros", columns: "Colunas", all: "Todos", rowsPerPage: "Por página", previous: "Anterior", next: "Próxima",
    selectAll: "Selecionar todos", selectRow: "Selecionar", actions: "Ações", view: "Visualizar", edit: "Editar", delete: "Excluir", deleteSelected: "Excluir selecionados", create: "Criar",
    confirmDeleteTitle: "Excluir registros?", cancel: "Cancelar", confirm: "Excluir", emptyTitle: "Nenhum registro", emptyDescription: "Ajuste busca e filtros ou crie um novo registro.",
    deleted: "Excluído.", deleteFailed: "Não foi possível excluir.", save: "Salvar", saving: "Salvando…", saved: "Salvo.", saveFailed: "Não foi possível salvar. Confira os campos.",
    yes: "Sim", no: "Não", required: "Campo obrigatório.", choose: "Selecione…", page: "Página {page} de {pages}", selected: "{count} selecionado(s)", deleteDescription: "{count} registro(s) serão excluídos. Esta ação não pode ser desfeita.",
    searchOptions: "Buscar…", noOptions: "Nenhuma opção encontrada.", pickDate: "Escolha uma data", confirmAction: "Confirmar",
    actionTitle: "{action}?", actionDescription: "Aplicar a {count} registro(s)?", actionSucceeded: "{action}: concluído.", actionFailed: "{action}: não foi possível concluir.",
  },
  en: {
    search: "Search", filters: "Filters", resetFilters: "Reset filters", columns: "Columns", all: "All", rowsPerPage: "Per page", previous: "Previous", next: "Next",
    selectAll: "Select all", selectRow: "Select", actions: "Actions", view: "View", edit: "Edit", delete: "Delete", deleteSelected: "Delete selected", create: "Create",
    confirmDeleteTitle: "Delete records?", cancel: "Cancel", confirm: "Delete", emptyTitle: "No records", emptyDescription: "Adjust search and filters or create a new record.",
    deleted: "Deleted.", deleteFailed: "Could not delete.", save: "Save", saving: "Saving…", saved: "Saved.", saveFailed: "Could not save. Check the fields.",
    yes: "Yes", no: "No", required: "Required field.", choose: "Select…", page: "Page {page} of {pages}", selected: "{count} selected", deleteDescription: "{count} record(s) will be deleted. This cannot be undone.",
    searchOptions: "Search…", noOptions: "No options found.", pickDate: "Pick a date", confirmAction: "Confirm",
    actionTitle: "{action}?", actionDescription: "Apply to {count} record(s)?", actionSucceeded: "{action}: done.", actionFailed: "{action}: could not complete.",
  },
} as const;
export type ResourceText = (typeof resourceText)[Locale];

export function toLabels(text: ResourceText): ResourceLabels {
  const fill = (template: string, values: Record<string, number | string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
  return {
    ...text,
    page: (page, pages) => fill(text.page, { page, pages }),
    selected: count => fill(text.selected, { count }),
    confirmDeleteDescription: count => fill(text.deleteDescription, { count }),
    confirmActionTitle: action => fill(text.actionTitle, { action }),
    confirmActionDescription: count => fill(text.actionDescription, { count }),
    actionSucceeded: action => fill(text.actionSucceeded, { action }),
    actionFailed: action => fill(text.actionFailed, { action }),
  };
}
