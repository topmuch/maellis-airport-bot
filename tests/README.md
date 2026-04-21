# MAELLIS Airport Bot — Tests

## E2E Tests

Comprehensive end-to-end tests for the bot service.

### Prerequisites
- Bot service running on port 3005: `cd mini-services/bot-service && bun run dev`
- Or full stack running: `docker compose up`

### Running Tests

```bash
# Run all tests
bun test tests/e2e.test.ts

# Run with verbose output
bun test tests/e2e.test.ts --verbose

# Run specific test group
bun test tests/e2e.test.ts --test-name-pattern "Flight Search"
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Health & System | 4 |
| Webhook Verification | 3 |
| Intent Classification | 16 |
| Response Validation | 4 |
| Entity Extraction | 2 |
| Error Handling | 4 |
| Baggage QR | 2 |
| Flight Search & Status | 4 |
| 404 Handling | 1 |
| CORS | 1 |
| **Total** | **41** |
