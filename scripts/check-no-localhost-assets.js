#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "public", "server"];
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);
const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".md",
  ".txt",
  ".svg",
  ".yml",
  ".yaml",
  ".sql",
]);

const LOCALHOST_PATTERN = /(https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|["']))/gi;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath, out);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    out.push(fullPath);
  }
}

function findViolations(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (LOCALHOST_PATTERN.test(line)) {
      violations.push({
        line: i + 1,
        text: line.trim(),
      });
    }
    LOCALHOST_PATTERN.lastIndex = 0;
  }

  return violations;
}

function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    walk(path.join(ROOT, dir), files);
  }

  const problems = [];
  for (const file of files) {
    const violations = findViolations(file);
    if (!violations.length) continue;
    problems.push({ file, violations });
  }

  if (!problems.length) {
    console.log("No localhost/127.0.0.1 URLs found in source files.");
    process.exit(0);
  }

  console.error("Found localhost/127.0.0.1 URLs. Please replace with app-hosted or relative assets:");
  for (const problem of problems) {
    const relFile = path.relative(ROOT, problem.file);
    for (const v of problem.violations) {
      console.error(`- ${relFile}:${v.line} ${v.text}`);
    }
  }
  process.exit(1);
}

main();
