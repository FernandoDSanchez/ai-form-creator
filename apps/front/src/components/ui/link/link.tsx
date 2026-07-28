import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from 'react-router';

import { cn } from '@/utils/cn';

export type LinkProps = RouterLinkProps;

/**
 * Wrapper de `react-router`. `to` debe venir siempre de `paths.*.getHref()`.
 */
export const Link = ({ className, children, ...props }: LinkProps) => (
  <RouterLink
    className={cn(
      'text-brand-600 hover:text-brand-700 font-medium underline-offset-4 hover:underline',
      className,
    )}
    {...props}
  >
    {children}
  </RouterLink>
);
