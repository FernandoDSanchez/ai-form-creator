import {
  formFieldComponents,
  formFieldDecorators,
} from '@/features/dynamic-form/config/field-components';
import type { FormTemplate } from '@/features/dynamic-form/types/form-template';

/**
 * Fixtures simulating what the backend (or the AI generator) would return.
 * The `schema` is plain JSON: this is the point of the schema-driven approach.
 */
export const formTemplatesDb: FormTemplate[] = [
  {
    id: 'customer-onboarding',
    title: 'Customer onboarding',
    description: 'Basic data to register a new customer.',
    status: 'published',
    fieldCount: 5,
    updatedAt: '2026-07-20T10:00:00.000Z',
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          title: 'Full name',
          required: true,
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.text,
          'x-component-props': { placeholder: 'Ada Lovelace' },
        },
        email: {
          type: 'string',
          title: 'Email address',
          required: true,
          'x-validator': 'email',
          'x-decorator': formFieldDecorators.formItem,
          'x-decorator-props': { help: 'We will use this address for access.' },
          'x-component': formFieldComponents.text,
          'x-component-props': { placeholder: 'ada@company.com' },
        },
        companySize: {
          type: 'string',
          title: 'Company size',
          required: true,
          enum: [
            { label: '1 - 10', value: 'micro' },
            { label: '11 - 50', value: 'small' },
            { label: '51 - 200', value: 'medium' },
            { label: '200+', value: 'large' },
          ],
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.select,
        },
        startDate: {
          type: 'string',
          title: 'Start date',
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.date,
        },
        acceptsTerms: {
          type: 'boolean',
          title: 'Terms and conditions',
          required: true,
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.checkbox,
          'x-component-props': { children: 'I accept the terms of service' },
        },
      },
    },
  },
  {
    id: 'satisfaction-survey',
    title: 'Satisfaction survey',
    description: 'Quarterly feedback from active customers.',
    status: 'published',
    fieldCount: 4,
    updatedAt: '2026-07-24T16:30:00.000Z',
    schema: {
      type: 'object',
      properties: {
        score: {
          type: 'number',
          title: 'How likely are you to recommend us? (0-10)',
          required: true,
          'x-validator': [{ minimum: 0, maximum: 10 }],
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.number,
        },
        favouriteFeature: {
          type: 'string',
          title: 'Favourite feature',
          enum: [
            { label: 'AI generator', value: 'ai-generator' },
            { label: 'Templates', value: 'templates' },
            { label: 'Analytics', value: 'analytics' },
          ],
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.radioGroup,
        },
        comments: {
          type: 'string',
          title: 'Comments',
          'x-decorator': formFieldDecorators.formItem,
          'x-decorator-props': { help: 'Optional, but it helps us a lot.' },
          'x-component': formFieldComponents.textarea,
        },
        contactMe: {
          type: 'boolean',
          title: 'Follow-up',
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.checkbox,
          'x-component-props': { children: 'I would like to be contacted' },
        },
      },
    },
  },
  {
    id: 'support-request',
    title: 'Support request',
    description: 'AI-generated draft, pending review.',
    status: 'draft',
    fieldCount: 2,
    updatedAt: '2026-07-26T09:15:00.000Z',
    schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          title: 'Subject',
          required: true,
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.text,
        },
        details: {
          type: 'string',
          title: 'Problem details',
          required: true,
          'x-decorator': formFieldDecorators.formItem,
          'x-component': formFieldComponents.textarea,
        },
      },
    },
  },
];
