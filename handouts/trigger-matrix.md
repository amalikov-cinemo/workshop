# Handout · Trigger Matrix

Map every candidate AI pipeline to: one trigger → one bounded task → one
structured output → one human gate.

| Trigger | Agent task | Output | Human gate |
| --- | --- | --- | --- |
| New Jira ticket | Requirements analysis | Missing info, risks, plan | PO confirms |
| Ticket ready for dev | Implementation plan | Task breakdown | Tech lead approves |
| PR opened | Code review | Findings, risk score | Reviewer approves |
| CI failed | Failure triage | Root-cause hypothesis | Dev accepts fix |
| Security scan failed | Vulnerability analysis | Severity, remediation | Security approves |
| Comment added | Contextual response | Answer / proposal | Owner confirms |
| Deploy requested | Release check | Go / no-go report | Release manager approves |
| Incident alert | Incident summary | Impact, next actions | Incident commander decides |

## Where the process actually lives

```
GitHub / GitLab · Jira / Azure DevOps · Slack / Teams ·
CI/CD · Kubernetes · monitoring · incident management
```

AI must embed where the process already is — not in a separate chat.

## The rule

```
One trigger → one bounded agent task → one structured output.
Event-driven, but NOT fully autonomous by default.
```
