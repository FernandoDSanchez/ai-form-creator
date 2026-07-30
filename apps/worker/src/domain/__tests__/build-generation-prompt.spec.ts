import { formFieldComponents } from '@ai-form-creator/contracts/form-generation/form-field-component';
import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';

import { buildSystemPrompt, buildUserPrompt } from '../build-generation-prompt';

describe('buildSystemPrompt', () => {
  const systemPrompt = buildSystemPrompt();

  it('enumera el vocabulario completo', () => {
    // Si un campo del catálogo no llega al prompt, el modelo no lo va a usar
    // nunca — y nadie se entera, porque el formulario igual valida.
    for (const name of Object.values(formFieldNames)) {
      expect(systemPrompt).toContain(name);
    }
  });

  it('enumera los componentes admitidos', () => {
    for (const component of Object.values(formFieldComponents)) {
      expect(systemPrompt).toContain(component);
    }
  });

  it('dice explícitamente que la lista es cerrada', () => {
    expect(systemPrompt).toContain('lista cerrada');
  });
});

describe('buildUserPrompt', () => {
  const prompt = 'Formulario de declaración de importación.';

  it('incluye el pedido tal cual', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '',
      problems: [],
    });

    expect(userPrompt).toContain(prompt);
  });

  it('no arma la sección de fuentes si no hubo documentos', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '   ',
      problems: [],
    });

    expect(userPrompt).not.toContain('Fuentes normativas');
  });

  it('incluye los fragmentos del RAG cuando los hay', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '[resolucion.pdf]\nArtículo 5: …',
      problems: [],
    });

    expect(userPrompt).toContain('Fuentes normativas');
    expect(userPrompt).toContain('Artículo 5');
  });

  it('no arma la sección de corrección en el primer intento', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '',
      problems: [],
    });

    expect(userPrompt).not.toContain('Corrección');
  });

  it('pone los errores del intento anterior al final', () => {
    // Al final a propósito: es lo último que el modelo lee antes de escribir, y
    // es lo único que diferencia este intento del anterior.
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: 'contexto',
      problems: ['El campo "riskLevel" necesita opciones.'],
    });

    expect(userPrompt).toContain('El campo "riskLevel" necesita opciones.');
    expect(userPrompt.indexOf('Corrección')).toBeGreaterThan(
      userPrompt.indexOf('Fuentes normativas'),
    );
  });
});
