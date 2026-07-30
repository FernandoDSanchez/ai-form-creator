import { registerValidateLocale, setValidateLanguage } from '@formily/core';

/**
 * Centralized configuration of the validation messages.
 * Formily only ships `en` and `zh`; here the English wording is registered so
 * the copy matches the rest of the app instead of the library defaults.
 * It is imported once from `dynamic-form.tsx` (controlled side effect).
 */
export const validationLocale = {
  en: {
    pattern: 'This field is not valid',
    invalid: 'This field is not valid',
    required: 'This field is required',
    number: 'It must be a number',
    integer: 'It must be a whole number',
    url: 'It must be a valid URL',
    email: 'It must be a valid email address',
    date: 'It must be a valid date',
    len: 'It must be exactly {{len}} characters long',
    min: 'It cannot be lower than {{min}}',
    minLength: 'It must be at least {{minLength}} characters long',
    max: 'It cannot be higher than {{max}}',
    maxLength: 'It must be at most {{maxLength}} characters long',
    maximum: 'It cannot be higher than {{maximum}}',
    minimum: 'It cannot be lower than {{minimum}}',
    whitespace: 'This field cannot be empty',
    enum: 'The value must be one of: {{enum}}',
  },
} as const;

const validationLanguage = 'en';

export const setupValidationLocale = () => {
  registerValidateLocale(validationLocale);
  setValidateLanguage(validationLanguage);
};
