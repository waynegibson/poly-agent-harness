---
name: code-tour
description: Use when the user wants a repo walkthrough, onboarding tour, architecture tour, PR review, RCA, security review, contribution guide, or any structured code walkthrough; create a .tour JSON file anchored to real files and verified line numbers without editing source code.
---

# Code Tour

Create a `.tour` JSON file for the VS Code CodeTour extension. A good tour is a narrative: it tells a specific reader what matters in the codebase, why it matters, and what to do next.

Only create `.tour` files. Never edit application source code while producing the tour.

## Use this skill when

Use it for requests such as:

- create a code tour or onboarding tour
- explain how a system works
- produce a PR review or change walkthrough
- explain why a bug broke or how to investigate it
- show architecture or module boundaries
- guide an external contributor or reviewer
- produce a structured walkthrough with file and line anchors

## Core workflow

### 1. Discover the repository

Before writing anything, inspect the real repo and map the codebase.

- read the root README and relevant configuration files
- identify the main language(s), framework(s), and project purpose
- map the top-level layout one or two levels deep
- find the entry points and the main modules
- verify that every planned file path exists

If the repo has fewer than five source files, use a quick-depth tour even if the persona sounds deeper; there is not enough structure to justify a long walkthrough.

### 2. Infer the persona and depth

Choose the persona and depth from the request. If the request is ambiguous, default to `new-joiner` at `standard` depth.

| User request                | Persona           | Depth    |
| --------------------------- | ----------------- | -------- |
| "tour for this PR"          | pr-reviewer       | standard |
| "why did X break" / "RCA"   | rca-investigator  | standard |
| "onboarding" / "new joiner" | new-joiner        | standard |
| "quick tour" / "vibe check" | vibecoder         | quick    |
| "architecture"              | architect         | deep     |
| "security" / "auth review"  | security-reviewer | standard |
| no qualifier                | new-joiner        | standard |

See [references/tour-conventions.md](references/tour-conventions.md) for the full persona matrix and deeper conventions.

### 3. Read actual files and verify anchors

Every file path and line number must be confirmed by reading the real file.

- read the exact files that support the tour steps
- confirm real line numbers before writing them
- prefer concrete anchors around entry points, boundaries, and logic paths
- do not guess a location from the filename alone

A wrong line or a non-existent file is worse than an incomplete tour.

### 4. Write the tour

Save the result to `.tours/<persona>-<focus>.tour`.

```json
{
  "$schema": "https://aka.ms/codetour-schema",
  "title": "Descriptive Title — Persona / Goal",
  "description": "Who this is for and what they'll understand after.",
  "ref": "<current-branch-or-commit>",
  "steps": []
}
```

Use the step types as needed:

- `Content`: intro or closing only; keep to at most two content-only steps.
- `Directory`: orient to a module or package.
- `File + line`: the main workhorse for the tour narrative.
- `Selection`: highlight a code block or exact range.
- `Pattern`: match a regex or volatile pattern when needed.
- `URI`: link to docs, issues, PRs, or reference material.

### 5. Keep the narrative arc

A tour is a story, not a file dump.

1. Orientation: first step anchors to a file or directory; never start with a content-only step.
2. High-level map: show the major modules or directories.
3. Core path: explain the actual execution path and critical files.
4. Closing: tell the reader what they can do next.

### 6. Validate before finishing

Check these before ending the tour:

- every `file` path is relative to the repo root
- every `file` exists
- every `line` was read and verified
- the first step anchors to a file or directory
- no more than two content-only steps
- the tour moves from orientation to map to core path to closing
- `nextTour` matches an existing tour title exactly if it is set

## Persona summary

Use the persona to shape tone, depth, and what the reader needs to understand.

| Persona              | Goal                        | Typical focus                                |
| -------------------- | --------------------------- | -------------------------------------------- |
| vibecoder            | get the vibe fast           | entry point and major modules                |
| new-joiner           | structured ramp-up          | directories, setup, business context         |
| bug-fixer            | find the root cause fast    | trigger, fault points, tests                 |
| rca-investigator     | explain the failure chain   | causality, observability, triggers           |
| feature-explainer    | explain end-to-end behavior | UI, API, backend, storage                    |
| pr-reviewer          | review correctly            | change story, invariants, risky areas        |
| architect            | reason about design         | boundaries, tradeoffs, extension points      |
| security-reviewer    | review trust boundaries     | auth flow, validation, secrets               |
| refactorer           | restructure safely          | seams, hidden dependencies, extraction order |
| external-contributor | contribute safely           | conventions, landmines, safe paths           |

## Anti-patterns to avoid

- content-only intro or closing with no repo anchor
- a flat file list instead of a narrative
- guessed filenames or line numbers
- too many steps for the requested depth
- references to modules or files that do not exist
- generic descriptions that do not explain the mechanism or why it matters

## Output rules

- produce valid JSON for a CodeTour file
- use real project paths and verified anchors
- keep the audience and purpose explicit in the title and description
- only create `.tour` files and never modify source code

For detailed persona definitions, step counts, storytelling conventions, and review criteria, read [references/tour-conventions.md](references/tour-conventions.md).
