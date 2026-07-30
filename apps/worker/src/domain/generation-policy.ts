/**
 * Las reglas de tiempo y reintentos del pipeline.
 *
 * Viven en `domain/` y no en `config/` porque las lee el workflow, y el
 * workflow no puede tocar `config/`: `process.env` no existe dentro del
 * sandbox determinista. Además son valores que **no pueden** cambiar sin
 * pensarlo — un workflow en vuelo reejecuta con el código nuevo, así que
 * cambiar un timeout no es lo mismo que cambiar un timeout de un servidor
 * HTTP.
 */

/**
 * Cuántas veces se le pide el formulario al modelo antes de rendirse.
 *
 * Tres y no más: el primer reintento con los errores de validación adentro
 * arregla casi todo lo que se arregla (una opción faltante, un `name` fuera de
 * la lista). Si al tercero sigue sin validar, el problema no es el modelo
 * teniendo un mal día — es el pedido, el vocabulario o el prompt, y ninguna de
 * las tres se arregla insistiendo.
 */
export const MAX_GENERATION_ATTEMPTS = 3;

/**
 * Cuántos errores de validación se le devuelven al modelo por vez.
 *
 * Un schema con un `anyOf` de treinta constantes produce decenas de errores
 * por un solo campo mal puesto. Mandárselos todos es enterrar la señal.
 */
export const MAX_REPORTED_PROBLEMS = 10;

export const generationPolicy = {
  maxAttempts: MAX_GENERATION_ATTEMPTS,

  /**
   * Ventana para que una persona apruebe o rechace.
   *
   * Larga a propósito: revisar un formulario regulatorio puede requerir
   * consultar a alguien más, y un vencimiento corto convertiría un fin de
   * semana en un FAILED. Que exista un tope igual es lo que impide acumular
   * workflows eternos ocupando lugar en Temporal.
   */
  reviewWindow: '30d',

  /**
   * Timeout de las actividades que sólo escriben en Postgres. Cortas por
   * definición; si tardan más que esto, la base está en problemas.
   */
  storeTimeout: '30s',

  /** Recuperación en RAGFlow. */
  retrievalTimeout: '1m',

  /**
   * Llamada al modelo. Tiene que ser mayor que el timeout HTTP del cliente
   * (`llmConfig.timeoutMs`), así el que corta es el cliente y el error llega
   * con un mensaje que dice algo, en vez de un `ActivityTaskTimedOut` pelado.
   */
  generationTimeout: '5m',

  /**
   * Reintentos de Temporal para las actividades.
   *
   * Ojo con la distinción: esto cubre los fallos **de transporte** (LiteLLM no
   * responde, se cortó la red). El reintento por un formulario que no valida es
   * otra cosa y vive en el bucle del workflow, porque necesita reescribir el
   * prompt con los errores adentro — algo que un reintento ciego no hace.
   */
  activityRetry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
} as const;
