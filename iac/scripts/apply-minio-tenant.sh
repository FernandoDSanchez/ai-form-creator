#!/usr/bin/env bash
#
# Applies forjate's MinIO Tenant, which goes on its own: the namespace overlay
# does not include it because it lives in `minio-operator` and is shared infra —
# if another project already has a Tenant, do not run this
# (`kubectl get tenants -A`).
#
# The remote build carries the MINIO_ROOT_USER_PLACEHOLDER /
# MINIO_ROOT_PASSWORD_PLACEHOLDER literals in its Secret. This script replaces
# them with MINIO_USER / MINIO_PASSWORD from secrets/ragflow.env, which is
# exactly what RAGFlow will use to authenticate: that way the two sides cannot
# drift apart.
set -euo pipefail

FORJATE_REF=7ac17e6a07446969b2b12004f694e09aa134642e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/k8s/namespaces/ai-form-creator/secrets/ragflow.env"

[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE" >&2; exit 1; }

MINIO_USER=$(grep -E '^MINIO_USER=' "$ENV_FILE" | cut -d= -f2-)
MINIO_PASSWORD=$(grep -E '^MINIO_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
[[ -n "$MINIO_USER" && -n "$MINIO_PASSWORD" ]] || { echo "MINIO_USER/MINIO_PASSWORD are empty in ragflow.env" >&2; exit 1; }

if [[ -n "$(kubectl get tenants -A --no-headers 2>/dev/null)" ]]; then
  echo "There is already a Tenant in the cluster. Check 'kubectl get tenants -A' before continuing." >&2
  exit 1
fi

kustomize build "https://github.com/AItizate/forjate.git//k8s/components/apps/minio/single-server?ref=$FORJATE_REF" \
  | sed -e "s|MINIO_ROOT_USER_PLACEHOLDER|$MINIO_USER|" \
        -e "s|MINIO_ROOT_PASSWORD_PLACEHOLDER|$MINIO_PASSWORD|" \
  | kubectl apply -f -

echo
echo "Confirm the Service exposing the Tenant — ragflow-config assumes"
echo "minio.minio-operator.svc.cluster.local:80 and if it does not match it has to be patched:"
kubectl get svc -n minio-operator
