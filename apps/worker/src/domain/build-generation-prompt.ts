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
 * Arma los dos mensajes que se le mandan al modelo.
 *
 * Función pura: recibe datos, devuelve strings. Todo lo verificable de este
 * archivo se puede testear sin red, y de hecho se testea.
 *
 * El vocabulario no se escribe a mano en el texto: se genera desde
 * `formFieldCatalog`. Un campo nuevo aparece en el prompt el mismo día que se
 * agrega al contrato, y no el día que alguien se acuerda de actualizar el
 * párrafo.
 */

const groupTitles: Record<FormFieldGroup, string> = {
  [formFieldGroups.compliance]: 'Cumplimiento (transversal)',
  [formFieldGroups.customs]: 'Aduana y comercio exterior',
};

/** El catálogo, como tabla legible: `nombre` — descripción (componente sugerido). */
const describeVocabulary = (): string =>
  Object.values(formFieldGroups)
    .map((group) => {
      const rows = Object.entries(formFieldCatalog)
        .filter(([, definition]) => definition.group === group)
        .map(
          ([name, definition]) =>
            `- ${name}: ${definition.description} (sugerido: ${definition.component})`,
        )
        .join('\n');

      return `### ${groupTitles[group]}\n${rows}`;
    })
    .join('\n\n');

export const buildSystemPrompt = (): string =>
  [
    'Sos un analista de cumplimiento normativo. Diseñás formularios que ' +
      'recogen los datos que exige una norma.',
    '',
    'Devolvés únicamente el objeto JSON que pide el esquema de respuesta. Sin ' +
      'texto alrededor, sin markdown, sin explicaciones.',
    '',
    '## Vocabulario de campos',
    '',
    'El `name` de cada campo tiene que salir de esta lista cerrada. No podés ' +
      'inventar nombres: un nombre fuera de la lista invalida la respuesta ' +
      'entera. Si un dato que la norma pide no tiene un campo que le ' +
      'corresponda, omitilo — es preferible un formulario corto y correcto a ' +
      'uno completo que no se puede procesar.',
    '',
    describeVocabulary(),
    '',
    '## Componentes',
    '',
    `Valores admitidos para \`component\`: ${Object.values(formFieldComponents).join(', ')}.`,
    `Sólo ${optionBackedFormFieldComponents.join(' y ')} llevan \`options\`, y ` +
      'les son obligatorias. El resto tiene que traer `options` como arreglo ' +
      'vacío.',
    '',
    '## Reglas',
    '',
    `- Entre ${generatedFormLimits.minFields} y ${generatedFormLimits.maxFields} campos.`,
    '- No repitas un `name`: cada campo aparece una sola vez.',
    '- `title` va en español, en el registro formal de un trámite oficial.',
    '- `isRequired` en `true` sólo si la norma exige el dato para dar el ' +
      'trámite por válido.',
    '- `helpText` y `placeholder` son cadenas vacías cuando no aportan nada. ' +
      'No los rellenes por rellenar.',
    `- \`options\`: hasta ${generatedFormLimits.maxOptions}, con \`value\` en ` +
      'minúsculas sin espacios y `label` en español.',
    '- Ordená los campos como se llenarían: identificación primero, ' +
      'declaraciones y firmas al final.',
  ].join('\n');

export type UserPromptInput = {
  /** El pedido, tal cual lo escribió la persona. */
  prompt: string;
  /** Fragmentos del RAG. Vacío si no se eligieron documentos. */
  regulatoryContext: string;
  /** Errores del intento anterior. Vacío en el primero. */
  problems: string[];
};

export const buildUserPrompt = ({
  prompt,
  regulatoryContext,
  problems,
}: UserPromptInput): string => {
  const sections = ['## Pedido', '', prompt];

  if (regulatoryContext.trim().length > 0) {
    sections.push(
      '',
      '## Fuentes normativas',
      '',
      'Fragmentos de los documentos regulatorios que eligió el usuario. ' +
        'Apoyate en ellos para decidir qué datos pedir y cuáles son ' +
        'obligatorios. Si se contradicen con el pedido, mandan los fragmentos.',
      '',
      regulatoryContext,
    );
  }

  if (problems.length > 0) {
    // Va último a propósito: es lo que el modelo tiene más fresco al empezar a
    // escribir, y es lo único que diferencia este intento del anterior.
    sections.push(
      '',
      '## Corrección',
      '',
      'Tu respuesta anterior fue rechazada por estos motivos. Corregilos y ' +
        'devolvé el formulario completo de nuevo:',
      '',
      ...problems.map((problem) => `- ${problem}`),
    );
  }

  return sections.join('\n');
};
