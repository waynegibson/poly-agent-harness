import { describe, expect, test } from "vitest";
import type { OmlxModel, OmlxProfile } from "../src/api.js";
import {
  defaultModel,
  findModel,
  formatModelList,
  formatModelStatus,
  formatProfileDiff,
  formatProfiles,
  formatSwitchResult,
  visibleModels,
} from "../src/profiles.js";

function model(id: string, overrides: Partial<OmlxModel> = {}): OmlxModel {
  return {
    id,
    loaded: false,
    is_default: false,
    is_hidden: false,
    is_helper: false,
    settings: {},
    ...overrides,
  };
}

const profiles: OmlxProfile[] = [
  { name: "general", description: "Balanced", settings: { temperature: 0.7, enable_thinking: true } },
  { name: "coder", description: "Code", settings: { temperature: 0.2, enable_thinking: false } },
];

describe("profile and model presentation", () => {
  test("filters hidden/helper models and orders loaded then default models", () => {
    const models = [
      model("z-default", { is_default: true }),
      model("a-idle"),
      model("loaded", { loaded: true }),
      model("hidden", { loaded: true, is_hidden: true }),
      model("helper", { loaded: true, is_helper: true }),
    ];

    expect(visibleModels(models).map(({ id }) => id)).toEqual(["loaded", "z-default", "a-idle"]);
    expect(defaultModel(models)?.id).toBe("loaded");
    expect(findModel(models, "z-default")?.id).toBe("z-default");
  });

  test("formats model lists and empty states", () => {
    const output = formatModelList([
      model("model-a", {
        loaded: true,
        settings: { active_profile_name: "general", temperature: 0.7, enable_thinking: true },
      }),
    ]);

    expect(output).toContain("oMLX models (1)");
    expect(output).toContain("model-a");
    expect(output).toContain("general");
    expect(formatModelList([model("hidden", { is_hidden: true })])).toBe("No visible oMLX models found.");
  });

  test("formats detailed status with fallbacks", () => {
    const output = formatModelStatus(
      model("model-a", {
        loaded: true,
        model_type: "llm",
        engine_type: "mlx",
        estimated_size_formatted: "20 GB",
        model_context_length: 32_768,
        settings: { active_profile_name: null, max_tokens: 4096 },
      }),
    );

    expect(output).toContain("model-a · none");
    expect(output).toContain("llm / mlx · 20 GB");
    expect(output).toContain("ctx 32768 · out 4096");
  });

  test("formats profile lists and deterministic diffs", () => {
    const target = model("model-a", { settings: { active_profile_name: "general" } });
    expect(formatProfiles(target, profiles)).toContain("● temp=0.7, think=on");

    const diff = formatProfileDiff(target, profiles[0]!, profiles[1]!);
    expect(diff).toContain("2 changed settings");
    expect(diff).toContain("enable_thinking: on → off");
    expect(diff).toContain("temperature: 0.7 → 0.2");
  });

  test("formats applied profile and reload state", () => {
    const target = model("model-a", { settings: { active_profile_name: "general" } });
    const output = formatSwitchResult({
      model: target,
      previousProfile: "general",
      profile: profiles[1]!,
      applied: { model_id: target.id, settings: profiles[1]!.settings, requires_reload: true },
    });

    expect(output).toContain("general → coder · reload required");
    expect(output).toContain("Code");
  });
});
