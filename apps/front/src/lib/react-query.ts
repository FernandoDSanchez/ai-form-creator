import type { DefaultOptions, UseMutationOptions } from '@tanstack/react-query';

import { queryConfigValues } from '@/config/app-config';

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: queryConfigValues.retryCount,
    staleTime: queryConfigValues.staleTimeMs,
  },
} satisfies DefaultOptions;

export type ApiFnReturnType<
  FnType extends (...args: never[]) => Promise<unknown>,
> = Awaited<ReturnType<FnType>>;

export type QueryConfig<T extends (...args: never[]) => unknown> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>;

export type MutationConfig<
  MutationFnType extends (...args: never[]) => Promise<unknown>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;
