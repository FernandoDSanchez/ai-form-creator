# 04 — Validation ✅

Run and green:

- [x] `npm run lint` — 0 errors, 0 warnings
- [x] `npm run check-types` — 0 errors
- [x] `npm test` — 3 tests (render from schema, validation blocking, submit)
- [x] `npm run build` — production build correct
- [x] Generators: `npm run generate` produces code that passes lint and tsc

Verified in the browser (dev server + MSW):

- [x] `/forms` lists the 3 templates with their status badge
- [x] `/forms/customer-onboarding` renders text, email, select, date and
      checkbox from the JSON Schema
- [x] Validation messages: "This field is required", "It must be a valid email
      address"; the submit is blocked
- [x] Successful submission → "Response submitted" toast
- [x] `/forms/support-request` (draft): fields disabled, notice shown and button
      blocked through `formStatusVariants`

Architecture rules verified with a test file that violated them (cross-feature
import both relative and by alias, import of `app/` from a feature, comparison
against a string literal, literal storage key, `import.meta.env` outside config,
magic number, PascalCase file name): all 8 fired.

Bugs found and fixed during validation:

- Invisible toasts: `--spacing-sm` vs `max-w-sm` token collision (Tailwind
  resolved `max-w-sm` to `0.5rem`). Solved with `--container-*` tokens with
  names of their own; it also affected `max-w-2xl` on the landing page.
- Formily validation messages falling back to the library defaults → an explicit
  locale registered.
