# Cafe24 storage recovery

Goal: restore production writes without losing member, wallet or mining state.

Approved direction: retain Vercel, move storage to Cafe24, then evolve durable business records into a relational database. Immediate recovery preserves Redis command/Lua semantics rather than rewriting transactions during an outage.

- [ ] Diagnose production mining response and source memory use.
- [ ] Provision private Redis with AOF, no eviction, and local backups; expose only an authenticated TLS application interface.
- [ ] Export source types, values and absolute expirations into a private backup. Do not delete source data.
- [ ] Restore and verify keys/types/value hashes; freeze writes for final synchronization so balances cannot diverge.
- [ ] Switch production storage configuration, deploy, verify authenticated game state and writes, then remove the freeze.
- [ ] Document rollback (never switch back after new writes without reverse synchronization), backup restore and remaining relational migration work.

Constraints: no production flush, no public Redis port, no secrets in Git or logs. User performs visual/play acceptance. Retain unrelated working tree changes.
