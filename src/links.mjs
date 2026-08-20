import { lstat, mkdir, readlink, symlink, unlink } from "node:fs/promises";
import path from "node:path";

async function inspectLink(target, source) {
  let stats;
  try {
    stats = await lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") return { state: "missing" };
    throw error;
  }

  if (!stats.isSymbolicLink()) return { state: "occupied" };

  const linkValue = await readlink(target);
  const resolved = path.resolve(path.dirname(target), linkValue);
  if (resolved === path.resolve(source)) {
    return { state: "linked", resolved };
  }
  return { state: "foreign-link", resolved };
}

export async function linkSkill(source, destination, { dryRun = false } = {}) {
  const target = path.join(destination, path.basename(source));
  const inspection = await inspectLink(target, source);

  if (inspection.state === "linked") return { action: "unchanged", target };
  if (inspection.state === "occupied") {
    return { action: "conflict", target, reason: "a real file or directory already exists" };
  }
  if (inspection.state === "foreign-link") {
    return {
      action: "conflict",
      target,
      reason: `an existing symlink points to ${inspection.resolved}`,
    };
  }

  if (!dryRun) {
    await mkdir(destination, { recursive: true });
    await symlink(path.resolve(source), target, "dir");
  }
  return { action: dryRun ? "would-link" : "linked", target };
}

export async function unlinkSkill(source, destination, { dryRun = false } = {}) {
  const target = path.join(destination, path.basename(source));
  const inspection = await inspectLink(target, source);

  if (inspection.state === "missing") return { action: "missing", target };
  if (inspection.state !== "linked") {
    const reason =
      inspection.state === "occupied"
        ? "the path is not a symlink"
        : `the symlink points to ${inspection.resolved}`;
    return { action: "conflict", target, reason };
  }

  if (!dryRun) await unlink(target);
  return { action: dryRun ? "would-unlink" : "unlinked", target };
}

export async function skillLinkStatus(source, destination) {
  return inspectLink(path.join(destination, path.basename(source)), source);
}
