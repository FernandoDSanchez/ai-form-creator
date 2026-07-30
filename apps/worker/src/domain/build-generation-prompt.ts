import {
  formFieldComponents,
  optionBackedFormFieldComponents,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
import {
  formFieldCatalog,
  formFieldGroups,
  type FormFieldGroup,
} from '@ai-form-creator/contracts/form-generation/form-field-name';
import { generatedFormLimits } from '@ai-form-creator/contracts/form-generation/generated-form';

/**
 * Builds the two messages sent to the model.
 *
 * A pure function: it receives data, it returns strings. Everything verifiable
 * in this file can be tested without a network, and in fact is.
 *
 * The vocabulary is not written by hand in the text: it is generated from
 * `formFieldCatalog`. A new field shows up in the prompt the same day it is
 * added to the contract, and not the day somebody remembers to update the
 * paragraph.
 */

const groupTitles: Record<FormFieldGroup, string> = {
  [formFieldGroups.compliance]: 'Compliance (cross-cutting)',
  [formFieldGroups.customs]: 'Customs and foreign trade',
};

/** The catalog, as a readable table: `name` — description (suggested component). */
const describeVocabulary = (): string =>
  Object.values(formFieldGroups)
    .map((group) => {
      const rows = Object.entries(formFieldCatalog)
        .filter(([, definition]) => definition.group === group)
        .map(
          ([name, definition]) =>
            `- ${name}: ${definition.description} (suggested: ${definition.component})`,
        )
        .join('\n');

      return `### ${groupTitles[group]}\n${rows}`;
    })
    .join('\n\n');

export const buildSystemPrompt = (): string =>
  [
    'You are a regulatory compliance analyst. You design forms that collect ' +
      'the data a regulation requires.',
    '',
    'You return only the JSON object the response schema asks for. No text ' +
      'around it, no markdown, no explanations.',
    '',
    '## Field vocabulary',
    '',
    'The `name` of every field has to come from this closed list. You cannot ' +
      'invent names: a name outside the list invalidates the whole answer. If ' +
      'a piece of data the regulation asks for has no field matching it, omit ' +
      'it — a short and correct form is preferable to a complete one that ' +
      'cannot be processed.',
    '',
    describeVocabulary(),
    '',
    '## Components',
    '',
    `Accepted values for \`component\`: ${Object.values(formFieldComponents).join(', ')}.`,
    `Only ${optionBackedFormFieldComponents.join(' and ')} carry \`options\`, ` +
      'and for them they are mandatory. The rest have to bring `options` as an ' +
      'empty array.',
    '',
    '## Rules',
    '',
    `- Between ${generatedFormLimits.minFields} and ${generatedFormLimits.maxFields} fields.`,
    '- Do not repeat a `name`: every field appears exactly once.',
    '- `title` goes in English, in the formal register of an official filing.',
    '- `isRequired` is `true` only if the regulation requires the data for the ' +
      'filing to be valid.',
    '- `helpText` and `placeholder` are empty strings when they contribute ' +
      'nothing. Do not fill them in for the sake of it.',
    `- \`options\`: up to ${generatedFormLimits.maxOptions}, with \`value\` in ` +
      'lower case without spaces and `label` in English.',
    '- Order the fields the way they would be filled in: identification first, ' +
      'declarations and signatures last.',
  ].join('\n');

export type UserPromptInput = {
  /** The request, exactly as the person wrote it. */
  prompt: string;
  /** RAG chunks. Empty if no documents were chosen. */
  regulatoryContext: string;
  /** Errors from the previous attempt. Empty on the first one. */
  problems: string[];
};

export const buildUserPrompt = ({
  prompt,
  regulatoryContext,
  problems,
}: UserPromptInput): string => {
  const sections = ['## Request', '', prompt];

  if (regulatoryContext.trim().length > 0) {
    sections.push(
      '',
      '## Regulatory sources',
      '',
      'Chunks of the regulatory documents the user chose. Lean on them to ' +
        'decide which data to ask for and which items are mandatory. If they ' +
        'contradict the request, the chunks win.',
      '',
      regulatoryContext,
    );
  }

  if (problems.length > 0) {
    // It goes last on purpose: it is what the model has freshest when it starts
    // writing, and it is the only thing separating this attempt from the last.
    sections.push(
      '',
      '## Correction',
      '',
      'Your previous answer was rejected for these reasons. Fix them and ' +
        'return the complete form again:',
      '',
      ...problems.map((problem) => `- ${problem}`),
    );
  }

  return sections.join('\n');
};
