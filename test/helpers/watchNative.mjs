import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {URL} from "node:url";

export function watchSource(file) {
  return readFileSync(
    new URL(`../../targets/watch/${file}`, import.meta.url),
    "utf8",
  );
}

export function swiftMethod(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `Missing Swift method: ${signature}`);
  let depth = 0;
  const open = source.indexOf("{", start);
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0)
      return source.slice(start, index + 1);
  }
  throw new Error(`Unclosed Swift method: ${signature}`);
}

export function runSwift(source, extraFiles = []) {
  const dir = mkdtempSync(join(tmpdir(), "reacttube-watch-test-"));
  try {
    const input = join(dir, "Probe.swift");
    const output = join(dir, "probe");
    writeFileSync(input, source);
    const compile = spawnSync(
      "xcrun",
      [
        "swiftc",
        "-parse-as-library",
        "-module-cache-path",
        join(tmpdir(), "reacttube-watch-test-modules"),
        ...extraFiles,
        input,
        "-o",
        output,
      ],
      {encoding: "utf8", timeout: 120000},
    );
    assert.equal(compile.status, 0, compile.stderr);
    const result = spawnSync(output, [], {encoding: "utf8", timeout: 15000});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}
