import Axios, { type InternalAxiosRequestConfig } from 'axios';

import { useNotifications } from '@/components/ui/notifications/notifications-store';
import { httpConfig, httpStatus } from '@/config/app-config';
import { env } from '@/config/env';
import { notificationVariants } from '@/config/ui-variants';

function requestInterceptor(config: InternalAxiosRequestConfig) {
  config.headers.Accept = httpConfig.defaultHeaders.accept;
  config.withCredentials = true;
  return config;
}

export const api = Axios.create({
  baseURL: env.API_URL,
  timeout: httpConfig.requestTimeoutMs,
});

api.interceptors.request.use(requestInterceptor);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message: string =
      error.response?.data?.message ?? error.message ?? 'Error inesperado';

    useNotifications.getState().addNotification({
      type: notificationVariants.error,
      title: 'Error',
      message,
    });

    if (error.response?.status === httpStatus.unauthorized) {
      window.location.href = '/';
    }

    return Promise.reject(error);
  },
);
