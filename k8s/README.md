# Kubernetes Deployment Manifests

This directory contains Kubernetes manifests for deploying cinaauth as a
standalone server (`cinaauth` binary).

## Prerequisites

- A PostgreSQL cluster accessible from your cluster (or deploy one using the
  optional `postgres.yaml` below)
- A Kubernetes secret containing the JWT secret and database credentials (see
  [setup](#setup) below)

## Setup

### 1. Create the namespace

```bash
kubectl apply -f namespace.yaml
```

### 2. Create secrets

```bash
kubectl create secret generic cinaauth-secrets \
  --namespace=cinaauth \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=DATABASE_URL="postgresql://user:password@postgres:5432/authdb"
```

### 3. Deploy

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### Optional: Ingress

```bash
kubectl apply -f ingress.yaml
```

## Files

| File | Purpose |
| ---- | ------- |
| `namespace.yaml` | Dedicated namespace for cinaauth |
| `configmap.yaml` | Non-sensitive runtime configuration |
| `deployment.yaml` | Main server deployment |
| `service.yaml` | ClusterIP + optional LoadBalancer service |
| `ingress.yaml` | Ingress rule for external HTTP/S access |

## Health Checks

The deployment uses `/health` for both liveness and readiness probes.
Override `HEALTH_PORT` in the ConfigMap if you change the default port.

## Scaling

The default deployment runs 2 replicas. cinaauth is stateless with respect
to request handling — scale horizontally by increasing `replicas` or enabling
an HPA.
