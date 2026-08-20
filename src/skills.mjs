import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SKIPPED_DIRECTORIES = new Set([".git", "deprecated", "node_modules"]);

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

export function parseFrontmatter(contents) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;

  const lines = match[1].split(/\r?\n/);
  const metadata = {};

  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!field) continue;

    const [, key, raw = ""] = field;
    if (raw === ">" || raw === "|") {
      const parts = [];
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        if (next && !/^\s/.test(next)) break;
        index += 1;
        parts.push(next.replace(/^\s+/, ""));
      }
      metadata[key] = raw === ">" ? parts.join(" ").trim() : parts.join("\n").trim();
    } else {
      metadata[key] = unquote(raw.trim());
    }
  }

  return metadata;
}

async function findSkillFiles(directory, results = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return results;
    throw error;
  }

  if (entries.some((entry) => entry.isFile() && entry.name === "SKILL.md")) {
    results.push(path.join(directory, "SKILL.md"));
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name)) {
      await findSkillFiles(path.join(directory, entry.name), results);
    }
  }
  return results;
}

export async function discoverSkills(skillsDirectory) {
  const files = await findSkillFiles(skillsDirectory);
  const records = [];

  for (const file of files.sort()) {
    const contents = await readFile(file, "utf8");
    const metadata = parseFrontmatter(contents);
    records.push({
      directory: path.dirname(file),
      directoryName: path.basename(path.dirname(file)),
      file,
      metadata,
    });
  }

  return records;
}

export function validateSkill(record) {
  const errors = [];
  const { metadata } = record;

  if (!metadata) {
    return [`${record.file}: missing YAML frontmatter`];
  }

  const { name, description } = metadata;
  if (!name) {
    errors.push(`${record.file}: missing required name`);
  } else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      errors.push(`${record.file}: name must contain lowercase letters, numbers, and single hyphens only`);
    }
    if (name.length > 64) {
      errors.push(`${record.file}: name must be 64 characters or fewer`);
    }
    if (name !== record.directoryName) {
      errors.push(`${record.file}: name ${name} must match directory ${record.directoryName}`);
    }
  }

  if (!description) {
    errors.push(`${record.file}: missing required description`);
  } else {
    if (description.length > 1024) {
      errors.push(`${record.file}: description must be 1024 characters or fewer`);
    }
    if (/<\/?[A-Za-z][^>]*>/.test(description)) {
      errors.push(`${record.file}: description must not contain XML tags`);
    }
  }

  return errors;
}

export async function validateSkillRepository(skillsDirectory) {
  const records = await discoverSkills(skillsDirectory);
  const errors = records.flatMap(validateSkill);
  const names = new Map();

  for (const record of records) {
    const name = record.metadata?.name;
    if (!name) continue;
    const previous = names.get(name);
    if (previous) {
      errors.push(`${record.file}: duplicate skill name ${name}; first declared in ${previous}`);
    } else {
      names.set(name, record.file);
    }
  }

  return { errors, records };
}

export function selectSkills(records, requested, all = false) {
  if (all) return records;
  if (requested.length === 0) {
    throw new Error("Specify at least one skill name, or pass --all");
  }

  const byName = new Map(records.map((record) => [record.metadata?.name, record]));
  const missing = requested.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(`Unknown skill${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }

  return [...new Set(requested)].map((name) => byName.get(name));
}
