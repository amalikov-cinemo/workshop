# Handout · Autonomy Levels & Responsibility Matrix

## Autonomy levels

```
L0 — Assistant:   human asks, AI answers.
L1 — Reviewer:    AI analyzes & comments, changes nothing.
L2 — Contributor: AI makes changes, but only a draft PR.
L3 — Operator:    AI acts in systems, but through approval.
L4 — Autonomous:  AI decides and executes on its own.
```

> Enterprise sweet spot today: **L1–L2.** L3 selectively. **L4 is almost
> always premature risk.**

## AI autonomy matrix

| Area | AI can do alone | AI can prepare | Human must decide |
| --- | --- | --- | --- |
| Requirements | extract gaps | draft questions | accept scope |
| Architecture | compare options | ADR draft | choose architecture |
| Coding | small scoped changes | propose patch | merge |
| Tests | generate / update tests | analyze failures | accept coverage strategy |
| Code review | detect issues | risk summary | approve PR |
| Security | scan / summarize | remediation options | accept risk |
| Data / privacy | detect sensitive areas | DPIA / checklist draft | approve policy |
| Release | prepare checklist | changelog / release notes | production deploy |
| Incident | summarize signals | suggest runbook | coordinate response |

## For every SDLC step, define

```
- AI role
- human role
- risk level
- approval gate
- allowed actions
- forbidden actions
- audit requirement
```

In the reference repo, the autonomy level is a **flag**:
`--mode review` = L1 (read-only), `--mode fix` = L2 (may draft a PR).
A high-risk path (billing) forces escalation regardless of the level.
