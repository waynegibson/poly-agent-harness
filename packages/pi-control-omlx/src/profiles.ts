import { applyProfile, listProfiles } from "./api.js";
import type { OmlxApplyResult, OmlxModel, OmlxProfile, OmlxSettings } from "./api.js";

export interface SwitchResult {
  model: OmlxModel;
  previousProfile: string;
  profile: OmlxProfile;
  applied: OmlxApplyResult;
}

function setting(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "boolean") return value ? "on" : "off";
  return String(value);
}

function profileSummary(settings: OmlxSettings, fallback = "inherit"): string {
  return [
    `temp=${setting(settings.temperature, fallback)}`,
    `think=${setting(settings.enable_thinking, fallback)}`,
    `budget=${setting(settings.thinking_budget_tokens, fallback)}`,
  ].join(", ");
}

export function visibleModels(models: OmlxModel[]): OmlxModel[] {
  return models
    .filter((model) => !model.is_hidden && !model.is_helper)
    .sort((a, b) => Number(b.loaded) - Number(a.loaded) || Number(b.is_default) - Number(a.is_default) || a.id.localeCompare(b.id));
}

export function defaultModel(models: OmlxModel[]): OmlxModel | undefined {
  return models.find((model) => model.loaded) ?? models.find((model) => model.is_default);
}

export function findModel(models: OmlxModel[], id?: string): OmlxModel | undefined {
  return id ? models.find((model) => model.id === id) : defaultModel(models);
}

const MODEL_WIDTH = 42;
const PROFILE_WIDTH = 10;

function fit(value: string, width: number): string {
  if (value.length <= width) return value.padEnd(width);
  return `${value.slice(0, width - 1)}…`;
}

function modelMark(model: OmlxModel, loadedMark: string): string {
  return model.loaded ? loadedMark : " ";
}

export function formatModelList(models: OmlxModel[], loadedMark = "●"): string {
  const visible = visibleModels(models);
  if (visible.length === 0) return "No visible oMLX models found.";

  const header = `  STATE  ${fit("MODEL", MODEL_WIDTH)}  ${fit("PROFILE", PROFILE_WIDTH)}  TEMP  THINK  BUDGET`;
  const divider = `  ${"─".repeat(header.length - 2)}`;
  const rows = visible.map((model) => {
    const profile = setting(model.settings.active_profile_name, "none");
    return `  ${modelMark(model, loadedMark)}      ${fit(model.id, MODEL_WIDTH)}  ${fit(profile, PROFILE_WIDTH)}  ${fit(setting(model.settings.temperature), 4)}  ${fit(setting(model.settings.enable_thinking), 5)}  ${setting(model.settings.thinking_budget_tokens)}`;
  });

  return [
    `oMLX models (${visible.length})  ${loadedMark} loaded`,
    header,
    divider,
    ...rows,
  ].join("\n");
}

export function formatModelStatus(model: OmlxModel, loadedMark = "●", inactiveMark = "●"): string {
  const marker = model.loaded ? loadedMark : inactiveMark;
  const type = [model.model_type, model.engine_type].filter(Boolean).join(" / ") || "—";
  const size = model.actual_size_formatted ?? model.estimated_size_formatted ?? "—";
  const rows: Array<[string, string]> = [
    ["Status", `${marker} ${model.id} · ${setting(model.settings.active_profile_name, "none")}`],
    ["Engine", `${type} · ${size}`],
    ["Sampling", `T ${setting(model.settings.temperature)} · P ${setting(model.settings.top_p)} · K ${setting(model.settings.top_k)} · m ${setting(model.settings.min_p)} · r ${setting(model.settings.repetition_penalty)}`],
    ["Reasoning", `think ${setting(model.settings.enable_thinking)} · budget ${setting(model.settings.thinking_budget_tokens)} · ${setting(model.settings.reasoning_parser)}`],
    ["Limits", `ctx ${setting(model.settings.max_context_window ?? model.model_context_length)} · out ${setting(model.settings.max_tokens)} · tools ${setting(model.settings.max_tool_result_tokens)}`],
    ["Acceleration", `MTP ${setting(model.settings.mtp_enabled)} · TQ ${setting(model.settings.turboquant_kv_enabled)} · DF ${setting(model.settings.dflash_enabled)} · SP ${setting(model.settings.specprefill_enabled)}`],
  ];
  const sectionWidth = 13;
  const header = `  ${fit("SECTION", sectionWidth)}  DETAILS`;

  return [
    header,
    `  ${"─".repeat(header.length - 2)}`,
    ...rows.map(([section, details]) => `  ${fit(section.toUpperCase(), sectionWidth)}  ${details}`),
  ].join("\n");
}

