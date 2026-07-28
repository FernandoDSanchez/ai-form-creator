import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';

import { uiConfig } from '@/config/app-config';
import type { NotificationVariant } from '@/config/ui-variants';
import { cn } from '@/utils/cn';

import { useNotifications, type Notification } from './notifications-store';

/**
 * Variant Mapping: cada variante declara su icono y sus clases (tokens).
 * Añadir una variante nueva = añadir una entrada aquí.
 */
const notificationStyles: Record<
  NotificationVariant,
  { icon: LucideIcon; container: string; iconColor: string }
> = {
  info: {
    icon: Info,
    container: 'border-info bg-info-surface',
    iconColor: 'text-info',
  },
  success: {
    icon: CheckCircle2,
    container: 'border-success bg-success-surface',
    iconColor: 'text-success',
  },
  warning: {
    icon: AlertTriangle,
    container: 'border-warning bg-warning-surface',
    iconColor: 'text-warning',
  },
  error: {
    icon: XCircle,
    container: 'border-danger bg-danger-surface',
    iconColor: 'text-danger',
  },
};

type NotificationToastProps = {
  notification: Notification;
  onDismiss: (id: string) => void;
};

const NotificationToast = ({
  notification,
  onDismiss,
}: NotificationToastProps) => {
  const {
    icon: Icon,
    container,
    iconColor,
  } = notificationStyles[notification.type];

  useEffect(() => {
    const timeout = setTimeout(
      () => onDismiss(notification.id),
      uiConfig.notificationTimeoutMs,
    );
    return () => clearTimeout(timeout);
  }, [notification.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-label={notification.title}
      className={cn(
        'shadow-card gap-sm p-md flex w-full items-start rounded-md border',
        container,
      )}
    >
      <Icon aria-hidden className={cn('size-5 shrink-0', iconColor)} />
      <div className="flex-1">
        <p className="text-sm font-medium">{notification.title}</p>
        {notification.message ? (
          <p className="text-content-muted mt-2xs text-sm">
            {notification.message}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={() => onDismiss(notification.id)}
        className="text-content-muted hover:text-content"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
};

export const Notifications = () => {
  const notifications = useNotifications((state) => state.notifications);
  const dismissNotification = useNotifications(
    (state) => state.dismissNotification,
  );

  return (
    <div
      aria-live="polite"
      className="bottom-md right-md gap-sm max-w-toast fixed z-50 flex w-full flex-col"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
};
