import { formGenerationEvents } from '@ai-form-creator/contracts/form-generation/form-generation-event';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { formGenerationQueryKeys } from '../config/api-endpoints';
import { formGenerationStream } from '../config/stream-config';
import type { FormGeneration } from '../types/form-generation';

/**
 * Deja la pantalla enterada de lo que hace el pipeline sin preguntar.
 *
 * El recorrido completo es: el worker escribe el estado en Postgres → un
 * trigger dispara `NOTIFY` → el back lo escucha con `LISTEN` y emite por
 * socket.io → esto lo escribe en la caché de react-query. Como lo que llega es
 * la entidad completa, se puede escribir directo con `setQueryData` en vez de
 * invalidar: no hace falta un GET de vuelta para mostrarla.
 *
 * No devuelve nada. Los componentes leen de `useFormGeneration` como si no
 * existiera; esto sólo hace que esa lectura esté al día. Así, si el socket no
 * conecta, no hay nada que romper — el `refetchInterval` de la query sostiene
 * la pantalla igual.
 */
export const useFormGenerationStream = (formGenerationId: string): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!formGenerationStream.isEnabled) {
      return;
    }

    const socket = io(formGenerationStream.url, {
      // El handshake vive bajo el prefijo de la API, no en la raíz del dominio.
      // Ver `stream-config.ts`.
      path: formGenerationStream.path,
      // El servidor se lo pasa a otra réplica cuando se cae una: reconectar es
      // el comportamiento por defecto y acá conviene dejarlo.
      autoConnect: true,
    });

    // La suscripción va en `connect` y no una sola vez: al reconectar, el
    // servidor es una sesión nueva y la sala anterior no existe más. Sin esto,
    // la pantalla queda muda después del primer corte — que es exactamente el
    // momento en el que hace falta.
    const subscribe = () => {
      socket.emit(formGenerationEvents.watch, formGenerationId);
    };

    const applyChange = (formGeneration: FormGeneration) => {
      queryClient.setQueryData(
        formGenerationQueryKeys.detail(formGeneration.id),
        formGeneration,
      );
    };

    socket.on('connect', subscribe);
    socket.on(formGenerationEvents.changed, applyChange);

    return () => {
      socket.off('connect', subscribe);
      socket.off(formGenerationEvents.changed, applyChange);
      socket.close();
    };
  }, [formGenerationId, queryClient]);
};
