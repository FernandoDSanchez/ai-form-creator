import type { ISchema } from '@formily/react';
import { describe, expect, it, vi } from 'vitest';

import {
  formFieldComponents,
  formFieldDecorators,
} from '@/features/dynamic-form/config/field-components';
import { renderApp, screen, waitFor } from '@/testing/test-utils';

import { DynamicForm } from '../dynamic-form';

const schema: ISchema = {
  type: 'object',
  properties: {
    fullName: {
      type: 'string',
      title: 'Full name',
      required: true,
      'x-decorator': formFieldDecorators.formItem,
      'x-component': formFieldComponents.text,
    },
  },
};

describe('DynamicForm', () => {
  it('renders the fields the schema declares', async () => {
    renderApp(<DynamicForm schema={schema} onSubmit={vi.fn()} />);

    expect(await screen.findByText('Full name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('does not submit if a required field is missing', async () => {
    const onSubmit = vi.fn();
    const { user } = renderApp(
      <DynamicForm schema={schema} onSubmit={onSubmit} />,
    );

    await user.click(await screen.findByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the values when the form is valid', async () => {
    const onSubmit = vi.fn();
    const { user } = renderApp(
      <DynamicForm schema={schema} onSubmit={onSubmit} />,
    );

    await user.type(await screen.findByRole('textbox'), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ fullName: 'Ada Lovelace' }),
    );
  });
});
