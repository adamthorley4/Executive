# Decision Log

Append-only. When a meaningful decision is made, log it here.

Format: [YYYY-MM-DD] DECISION: ... | REASONING: ... | CONTEXT: ...

---

[2026-06-04] DECISION: Use an allowlist of real first names for email outreach name extraction, not a blocklist of non-names | REASONING: Blocklist approach was sending emails addressed to "Hi Fitness," and "Hi Loving," — business/brand words being matched by regex patterns. Flipping to an allowlist (first-names.js, ~600 common UK/US names) means only real first names are accepted; anything unrecognised falls back to "Hi there,". Blocklists require constant maintenance and always have gaps; allowlists are bounded and reliable for a known demographic. | CONTEXT: outreach pipeline, name-utils.js
