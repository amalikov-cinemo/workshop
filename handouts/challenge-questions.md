# Handout · Challenge Questions

Use these to pressure-test any proposed pipeline (in presentations, and on your
own designs). A good design has an answer for each.

## The ten hard questions

```
1.  What prevents the agent from leaking secrets?
2.  What happens if logs contain prompt injection?
3.  Who approves the fix?
4.  Can the agent push to main?
5.  What is the rollback path?
6.  How do you measure confidence?
7.  What happens if the agent is wrong?
8.  How do you avoid comment / PR spam?
9.  Where is the audit trail?
10. What data is the agent NOT allowed to read?
```

## Twelve design questions (per pipeline)

```
1.  What is the smallest useful unit of work here?
2.  What context does the agent need?
3.  What context must the agent NEVER see?
4.  What tools are allowed?
5.  What actions are forbidden?
6.  What is the expected output (schema)?
7.  How do we know the output is correct?
8.  Where does a human approve?
9.  What happens if the agent is wrong?
10. How do we prevent loops and spam?
11. What is logged for audit?
12. What metric proves this pipeline is useful?
```

> If a pipeline can't be measured (cost, time, accuracy), it's a demo — not an
> SDLC improvement.
