/**
 * `localStorage` / `sessionStorage` keys.
 * ESLint forbids passing a literal to `localStorage.getItem(...)`.
 */
export const storageKeys = {
  formDraft: (formTemplateId: string) => `afc:form-draft:${formTemplateId}`,
  theme: 'afc:theme',
} as const;
