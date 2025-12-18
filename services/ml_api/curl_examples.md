### Analyze
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"post_text":"We are scaling our AI team fast. Expect late nights but huge impact.","company_hint":"meta"}'
```

### Analyze (no save)
```bash
curl -X POST "http://localhost:8000/analyze?save=false" \
  -H "Content-Type: application/json" \
  -d '{"post_text":"Hiring for cloud infra SREs."}'
```

### Compare
```bash
curl -X POST http://localhost:8000/analyze/compare \
  -H "Content-Type: application/json" \
  -d '{"baseline_text":"We are hiring engineers.","variant_text":"We are hiring engineers for 24/7 on-call roles."}'
```

### History
```bash
curl "http://localhost:8000/history?limit=20"
```
