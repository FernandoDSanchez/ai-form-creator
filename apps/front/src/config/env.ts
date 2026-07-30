import * as z from 'zod';

/**
 * The only place in the code that reads `import.meta.env`.
 * ESLint forbids reading it outside `src/config` (`no-restricted-properties`).
 */
const createEnv = () => {
  const EnvSchema = z.object({
    API_URL: z.string().min(1),
    ENABLE_API_MOCKING: z
      .string()
      .refine((value) => value === 'true' || value === 'false')
      .transform((value) => value === 'true')
      .optional(),
    URL: z.string().optional().default('http://localhost:3000'),
  });

  const envVars = Object.entries(import.meta.env).reduce<
    Record<string, string>
  >((acc, [key, value]) => {
    if (key.startsWith('VITE_APP_')) {
      acc[key.replace('VITE_APP_', '')] = value as string;
    }
    return acc;
  }, {});

  const parsedEnv = EnvSchema.safeParse(envVars);

  if (!parsedEnv.success) {
    const fieldErrors = z.flattenError(parsedEnv.error).fieldErrors;

    throw new Error(
      [
        'Invalid environment variables. Check your `.env` file (see `.env.example`).',
        ...Object.entries(fieldErrors).map(
          ([key, errors]) => `- VITE_APP_${key}: ${errors?.join(', ')}`,
        ),
      ].join('\n'),
    );
  }

  return {
    ...parsedEnv.data,
    IS_DEV: import.meta.env.DEV,
    IS_PROD: import.meta.env.PROD,
  } as const;
};

export const env = createEnv();
