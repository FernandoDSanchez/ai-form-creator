# 04 — Validación ✅

Ejecutado y en verde:

- [x] `npm run lint` — 0 errores, 0 warnings
- [x] `npm run check-types` — 0 errores
- [x] `npm test` — 3 tests (render desde schema, bloqueo por validación, submit)
- [x] `npm run build` — build de producción correcto
- [x] Generadores: `npm run generate` produce código que pasa lint y tsc

Verificado en navegador (dev server + MSW):

- [x] `/forms` lista las 3 plantillas con su badge de estado
- [x] `/forms/onboarding-cliente` renderiza text, email, select, date y checkbox
      desde el JSON Schema
- [x] Validación en español: «Este campo es obligatorio», «Debe ser un correo
      electrónico válido»; el submit se bloquea
- [x] Envío correcto → toast «Respuesta enviada»
- [x] `/forms/solicitud-soporte` (borrador): campos deshabilitados, aviso y
      botón bloqueado vía `formStatusVariants`

Reglas de arquitectura verificadas con un archivo de prueba que las violaba
(cross-feature import relativo y por alias, import de `app/` desde una feature,
comparación contra string literal, clave de storage literal, `import.meta.env`
fuera de config, número mágico, nombre de archivo PascalCase): las 8 dispararon.

Bugs encontrados y corregidos durante la validación:

- Toasts invisibles: colisión de tokens `--spacing-sm` vs `max-w-sm` (Tailwind
  resolvía `max-w-sm` a `0.5rem`). Solucionado con `--container-*` con nombre
  propio; afectaba también a `max-w-2xl` en la landing.
- Mensajes de validación de Formily en inglés → locale `es` registrado.
