# Misskey Metrics Exporter

A Prometheus metrics exporter for Misskey instances that provides comprehensive monitoring capabilities including database metrics, API health checks, and optional log parsing.

## Features

- **Database Metrics**: User counts, note counts, instance statistics
- **API Health Monitoring**: Response times and availability checks
- **Log Parsing**: Optional log analysis for additional insights
- **Kubernetes Ready**: Includes Helm chart for easy deployment
- **Health Checks**: Built-in liveness and readiness probes

## Quick Start

### Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.x
- Access to your Misskey database
- Container registry access (if using custom image)

### Deployment

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd misskey-metrics-exporter
   ```

2. **Configure your values**:
   ```bash
   cp charts/misskey-metrics-exporter/values.yaml my-values.yaml
   ```

3. **Edit configuration** in `my-values.yaml`:
   ```yaml
   image:
     repository: your-registry/misskey-metrics-exporter
     tag: "latest"
   
   settings:
     misskeyUrl: "https://your-misskey-instance.com"
     dbHost: "your-postgres-host"
     dbPort: "5432"
     dbName: "misskey"
     dbUser: "misskey"
     dbPassword: "your-password"
   ```

4. **Deploy with Helm**:
   ```bash
   helm install misskey-exporter ./charts/misskey-metrics-exporter -f my-values.yaml
   ```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9090` | HTTP server port |
| `UPDATE_INTERVAL` | `60000` | Metrics update interval (ms) |
| `ENABLE_LOG_PARSING` | `false` | Enable log file parsing |
| `MISSKEY_URL` | `http://localhost:3000` | Misskey instance URL |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `misskey` | Database name |
| `DB_USER` | `misskey` | Database user |
| `DB_PASSWORD` | `` | Database password |

### Helm Values

Key configuration options in `values.yaml`:

```yaml
# Replica count
replicaCount: 1

# Container image
image:
  repository: your-registry/misskey-metrics-exporter
  tag: "latest"
  pullPolicy: IfNotPresent

# Service configuration
service:
  type: ClusterIP
  port: 9090

# Resource limits
resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 50m
    memory: 64Mi

# Environment variables (camelCase)
settings:
  misskeyUrl: "https://your-instance.com"
  dbHost: "postgres-service"
  dbPort: "5432"
  dbName: "misskey"
  dbUser: "misskey"
  dbPassword: "your-password"
```

## Prometheus Integration

The exporter automatically configures Prometheus scraping via pod annotations:

```yaml
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

### Available Metrics

- `misskey_users_total` - Total number of users
- `misskey_notes_total` - Total number of notes
- `misskey_api_response_time` - API response time in milliseconds
- `misskey_api_health` - API health status (1 = healthy, 0 = unhealthy)

## Security Considerations

### Database Access

- Use read-only database credentials when possible
- Store sensitive credentials in Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: misskey-exporter-secrets
type: Opaque
stringData:
  dbPassword: "your-secure-password"
```

Then reference in your values:

```yaml
settings:
  dbPassword: "your-password"  # Or use external secrets operator
```

### Network Policies

Consider implementing network policies to restrict database access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: misskey-exporter-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: misskey-metrics-exporter
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

## Monitoring and Alerting

### Health Checks

The exporter provides health endpoints:

- `/health` - Overall health status
- `/metrics` - Prometheus metrics endpoint

### Sample Prometheus Alerts

```yaml
groups:
- name: misskey-exporter
  rules:
  - alert: MisskeyExporterDown
    expr: up{job="misskey-exporter"} == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Misskey exporter is down"
      
  - alert: MisskeyAPIUnhealthy
    expr: misskey_api_health == 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Misskey API is unhealthy"
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Verify database credentials and network connectivity
   - Check if database allows connections from the pod's IP range

2. **Metrics Not Appearing**:
   - Verify Prometheus is scraping the correct port (9090)
   - Check pod annotations are correctly set

3. **High Memory Usage**:
   - Adjust `UPDATE_INTERVAL` to reduce query frequency
   - Set appropriate resource limits

### Debugging

View logs:
```bash
kubectl logs -l app.kubernetes.io/name=misskey-metrics-exporter
```

Check metrics endpoint:
```bash
kubectl port-forward svc/misskey-exporter 9090:9090
curl http://localhost:9090/metrics
```

## Development

### Local Development

1. **Install Deno**:
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Run locally**:
   ```bash
   deno task dev
   ```

3. **Run tests**:
   ```bash
   deno test tests/ --allow-env --allow-net
   ```

### Building Container Image

```bash
docker build -t your-registry/misskey-metrics-exporter:latest .
docker push your-registry/misskey-metrics-exporter:latest
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `deno test tests/ --allow-env --allow-net`
5. Format code: `deno fmt`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.