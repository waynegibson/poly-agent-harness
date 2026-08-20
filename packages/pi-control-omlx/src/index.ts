/** Pi extension for inspecting and switching oMLX model profiles. */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { listModels, listProfiles } from "./api.js";
import {
  findModel,
  formatModelList,
  formatModelStatus,
  formatProfileDiff,
  formatProfiles,
  formatSwitchResult,
  switchProfile,
  visibleModels,
} from "./profiles.js";

const HELP = [
  "Usage:",
  "  /omlx                              List models",
  "  /omlx status [model]               Show model status (alias: s)",
  "  /omlx profiles [model]             List profiles (alias: p)",
  "  /omlx diff <left> <right> [model]  Compare two profiles",
  "  /omlx use [profile] [model]        Apply a profile; opens a picker when omitted",
].join("\n");

const SUBCOMMANDS = [
  { value: "status", label: "status [model]", description: "Show model status (alias: s)" },
  { value: "profiles", label: "profiles [model]", description: "List model profiles (alias: p)" },
  { value: "diff", label: "diff <left> <right> [model]", description: "Compare two profiles" },
  { value: "use", label: "use [profile] [model]", description: "Apply a profile or open the picker" },
  { value: "help", label: "help", description: "Show oMLX command usage" },
];

function getSubcommandCompletions(prefix: string) {
  // Only complete the first token. Model and profile names are runtime data and
  // should not be fetched during each editor autocomplete pass.
  const tokens = prefix.trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 1 || (tokens.length === 1 && /\s$/.test(prefix))) return null;
  const query = tokens[0]?.toLowerCase() ?? "";
  return SUBCOMMANDS.filter((command) => command.value.startsWith(query));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function modelNotFound(input: string | undefined, models: ReturnType<typeof visibleModels>): string {
  if (input) return `Model not found: ${input}. Available: ${models.map((model) => model.id).join(", ") || "none"}`;
  return "No loaded or default oMLX model found. Specify a model ID explicitly.";
}

async function resolveModel(modelId: string | undefined, ctx: ExtensionCommandContext) {
  const models = await listModels();
  // Prefer Pi's selected model when it is registered by oMLX.
  const currentModelId = modelId ? undefined : ctx.model?.id;
  const targetId = modelId ?? (currentModelId && models.some((model) => model.id === currentModelId) ? currentModelId : undefined);
  const model = findModel(models, targetId);
  if (!model) throw new Error(modelNotFound(targetId, visibleModels(models)));
  return model;
}

async function showProfiles(modelId: string | undefined, ctx: ExtensionCommandContext): Promise<void> {
  const model = await resolveModel(modelId, ctx);
  ctx.ui.notify(formatProfiles(model, await listProfiles(model.id), ctx.ui.theme.fg("success", "●")), "info");
}

async function showStatus(modelId: string | undefined, ctx: ExtensionCommandContext): Promise<void> {
  ctx.ui.notify(
    formatModelStatus(
      await resolveModel(modelId, ctx),
      ctx.ui.theme.fg("success", "●"),
      ctx.ui.theme.fg("muted", "●"),
    ),
    "info",
  );
}

async function showDiff(
  leftName: string | undefined,
  rightName: string | undefined,
  modelId: string | undefined,
  ctx: ExtensionCommandContext,
): Promise<void> {
  if (!leftName || !rightName) throw new Error("Two profile names are required.\n\n" + HELP);
  const model = await resolveModel(modelId, ctx);
  const profiles = await listProfiles(model.id);
  const left = profiles.find((profile) => profile.name === leftName);
  const right = profiles.find((profile) => profile.name === rightName);
  if (!left || !right) {
    throw new Error(`Profile not found. Available: ${profiles.map((profile) => profile.name).join(", ") || "none"}`);
  }
  ctx.ui.notify(formatProfileDiff(model, left, right, ctx.ui.theme.fg("success", "●")), "info");
}

async function useProfile(profileName: string | undefined, modelId: string | undefined, ctx: ExtensionCommandContext): Promise<void> {
  const model = await resolveModel(modelId, ctx);
  const profiles = await listProfiles(model.id);

  if (!profileName) {
    if (!ctx.hasUI) throw new Error("A profile name is required outside interactive mode.\n\n" + HELP);
    if (profiles.length === 0) throw new Error(`No profiles found for ${model.id}.`);
    profileName = await ctx.ui.select("Select oMLX profile", profiles.map((profile) => profile.name));
    if (!profileName) return;
  }

  if (!profiles.some((profile) => profile.name === profileName)) {
    throw new Error(`Profile not found: ${profileName}. Available: ${profiles.map((profile) => profile.name).join(", ")}`);
  }
  ctx.ui.notify(
    formatSwitchResult(await switchProfile(model, profileName, undefined, profiles), ctx.ui.theme.fg("success", "●")),
    "info",
  );
}

export default function piControlOmlxExtension(pi: ExtensionAPI) {
  pi.registerCommand("omlx", {
    description: "Inspect oMLX models and profiles",
    getArgumentCompletions: getSubcommandCompletions,
    handler: async (args, ctx) => {
      const [action = "list", first, second, third, ...rest] = args.trim().split(/\s+/).filter(Boolean);

      try {
        if (rest.length > 0) throw new Error(HELP);
        switch (action.toLowerCase()) {
          case "list":
            if (first) throw new Error(HELP);
            ctx.ui.notify(formatModelList(await listModels(), ctx.ui.theme.fg("success", "●")), "info");
            return;
          case "status":
          case "s":
            if (second) throw new Error(HELP);
            await showStatus(first, ctx);
            return;
          case "profiles":
          case "p":
            if (second) throw new Error(HELP);
            await showProfiles(first, ctx);
            return;
          case "diff":
            await showDiff(first, second, third, ctx);
            return;
          case "use":
            if (third) throw new Error(HELP);
            await useProfile(first, second, ctx);
            return;
          case "help":
          case "-h":
          case "--help":
            ctx.ui.notify(HELP, "info");
            return;
          default:
            ctx.ui.notify(HELP, "warning");
        }
      } catch (error) {
        ctx.ui.notify(`oMLX: ${errorMessage(error)}`, "error");
      }
    },
  });
}
