/**
 * Claves de `localStorage` / `sessionStorage`.
 * ESLint prohíbe pasar un literal a `localStorage.getItem(...)`.
 */
export const storageKeys = {
  formDraft: (formTemplateId: string) => `afc:form-draft:${formTemplateId}`,
  theme: 'afc:theme',
} as const;
