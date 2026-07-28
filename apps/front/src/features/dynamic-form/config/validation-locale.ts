import { registerValidateLocale, setValidateLanguage } from '@formily/core';

/**
 * Configuración Centralizada de los mensajes de validación.
 * Formily sólo trae `en` y `zh`; aquí registramos el español y lo activamos.
 * Se importa una vez desde `dynamic-form.tsx` (side effect controlado).
 */
export const validationLocale = {
  es: {
    pattern: 'Este campo no es válido',
    invalid: 'Este campo no es válido',
    required: 'Este campo es obligatorio',
    number: 'Debe ser un número',
    integer: 'Debe ser un número entero',
    url: 'Debe ser una URL válida',
    email: 'Debe ser un correo electrónico válido',
    date: 'Debe ser una fecha válida',
    len: 'Debe tener exactamente {{len}} caracteres',
    min: 'No puede ser menor que {{min}}',
    minLength: 'Debe tener al menos {{minLength}} caracteres',
    max: 'No puede ser mayor que {{max}}',
    maxLength: 'Debe tener como máximo {{maxLength}} caracteres',
    maximum: 'No puede ser mayor que {{maximum}}',
    minimum: 'No puede ser menor que {{minimum}}',
    whitespace: 'Este campo no puede estar vacío',
    enum: 'El valor debe ser uno de: {{enum}}',
  },
} as const;

const validationLanguage = 'es';

export const setupValidationLocale = () => {
  registerValidateLocale(validationLocale);
  setValidateLanguage(validationLanguage);
};
