# Slides

`agentic-sdlc-workshop.md` — the full deck (Marp, ~49 slides, English).
Maps 1:1 to the 3-hour agenda; the demo section (block 6) drives the
`invoice-service` + CI-triage agent in this repo.

## Present / export

```bash
# Live preview with auto-reload (opens a browser):
npx -y @marp-team/marp-cli@latest -s slides/agentic-sdlc-workshop.md

# Export to a self-contained HTML:
npx -y @marp-team/marp-cli@latest slides/agentic-sdlc-workshop.md -o slides.html --html

# Export to PDF (needs a local Chrome/Chromium):
npx -y @marp-team/marp-cli@latest slides/agentic-sdlc-workshop.md -o slides.pdf --pdf
```

In VS Code, the **Marp for VS Code** extension previews this file directly.

## Structure

| Block | Slides |
| --- | --- |
| 1 | What AI SDLC is — and is not |
| 2 | Agent loops & the harness |
| 3 | Non-interactive agents & triggers |
| 4 | Human/AI responsibility · autonomy L0–L4 |
| 5 | Security · prompt injection |
| 6 | The reference: live CI-triage demo on `invoice-service` |
| 7 | Group exercise |
| 8 | Presentations & challenge questions |
| 9 | Synthesis · golden rules |

Speaker hints are in HTML comments (`<!-- Speaker: ... -->`), shown in Marp
presenter mode.
