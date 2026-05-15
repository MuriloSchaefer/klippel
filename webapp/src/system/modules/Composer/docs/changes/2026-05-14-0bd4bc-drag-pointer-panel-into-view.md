---
id: 2026-05-14-0bd4bc
name: Drag pointer panel into view (test helper)
description: Wire the dragPointerPanelIntoView helper into the linkProcessElective click driver so the link panel is reachable near viewport edges.
status: implemented
modules: [Pointer, Composer]
---

## Context

`linkProcessElective.e2e.test.ts` (click flow) fails at
`selectLinkElectiveOption` with `Node is either not clickable or not an
Element`: the "Vincular Eletivo ao Processo" `PointerContainer` panel opens
anchored at the process row, which sits low in the settings panel, so the
panel's select control renders below the viewport bottom edge.

See the Pointer module doc for the shared helper being added
(`dragPointerPanelIntoView`).

## Change

In `components/viewports/ProcessListAccordion/drivers/ProcessElectiveButton.click.puppeteer.ts`:
- After `clickProcessLinkElective` confirms the `link-elective-form` is
  visible, call `dragPointerPanelIntoView(page)` so the whole panel —
  including the select and confirm controls — is inside the viewport before
  any further interaction.
- `selectLinkElectiveOption` and the confirm step then click against an
  on-screen panel unchanged.

## Status notes

Implemented. `clickProcessLinkElective` now calls `dragPointerPanelIntoView`
after the `link-elective-form` appears. `linkProcessElective.e2e.test.ts`
passes headless — both the previously-failing click test and the shortcut
test.

## Security

None. Test-only driver wiring.

## Performance

None in production. One extra helper call in the linkProcessElective E2E
flow.
