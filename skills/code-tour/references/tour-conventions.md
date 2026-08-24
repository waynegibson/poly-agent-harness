# CodeTour conventions

This companion document keeps the portable skill readable while preserving the detailed conventions that matter for quality tours.

## Narrative arc

A good CodeTour uses a clear story structure:

1. Orientation: start from a file or directory the reader can open immediately.
2. High-level map: show the major modules or directories.
3. Core path: walk the actual execution or feature path the reader needs.
4. Closing: tell the reader what they can do next.

The first step must not be content-only; a blank content step is a weak anchor in VS Code and makes the tour feel disconnected from the repo.

## Step count by depth

- Quick: 5-8 steps
- Standard: 9-13 steps
- Deep: 14-18 steps

Quick tours should be deliberately tight. A longer tour is only justified when the persona genuinely needs a deeper explanation.

## Description writing: SMIG

Each step description should use the SMIG formula:

- S — Situation: what the reader is looking at
- M — Mechanism: how the code works
- I — Implication: why it matters for this persona
- G — Gotcha: the subtlety that would confuse a smart reader

Avoid generic text like "this file contains the models" or "this module handles requests" unless you explain the concrete mechanism and why it matters.

## Persona guidance

### Vibecoder

Goal: get the vibe fast.

- keep the tour brief
- cover the entry point and main modules
- prioritize understanding of the system shape over deep implementation detail

### New joiner

Goal: understand how the system fits together.

- explain setup and directory layout
- orient the reader to the main business flow
- do not assume familiarity with internal conventions

### Bug fixer

Goal: find the root cause with minimal wandering.

- trace from trigger to fault path to validation or test coverage
- include the most likely fault points and the evidence trail
- keep the path actionable for debugging

### RCA investigator

Goal: explain failure cause and evidence.

- show the causal chain, not just the symptoms
- include observable hooks, logs, metrics, or tests when relevant
- make the failure story easy to validate

### Feature explainer

Goal: explain how the system works end-to-end.

- connect user-facing flow to backend or storage layers
- explain the important handoffs and state transitions
- keep the local and cross-layer behavior clearly separated

### PR reviewer

Goal: review changes correctly.

- explain the intended change story
- identify invariants, risk points, and change boundaries
- focus on the reviewer's real questions: what changed, why, and what could break

### Architect

Goal: reason about design and extension.

- explain module boundaries and tradeoffs
- highlight extension points and constraints
- focus on how the architecture shapes future change

### Security reviewer

Goal: review trust boundaries and risk.

- trace auth, validation, secret handling, and trust boundaries
- identify where user input crosses trust boundaries
- call out anything risky or surprising in the flow

### Refactorer

Goal: restructure safely.

- identify seams, hidden dependencies, and extraction points
- explain what is coupled and why
- sequence the walk so readers can refactor without breaking assumptions

### External contributor

Goal: contribute safely.

- explain conventions and safe entry points
- call out project-specific pitfalls or landmines
- reduce the chance of the wrong edit in the wrong place

## Validation checklist

Before finishing a tour, verify:

- all file paths are relative to the repo root
- each file exists
- each line number was read and verified
- the first step anchors to a real file or directory
- at most two steps are content-only
- the story arc is clear and readable
- nextTour matches another tour title exactly when set

## Common anti-patterns

- content-only opener or closer with no repo anchor
- a flat file list that reads as a directory dump
- line numbers guessed from names rather than read from source
- too much depth for a quick persona
- making claims about modules that do not exist
- generic descriptions with no concrete implementation detail

## Output requirements

- create a valid `.tour` JSON file
- keep the narrative grounded in the actual repository
- preserve a clear reader persona in the title and description
- never modify source code while generating the tour
