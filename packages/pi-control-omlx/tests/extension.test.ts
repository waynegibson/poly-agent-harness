import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { beforeEach, describe, expect, test, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  applyProfile: vi.fn(),
  listModels: vi.fn(),
  listProfiles: vi.fn(),
}));

vi.mock("../src/api.js", () => apiMocks);

import piControlOmlxExtension from "../src/index.js";

type CommandDefinition = Parameters<ExtensionAPI["registerCommand"]>[1];

const model = {
  id: "model-a",
  loaded: true,
  is_default: true,
  is_hidden: false,
  is_helper: false,
  settings: { active_profile_name: "general", temperature: 0.7 },
};

const profiles = [
  { name: "general", description: "Balanced", settings: { temperature: 0.7 } },
  { name: "coder", description: "Code", settings: { temperature: 0.2 } },
];

function registeredCommand(): CommandDefinition {
  let definition: CommandDefinition | undefined;
  const pi = {
    registerCommand: vi.fn((name: string, command: CommandDefinition) => {
      expect(name).toBe("omlx");
      definition = command;
    }),
  };
  piControlOmlxExtension(pi as unknown as ExtensionAPI);
  if (!definition) throw new Error("extension did not register /omlx");
  return definition;
}

function commandContext(options: { hasUI?: boolean; modelId?: string; selection?: string } = {}) {
  const notify = vi.fn();
  const select = vi.fn().mockResolvedValue(options.selection);
  const context = {
    hasUI: options.hasUI ?? true,
    model: options.modelId ? { id: options.modelId } : undefined,
    ui: {
      notify,
      select,
      theme: { fg: (_color: string, value: string) => value },
    },
  } as unknown as ExtensionCommandContext;
  return { context, notify, select };
}

describe("/omlx command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listModels.mockResolvedValue([model]);
    apiMocks.listProfiles.mockResolvedValue(profiles);
    apiMocks.applyProfile.mockResolvedValue({
      model_id: model.id,
      settings: profiles[1]!.settings,
    });
  });

  test("registers command metadata and first-token completions", () => {
    const command = registeredCommand();
    expect(command.description).toBe("Inspect oMLX models and profiles");
    expect(command.getArgumentCompletions?.("st")).toEqual([
      expect.objectContaining({ value: "status" }),
    ]);
    expect(command.getArgumentCompletions?.("status ")).toBeNull();
  });

  test("lists models and selects the active Pi model for status", async () => {
    const command = registeredCommand();
    const list = commandContext();
    await command.handler("", list.context);
    expect(list.notify).toHaveBeenCalledWith(expect.stringContaining("oMLX models (1)"), "info");

    apiMocks.listModels.mockResolvedValue([model, { ...model, id: "model-b" }]);
    const status = commandContext({ modelId: "model-b" });
    await command.handler("status", status.context);
    expect(status.notify).toHaveBeenCalledWith(expect.stringContaining("model-b · general"), "info");
  });

  test("shows profiles and validates diff arguments", async () => {
    const command = registeredCommand();
    const context = commandContext();
    await command.handler("profiles model-a", context.context);
    expect(apiMocks.listProfiles).toHaveBeenCalledWith("model-a");
    expect(context.notify).toHaveBeenCalledWith(expect.stringContaining("GENERAL"), "info");

    await command.handler("diff general", context.context);
    expect(context.notify).toHaveBeenLastCalledWith(expect.stringContaining("Two profile names are required"), "error");
  });

  test("uses the interactive picker and applies the selected profile", async () => {
    const command = registeredCommand();
    const context = commandContext({ selection: "coder" });
    await command.handler("use", context.context);

    expect(context.select).toHaveBeenCalledWith("Select oMLX profile", ["general", "coder"]);
    expect(apiMocks.applyProfile).toHaveBeenCalledWith("model-a", "coder", undefined);
    expect(context.notify).toHaveBeenCalledWith(expect.stringContaining("general → coder"), "info");
  });

  test("reports invalid models and non-interactive picker requests", async () => {
    const command = registeredCommand();
    const missing = commandContext();
    await command.handler("status missing", missing.context);
    expect(missing.notify).toHaveBeenCalledWith(expect.stringContaining("Model not found: missing"), "error");

    const nonInteractive = commandContext({ hasUI: false });
    await command.handler("use", nonInteractive.context);
    expect(nonInteractive.notify).toHaveBeenCalledWith(expect.stringContaining("profile name is required"), "error");
  });
});
