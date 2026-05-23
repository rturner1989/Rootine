# Reusable WizardDialog + AddSpaceDialog (TICKET-069)

Date: 2026-05-22 · Status: approved (brainstorm) · Origin: [[project_space_creation_wizard]]

## Problem

`SpaceFormDialog` crams 7 input clusters into one view (presets → name → category → icon grid → 3 env controls). Rob wants space CREATE split into a guided wizard, with optional add-plants steps. Separately: the onboarding wizard's flow isn't reusable, so a second wizard would either fork it or hand-roll. Decided to extract a reusable **modal** wizard.

## Decisions (brainstorm, with Rob)

1. **In-house extract, not a package.** A wizard lib would fight our Dialog/Card/Tailwind/useFormSubmit conventions + can't model onboarding's bespoke flow + against the minimal-deps ethos.
2. **`WizardDialog` = the modal counterpart to onboarding's `WizardCard`.** `WizardCard` stays onboarding-only (it owns the `layoutId` welcome↔wizard morph + full-page shell). `WizardDialog` is the modal shell.
3. **Two consumers validate it:** AddSpaceDialog (this ticket / PR1), AddPlantDialog (PR2 follow-up). API designed for both upfront so PR2 needs no rework.
4. **Create = wizard, Edit = flat form.** New `AddSpaceDialog` (wizard) for House add; keep `SpaceFormDialog` flat for edit. Onboarding Step2 unchanged (flat `SpaceFormDialog`, `showEnvironment=false` — no wizard-in-wizard).
5. **Plants = optional hand-off, not forked steps.** Reuse the global `AddPlantDialog` via `openAddPlant({ defaultSpaceId })` from a completion screen.

## Design

### A. Extract wizard primitives → `components/wizard/`
Move `WizardActions` + `StepProgress` + `StepTip` out of `onboarding/shared/`; update onboarding imports (mechanical, no dup). **Leave `WizardCard`** in onboarding.

### B. `components/wizard/WizardDialog.jsx` (new, minimal generic)
Owns: `Dialog` shell + optional `StepProgress` + `WizardActions` footer + linear step state + async final + optional completion screen.
```jsx
<WizardDialog open onClose title showProgress
  steps={[{ title, hideBack, hideContinue, continueLabel, canContinue,
            content: ({ goNext, goBack }) => <…/> }, …]}
  onComplete={async () => result}     // final Continue; async, may throw (validation)
  completion={(result) => <…/>}       // optional post-complete screen; omit → close on complete
/>
```
- Per-step footer config covers AddSpace (Continue-advance) AND AddPlant (selection-advance via `goNext`, `hideContinue`/`hideBack`).
- `showProgress` optional — AddPlant can omit the counter.
- Built on the extracted `WizardActions` + `StepProgress`.

### C. Extract shared space-form fields
Pull `IconPicker`, `PresetChips`, `ENV_AXES` out of `SpaceFormDialog` → shared `spaces/` modules; `SpaceFormDialog` refactored to import them (pure extraction, behaviour unchanged) so both dialogs share.

### D. `AddSpaceDialog` (thin WizardDialog consumer, prop-driven from House)
- Step 1 — Identity: PresetChips + Name + Category + IconPicker. `canContinue` = name present + unique (`existingNames`).
- Step 2 — Environment: 3 env SegmentedControls. Final → `onComplete` creates the space (`onAdd` returns created space + id).
- Completion: "{name} added 🎉 — add plants?" → [Add a plant] `openAddPlant({ defaultSpaceId })` + close · [Done] close.

### E. Rewire House
Add → `AddSpaceDialog`. Edit → `SpaceFormDialog` (unchanged). Onboarding Step2 unchanged.

## PR split
- **PR1 (this branch `ticket-069-add-space-wizard`):** A + B + C + D + E + tests/gates.
- **PR2 (follow-up):** adopt `AddPlantDialog` (StepSpecies → StepDetails) onto WizardDialog, `showProgress` off, species step advances via `goNext`.

## Tests & gates
- New: WizardDialog (step nav, gating, completion), AddSpaceDialog (steps + create + hand-off). Wizard-primitive move keeps onboarding green. SpaceFormDialog field-extraction keeps its tests + house.spec green.
- Gates: `/accessibility` (StepProgress decorative, step focus management, Dialog focus-trap from useFocusTrap) + `/react-best-practices`. DHH n/a (no backend).

## Out of scope
- AddPlantDialog adoption (PR2). `useWizard` standalone hook (WizardDialog owns the nav). No onboarding nav rewire (only its primitive imports move).