export function formatProfileDiff(model: OmlxModel, left: OmlxProfile, right: OmlxProfile, activeMark = "●"): string {
  const leftSettings = left.settings as Record<string, unknown>;
  const rightSettings = right.settings as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(leftSettings), ...Object.keys(rightSettings)])].sort();
  const changes = keys.filter((key) => leftSettings[key] !== rightSettings[key]);
  const sectionWidth = 13;
  const header = `  ${fit("SECTION", sectionWidth)}  DETAILS`;
  const summary = changes.length === 0
    ? "identical settings"
    : `${changes.length} changed setting${changes.length === 1 ? "" : "s"}`;

  return [
    header,
    `  ${"─".repeat(header.length - 2)}`,
    `  ${fit("STATUS", sectionWidth)}  ${activeMark} ${model.id} · ${left.name} ↔ ${right.name} · ${summary}`,
    ...changes.map((key) => `  ${fit("CHANGE", sectionWidth)}  ${key}: ${setting(leftSettings[key], "inherit")} → ${setting(rightSettings[key], "inherit")}`),
  ].join("\n");
}

export function formatProfiles(model: OmlxModel, profiles: OmlxProfile[], activeMark = "●"): string {
  if (profiles.length === 0) return `No profiles found for ${model.id}.`;
  const active = setting(model.settings.active_profile_name, "none");
  const sectionWidth = 13;
  const header = `  ${fit("SECTION", sectionWidth)}  DETAILS`;
  const rows = profiles.map((profile) => {
    const marker = profile.name === active ? `${activeMark} ` : "  ";
    return `  ${fit(profile.name.toUpperCase(), sectionWidth)}  ${marker}${profileSummary(profile.settings)}`;
  });

  return [
    header,
    `  ${"─".repeat(header.length - 2)}`,
    `  ${fit("STATUS", sectionWidth)}  ${activeMark} ${model.id}`,
    ...rows,
  ].join("\n");
}

export function formatSwitchResult(result: SwitchResult, activeMark = "●"): string {
  const settings = result.applied.settings;
  const reload = result.applied.auto_reloaded ? " · reloaded" : result.applied.requires_reload ? " · reload required" : "";
  const sectionWidth = 13;
  const header = `  ${fit("SECTION", sectionWidth)}  DETAILS`;
  return [
    header,
    `  ${"─".repeat(header.length - 2)}`,
    `  ${fit("STATUS", sectionWidth)}  ${activeMark} ${result.model.id} · ${result.previousProfile} → ${result.profile.name}${reload}`,
    `  ${fit("PROFILE", sectionWidth)}  ${result.profile.description?.trim() || "No description."}`,
    `  ${fit("SETTINGS", sectionWidth)}  ${profileSummary(settings)}`,
  ].join("\n");
}

export async function switchProfile(
  model: OmlxModel,
  profileName: string,
  signal: AbortSignal | undefined,
  availableProfiles: OmlxProfile[],
): Promise<SwitchResult> {
  const profile = availableProfiles.find(
    (candidate) => candidate.name === profileName,
  );
  if (!profile) {
    throw new Error(
      `Profile not found: ${profileName}. Available: ${availableProfiles.map((item) => item.name).join(", ") || "none"}`,
    );
  }

  const applied = await applyProfile(model.id, profileName, signal);
  return {
    model,
    previousProfile: setting(model.settings.active_profile_name, "none"),
    profile,
    applied,
  };
}
