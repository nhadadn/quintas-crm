docker-compose -f monitoring/docker-compose.monitoring.yml up -d
Write-Host "Monitoring stack started!"
Write-Host "Grafana: http://localhost:3000 (admin/admin)"
Write-Host "Prometheus: http://localhost:9090"
Write-Host "cAdvisor: http://localhost:8080"
