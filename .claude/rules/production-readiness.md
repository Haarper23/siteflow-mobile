# Production Readiness Rules

**A feature is not production-ready only because the UI works.** A screen that looks
correct and renders without errors is the *beginning* of readiness, not the end.

Production readiness also requires:

- **Server-side validation** — every input validated on the backend, not just the client.
- **Authentication and authorization** — identity verified, and access checked by role
  *and* resource ownership.
- **Rate limiting** — on login, forms, uploads, and AI endpoints.
- **Secure error handling** — safe, generic client errors; no stack traces or
  infrastructure details leaked.
- **Logging** — meaningful, structured logs that never include secrets or private user
  data.
- **Monitoring** — health, error rates, and key metrics observable in production.
- **Testing** — coverage appropriate to the feature (see `testing.md`).
- **Database migrations** — schema changes are versioned, reviewed, and reversible.
- **Backup planning** — data is backed up and restores are verified.
- **Rollback planning** — a known, tested way to revert a release or migration.
- **Dependency review** — new/updated dependencies vetted for need, license, and risk.
- **Accessibility** — meets the accessibility rules (see `mobile-engineering.md`).
- **Performance review** — no obvious regressions; acceptable load/render behavior.
- **Documentation** — how the feature works, its config, and its operational concerns.

## Architecture discipline

**Prefer simple, reliable architecture.** Complexity is a cost paid forever; add it only
when a measured requirement forces it.

- **Do not add Kubernetes, Kafka, RabbitMQ, microservices, or complex caching layers
  without a measured requirement.** "We might need it" is not a requirement; an observed,
  quantified problem is.
- Reach for the simplest design that meets the actual need, and revisit only when real
  data shows it is insufficient.
