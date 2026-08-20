#!/usr/bin/env node

import { run } from "../src/cli.mjs";

try {
  const exitCode = await run();
  process.exitCode = exitCode;
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}
