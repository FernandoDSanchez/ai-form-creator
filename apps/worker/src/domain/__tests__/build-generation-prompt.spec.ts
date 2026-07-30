import { formFieldComponents } from '@ai-form-creator/contracts/form-generation/form-field-component';
import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';

import { buildSystemPrompt, buildUserPrompt } from '../build-generation-prompt';

describe('buildSystemPrompt', () => {
  const systemPrompt = buildSystemPrompt();

  it('lists the complete vocabulary', () => {
    // If a field of the catalog never reaches the prompt, the model will never
    // use it — and nobody finds out, because the form validates anyway.
    for (const name of Object.values(formFieldNames)) {
      expect(systemPrompt).toContain(name);
    }
  });

  it('lists the accepted components', () => {
    for (const component of Object.values(formFieldComponents)) {
      expect(systemPrompt).toContain(component);
    }
  });

  it('says explicitly that the list is closed', () => {
    expect(systemPrompt).toContain('closed list');
  });
});

describe('buildUserPrompt', () => {
  const prompt = 'Import declaration form.';

  it('includes the request as-is', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '',
      problems: [],
    });

    expect(userPrompt).toContain(prompt);
  });

  it('does not build the sources section if there were no documents', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '   ',
      problems: [],
    });

    expect(userPrompt).not.toContain('Regulatory sources');
  });

  it('includes the RAG chunks when there are any', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '[resolution.pdf]\nArticle 5: …',
      problems: [],
    });

    expect(userPrompt).toContain('Regulatory sources');
    expect(userPrompt).toContain('Article 5');
  });

  it('does not build the correction section on the first attempt', () => {
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: '',
      problems: [],
    });

    expect(userPrompt).not.toContain('Correction');
  });

  it('puts the previous attempt errors at the end', () => {
    // At the end on purpose: it is the last thing the model reads before
    // writing, and the only thing separating this attempt from the last.
    const userPrompt = buildUserPrompt({
      prompt,
      regulatoryContext: 'context',
      problems: ['The "riskLevel" field needs options.'],
    });

    expect(userPrompt).toContain('The "riskLevel" field needs options.');
    expect(userPrompt.indexOf('Correction')).toBeGreaterThan(
      userPrompt.indexOf('Regulatory sources'),
    );
  });
});
