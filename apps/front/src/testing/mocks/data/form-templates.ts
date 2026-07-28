import {
  fieldComponentNames,
  fieldDecoratorNames,
} from '@/features/dynamic-form/config/field-components';
import type { FormTemplate } from '@/features/dynamic-form/types/form-template';

/**
 * Fixtures que simulan lo que devolvería el backend (o el generador de IA).
 * El `schema` es JSON puro: aquí está la gracia del enfoque schema-driven.
 */
export const formTemplatesDb: FormTemplate[] = [
  {
    id: 'onboarding-cliente',
    title: 'Onboarding de cliente',
    description: 'Datos básicos para dar de alta a un cliente nuevo.',
    status: 'published',
    fieldCount: 5,
    updatedAt: '2026-07-20T10:00:00.000Z',
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          title: 'Nombre completo',
          required: true,
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.text,
          'x-component-props': { placeholder: 'Ada Lovelace' },
        },
        email: {
          type: 'string',
          title: 'Correo electrónico',
          required: true,
          'x-validator': 'email',
          'x-decorator': fieldDecoratorNames.formItem,
          'x-decorator-props': { help: 'Usaremos este correo para el acceso.' },
          'x-component': fieldComponentNames.text,
          'x-component-props': { placeholder: 'ada@empresa.com' },
        },
        companySize: {
          type: 'string',
          title: 'Tamaño de la empresa',
          required: true,
          enum: [
            { label: '1 - 10', value: 'micro' },
            { label: '11 - 50', value: 'small' },
            { label: '51 - 200', value: 'medium' },
            { label: '200+', value: 'large' },
          ],
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.select,
        },
        startDate: {
          type: 'string',
          title: 'Fecha de arranque',
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.date,
        },
        acceptsTerms: {
          type: 'boolean',
          title: 'Términos y condiciones',
          required: true,
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.checkbox,
          'x-component-props': { children: 'Acepto los términos del servicio' },
        },
      },
    },
  },
  {
    id: 'encuesta-satisfaccion',
    title: 'Encuesta de satisfacción',
    description: 'Feedback trimestral de clientes activos.',
    status: 'published',
    fieldCount: 4,
    updatedAt: '2026-07-24T16:30:00.000Z',
    schema: {
      type: 'object',
      properties: {
        score: {
          type: 'number',
          title: '¿Qué tan probable es que nos recomiendes? (0-10)',
          required: true,
          'x-validator': [{ minimum: 0, maximum: 10 }],
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.number,
        },
        favouriteFeature: {
          type: 'string',
          title: 'Función favorita',
          enum: [
            { label: 'Generador con IA', value: 'ai-generator' },
            { label: 'Plantillas', value: 'templates' },
            { label: 'Analítica', value: 'analytics' },
          ],
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.radioGroup,
        },
        comments: {
          type: 'string',
          title: 'Comentarios',
          'x-decorator': fieldDecoratorNames.formItem,
          'x-decorator-props': { help: 'Opcional, pero nos ayuda muchísimo.' },
          'x-component': fieldComponentNames.textarea,
        },
        contactMe: {
          type: 'boolean',
          title: 'Seguimiento',
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.checkbox,
          'x-component-props': { children: 'Quiero que me contacten' },
        },
      },
    },
  },
  {
    id: 'solicitud-soporte',
    title: 'Solicitud de soporte',
    description: 'Borrador generado por IA, pendiente de revisión.',
    status: 'draft',
    fieldCount: 2,
    updatedAt: '2026-07-26T09:15:00.000Z',
    schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          title: 'Asunto',
          required: true,
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.text,
        },
        details: {
          type: 'string',
          title: 'Detalle del problema',
          required: true,
          'x-decorator': fieldDecoratorNames.formItem,
          'x-component': fieldComponentNames.textarea,
        },
      },
    },
  },
];
