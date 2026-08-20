import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function repositoryRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export async function loadConfig(root = repositoryRoot()) {
  const configPath = path.join(root, "polyharness.config.json");
  const contents = await readFile(configPath, "utf8");
  const config = JSON.parse(contents);

  if (!config.skillsDirectory || typeof config.skillsDirectory !== "string") {
    throw new Error("polyharness.config.json must define skillsDirectory");
  }

  if (!config.harnesses || typeof config.harnesses !== "object") {
    throw new Error("polyharness.config.json must define harnesses");
  }

  for (const [name, targets] of Object.entries(config.harnesses)) {
    if (!targets?.user || !targets?.project) {
      throw new Error(`Harness ${name} must define user and project targets`);
    }
  }

  return config;
}

export function resolveTarget(template, { home, project }) {
  if (template === "~") return path.resolve(home);
  if (template.startsWith("~/")) {
    return path.resolve(home, template.slice(2));
  }
  if (path.isAbsolute(template)) return path.resolve(template);
  return path.resolve(project, template);
}

export function selectHarnesses(config, requested = "all") {
  const available = Object.keys(config.harnesses);
  if (requested === "all") return available;

  const selected = requested
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const unknown = selected.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown harness${unknown.length === 1 ? "" : "es"}: ${unknown.join(", ")}. ` +
        `Choose from ${available.join(", ")}, or all.`,
    );
  }

  return [...new Set(selected)];
}

export function installationTargets(config, harnessNames, options) {
  const byDestination = new Map();

  for (const harness of harnessNames) {
    const template = config.harnesses[harness][options.scope];
    const destination = resolveTarget(template, options);
    const current = byDestination.get(destination);
    if (current) {
      current.harnesses.push(harness);
    } else {
      byDestination.set(destination, { destination, harnesses: [harness] });
    }
  }

  return [...byDestination.values()];
}
