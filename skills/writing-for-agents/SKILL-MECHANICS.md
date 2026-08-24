# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill — frontmatter, the invocation choice, and router skills. Everything else about writing it is the universal reference in `SKILL.md`.

## Frontmatter description rules

The `description` field is not a summary of the whole skill; it is the skill's
trigger text. Agents read only the `name` and `description` to decide whether a
skill is relevant before loading the full body. Keep it short, imperative, and
focused on the user's intent.

Good pattern:

- start with `Use when ...`
- name the user intent, not the implementation details
- cover the common triggering cases without listing every edge case
- keep it to a short sentence or two
- put the full workflow, examples, and caveats in the body of the skill

Bad pattern:

- long multi-clause descriptions with repeated examples
- implementation-heavy wording that explains how the skill works instead of when
  to use it
- colon-heavy trigger text that reads like a mini spec instead of a trigger
  signal

The description stays under the 1024-character limit, and the body handles the
full mechanics.

## Invocation

Invocation policy is harness-specific even when the skill body is portable. Keep
the portable `SKILL.md` frontmatter and each harness's metadata in their native
locations:

| Intent           | Pi and Claude Code (`SKILL.md`)                       | Codex (`agents/openai.yaml`)                                 |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Model may invoke | Omit `disable-model-invocation`, or set it to `false` | Omit `policy.allow_implicit_invocation`, or set it to `true` |
| User only        | Set `disable-model-invocation: true`                  | Set `policy.allow_implicit_invocation: false`                |

For a portable user-only skill, set both controls. Pi and Claude Code read the
frontmatter field; Codex reads `agents/openai.yaml`. A harness ignores metadata
it does not own, so the two controls can live together without an adapter
rewriting the skill.

The two choices still trade discoverability against context load:

- A **model-invoked** skill exposes its `description` so the agent can select it autonomously. The user can still invoke it directly. Write a model-facing description carrying the trigger branches; the pointer-writing rules in `SKILL.md` apply in full.
- A **user-invoked** skill is absent from the model's automatic skill selection. The user must remember and invoke it explicitly. Keep the required `description`, but make it a concise human-facing summary rather than a trigger list.

Pick model-invocation only when the agent must reach the skill on its own, or another skill must. If it only ever fires by hand, make it user-invoked and pay no context load.

Shared reference needed by two user-invoked skills should live in a plain file
that both skills reference. Do not depend on one user-only skill invoking the
other: harnesses differ in whether skill-to-skill invocation is available.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a model-invoked skill when you have a distinct leading word that should trigger it on its own — a trigger word you actually use in your prompts — or another skill must reach it. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

## Router skills

When user-invoked skills multiply past what you can remember, that piled-up
cognitive load is cured by a **router skill**: one user-invoked skill that names
the others and when to reach for each, so the human has one skill to remember
instead of many.

Keep router instructions harness-neutral. Name the target skill and tell the
agent to use the harness's native skill mechanism; do not hard-code a tool name
such as `Skill`. The target must remain model-invocable if the router should
launch it. If the harness cannot invoke skills from skills, fall back to reading
a shared reference or tell the user which skill to invoke directly.
