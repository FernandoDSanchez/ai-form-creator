import type { ISchema } from '@formily/react';
import { describe, expect, it, vi } from 'vitest';

import {
  fieldComponentNames,
  fieldDecoratorNames,
} from '@/features/dynamic-form/config/field-components';
import { renderApp, screen, waitFor } from '@/testing/test-utils';

import { DynamicForm } from '../dynamic-form';

const schema: ISchema = {
  type: 'object',
  properties: {
    fullName: {
      type: 'string',
      title: 'Nombre completo',
      required: true,
      'x-decorator': fieldDecoratorNames.formItem,
      'x-component': fieldComponentNames.text,
    },
  },
};

describe('DynamicForm', () => {
  it('renderiza los campos que declara el schema', async () => {
    renderApp(<DynamicForm schema={schema} onSubmit={vi.fn()} />);

    expect(await screen.findByText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('no envía si falta un campo requerido', async () => {
    const onSubmit = vi.fn();
    const { user } = renderApp(
      <DynamicForm schema={schema} onSubmit={onSubmit} />,
    );

    await user.click(await screen.findByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los valores cuando el formulario es válido', async () => {
    const onSubmit = vi.fn();
    const { user } = renderApp(
      <DynamicForm schema={schema} onSubmit={onSubmit} />,
    );

    await user.type(await screen.findByRole('textbox'), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ fullName: 'Ada Lovelace' }),
    );
  });
});
