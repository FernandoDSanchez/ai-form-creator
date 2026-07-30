import { formGenerationEvents } from '@ai-form-creator/contracts/form-generation/form-generation-event';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { formGenerationQueryKeys } from '../config/api-endpoints';
import { formGenerationStream } from '../config/stream-config';
import type { FormGeneration } from '../types/form-generation';

/**
 * Keeps the screen informed of what the pipeline is doing without asking.
 *
 * The full journey is: the worker writes the status into Postgres → a trigger
 * fires `NOTIFY` → the back listens with `LISTEN` and emits over socket.io →
 * this writes it into the react-query cache. Since what arrives is the complete
 * entity, it can be written straight with `setQueryData` instead of
 * invalidating: no GET back is needed to show it.
 *
 * It returns nothing. Components read from `useFormGeneration` as if it did not
 * exist; this only keeps that read up to date. That way, if the socket does not
 * connect, there is nothing to break — the query's `refetchInterval` holds the
 * screen up all the same.
 */
export const useFormGenerationStream = (formGenerationId: string): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!formGenerationStream.isEnabled) {
      return;
    }

    const socket = io(formGenerationStream.url, {
      // The handshake lives below the API prefix, not at the domain root. See
      // `stream-config.ts`.
      path: formGenerationStream.path,
      // The server hands it to another replica when one goes down:
      // reconnecting is the default behaviour and here it is worth keeping.
      autoConnect: true,
    });

    // The subscription goes in `connect` and not just once: on reconnect, the
    // server is a new session and the previous room no longer exists. Without
    // this, the screen goes mute after the first drop — which is exactly when
    // it is needed.
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
