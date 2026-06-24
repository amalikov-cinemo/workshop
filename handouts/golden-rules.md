# Handout · Golden Rules

Pin this above your desk.

```
1.  One agent task = one bounded unit of work.
2.  Read-only first. Write access later.
3.  No production secrets.
4.  No direct merge.
5.  No direct production deploy.
6.  Human owns risk.
7.  Agent output must be structured.
8.  All actions must be auditable.
9.  External input is untrusted.
10. CI / tests / policies are part of the agent harness.
11. AI should create artifacts, not invisible magic.
12. Start with L1/L2 autonomy, not L4.
```

## A good AI SDLC pipeline has

```
1.  a clear trigger          6.  structured output
2.  a bounded task           7.  a human approval gate
3.  prepared context         8.  an audit trail
4.  minimal permissions      9.  a rollback strategy
5.  deterministic checks     10. measurable value
```

## Two sentences to remember

> AI does not remove the SDLC. It makes a weak SDLC more dangerous, and a good
> SDLC faster.

> Prompt tells the agent what to do. The harness defines what the agent is able
> to do safely.
