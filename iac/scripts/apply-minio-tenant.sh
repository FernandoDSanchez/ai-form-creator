#!/usr/bin/env bash
#
# Aplica el Tenant de MinIO de forjate, que va suelto: no lo incluye el overlay
# del namespace porque vive en `minio-operator` y es infra compartida — si otro
# proyecto ya tiene un Tenant, no corras esto (`kubectl get tenants -A`).
#
# El build remoto trae los literales MINIO_ROOT_USER_PLACEHOLDER /
# MINIO_ROOT_PASSWORD_PLACEHOLDER en su Secret. Este script los sustituye por
# MINIO_USER / MINIO_PASSWORD de secrets/ragflow.env, que es exactamente lo que
# RAGFlow va a usar para autenticarse: así los dos lados no pueden desincronizarse.
set -euo pipefail

FORJATE_REF=7ac17e6a07446969b2b12004f694e09aa134642e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/k8s/namespaces/ai-form-creator/secrets/ragflow.env"

[[ -f "$ENV_FILE" ]] || { echo "falta $ENV_FILE" >&2; exit 1; }

MINIO_USER=$(grep -E '^MINIO_USER=' "$ENV_FILE" | cut -d= -f2-)
MINIO_PASSWORD=$(grep -E '^MINIO_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
[[ -n "$MINIO_USER" && -n "$MINIO_PASSWORD" ]] || { echo "MINIO_USER/MINIO_PASSWORD vacíos en ragflow.env" >&2; exit 1; }

if [[ -n "$(kubectl get tenants -A --no-headers 2>/dev/null)" ]]; then
  echo "Ya hay un Tenant en el cluster. Revisá 'kubectl get tenants -A' antes de seguir." >&2
  exit 1
fi

kustomize build "https://github.com/AItizate/forjate.git//k8s/components/apps/minio/single-server?ref=$FORJATE_REF" \
  | sed -e "s|MINIO_ROOT_USER_PLACEHOLDER|$MINIO_USER|" \
        -e "s|MINIO_ROOT_PASSWORD_PLACEHOLDER|$MINIO_PASSWORD|" \
  | kubectl apply -f -

echo
echo "Confirmá el Service que expone el Tenant — ragflow-config asume"
echo "minio.minio-operator.svc.cluster.local:80 y si no coincide hay que parchearlo:"
kubectl get svc -n minio-operator
