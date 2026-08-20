import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const schemaUrl = new URL("../schemas/polyharness.schema.json", import.meta.url);
let validatorPromise;

async function configValidator() {
  validatorPromise ??= readFile(schemaUrl, "utf8").then((contents) => {
    const schema = JSON.parse(contents);
    return new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  });
  return validatorPromise;
}

function formatValidationErrors(errors = []) {
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ");
}

export function repositoryRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export async function loadConfig(root = repositoryRoot()) {
  const configPath = path.join(root, "polyharness.config.json");
  const contents = await readFile(configPath, "utf8");
  let config;
  try {
    config = JSON.parse(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${configPath}: ${message}`);
  }

  const validate = await configValidator();
  if (!validate(config)) {
    throw new Error(`Invalid polyharness.config.json: ${formatValidationErrors(validate.errors)}`);
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
