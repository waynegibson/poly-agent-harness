import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  installationTargets,
  loadConfig,
  repositoryRoot,
  selectHarnesses,
} from "./config.mjs";
import { linkSkill, skillLinkStatus, unlinkSkill } from "./links.mjs";
import { selectSkills, validateSkillRepository } from "./skills.mjs";

const HELP = `Poly Agent Harness

Usage:
  pah list
  pah validate
  pah install <skill...> [--all] [--harness <names>]
  pah uninstall <skill...> [--all] [--harness <names>]
  pah doctor [--harness <names>]

Options:
  --all                Select every canonical skill
  --harness <names>    Comma-separated harnesses, or all (default: all)
  --scope <scope>      user or project (default: user)
  --project <path>     Project root for project scope (default: cwd)
  --home <path>        Home directory override
  --dry-run            Report changes without writing
  -h, --help           Show help
`;

function parseArguments(argv) {
  const command = argv[0];
  const options = {
    all: false,
    dryRun: false,
    harness: "all",
    help: false,
    home: os.homedir(),
    project: process.cwd(),
    scope: "user",
  };
  const positional = [];

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--all") options.all = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (["--harness", "--scope", "--project", "--home"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      index += 1;
      options[argument.slice(2)] = value;
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      positional.push(argument);
    }
  }

  if (!['user', 'project'].includes(options.scope)) {
    throw new Error("--scope must be user or project");
  }
  options.home = path.resolve(options.home);
  options.project = path.resolve(options.project);
  return { command, options, positional };
}

function printResults(results) {
  for (const result of results) {
    const suffix = result.reason ? ` (${result.reason})` : "";
    console.log(`${result.action.padEnd(12)} ${result.target}${suffix}`);
  }
}

export async function run(argv = process.argv.slice(2)) {
  const root = repositoryRoot();
  const { command, options, positional } = parseArguments(argv);

  if (!command || options.help || command === "help") {
    console.log(HELP.trimEnd());
    return 0;
  }
  const config = await loadConfig(root);
  const skillsDirectory = path.resolve(root, config.skillsDirectory);
  const validation = await validateSkillRepository(skillsDirectory);

  if (command === "validate") {
    if (validation.errors.length > 0) {
      for (const error of validation.errors) console.error(`error: ${error}`);
      return 1;
    }
    console.log(`Valid: ${validation.records.length} skill${validation.records.length === 1 ? "" : "s"}`);
    return 0;
  }

  if (validation.errors.length > 0) {
    for (const error of validation.errors) console.error(`error: ${error}`);
    console.error("Fix validation errors before installing skills.");
    return 1;
  }

  if (command === "list") {
    if (validation.records.length === 0) {
      console.log("No skills found.");
      return 0;
    }
    for (const record of validation.records) {
      console.log(`${record.metadata.name}\t${record.metadata.description}`);
    }
    return 0;
  }

  const harnesses = selectHarnesses(config, options.harness);
  const targets = installationTargets(config, harnesses, options);

  if (command === "doctor") {
    console.log(`Repository: ${root}`);
    console.log(`Skills: ${validation.records.length}`);
    let problems = 0;

    for (const target of targets) {
      console.log(`\n${target.harnesses.join(" + ")}: ${target.destination}`);
      if (validation.records.length === 0) console.log("  no canonical skills");
      for (const record of validation.records) {
        const status = await skillLinkStatus(record.directory, target.destination);
        const detail = status.resolved ? ` -> ${status.resolved}` : "";
        console.log(`  ${record.metadata.name}: ${status.state}${detail}`);
        if (["occupied", "foreign-link"].includes(status.state)) problems += 1;
      }
    }
    return problems > 0 ? 1 : 0;
  }

  if (command !== "install" && command !== "uninstall") {
    throw new Error(`Unknown command: ${command}`);
  }

  const skills = selectSkills(validation.records, positional, options.all);
  const operation = command === "install" ? linkSkill : unlinkSkill;
  const results = [];

  for (const target of targets) {
    for (const skill of skills) {
      const result = await operation(skill.directory, target.destination, {
        dryRun: options.dryRun,
      });
      results.push({ ...result, harnesses: target.harnesses });
    }
  }

  printResults(results);
  return results.some((result) => result.action === "conflict") ? 1 : 0;
}
