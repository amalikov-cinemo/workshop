# Handout · Group Exercise

**45 minutes.** Design one agentic pipeline. Fill in the **Design Template**.
Then a Reviewer attacks it with the **Challenge Questions**.

## Roles

```
Prompt operator — formulates the agent task
Reviewer        — hunts for risks and holes
Scribe          — records the pipeline (fills the template)
Presenter       — presents (5 min)

3 people:  Prompt operator + Presenter / Reviewer / Scribe
```

## Pick (or get assigned) one case

### Case 1 — CI failure triage
```
A PR changes invoice calculation. CI fails on unit tests.
Design an agentic pipeline to triage the failure.
Focus: logs · tests · diff · risk classification.
```

### Case 2 — Jira ticket planner
```
A PO creates a ticket:
"Users should be able to download all invoices for a selected year."
Design an agentic planning pipeline.
Focus: requirements · missing acceptance criteria · impacted services · human approval.
```

### Case 3 — Security review agent
```
A PR adds file-upload support.
Design an AI security review pipeline.
Focus: threat modeling · forbidden actions · security gate · privacy / compliance.
```

## Deliverable (what the Scribe hands in)

A filled Design Template plus answers to these:

```
- input context        - risk classification   - failure modes
- tools                - human gates           - audit log
- permissions          - security guardrails   - success metric
- output schema
```

## What "good" looks like

```
✔ The unit of work is small and verifiable.
✔ Read-only by default; write access is justified and bounded.
✔ Untrusted input is named and handled as data.
✔ Every action is auditable; there's a rollback path.
✔ A human owns every risky decision.
✔ There is at least one measurable success metric.
```
