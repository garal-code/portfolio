import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { barkRepeat, isColorMap, TEXTURE_MAPS } from "../../src/lib/bonsai/surfaces.ts";

const root = new URL("../../public/bonsai/", import.meta.url).pathname;

// public/bonsai/video holds the scrubbed background render (S9), not Poly Haven assets.
const OWN_RENDER_DIR = join(root, "video");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (path === OWN_RENDER_DIR) return [];
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("public/bonsai has a CREDITS.md and every other file is credited as CC0 with a Poly Haven URL", () => {
  const credits = join(root, "CREDITS.md");
  assert.ok(existsSync(credits), "CREDITS.md exists");
  const rows = readFileSync(credits, "utf8")
    .split("\n")
    .filter((line) => line.trim().startsWith("|"));
  const assets = files(root).filter((path) => path !== credits);
  assert.ok(assets.length > 0, "assets exist");
  for (const path of assets) {
    const name = relative(root, path);
    const row = rows.find((line) => line.includes(`\`${name}\``));
    assert.ok(row, `${name} is listed in CREDITS.md`);
    assert.match(row, /\bCC0\b/, `${name} is CC0`);
    assert.match(row, /https:\/\/polyhaven\.com\/a\/[a-z0-9_]+/, `${name} links its Poly Haven page`);
  }
  for (const line of rows) {
    for (const [, listed] of line.matchAll(/`([^`]+\/[^`]+\.[a-z0-9]+)`/g)) {
      assert.ok(existsSync(join(root, listed!)), `CREDITS.md lists ${listed}, which does not exist`);
    }
  }
});

test("the added assets stay under the 6 MB budget", () => {
  const total = files(root).reduce((sum, path) => sum + statSync(path).size, 0);
  assert.ok(total < 6 * 1024 * 1024, `${(total / 1048576).toFixed(2)} MB`);
});

test("bark repeat keeps one texel density: u wraps the circumference, v runs along the length", () => {
  const tile = 8;
  const thin = barkRepeat(0.5, 10, tile);
  const thick = barkRepeat(2, 10, tile);
  assert.ok(Math.abs(thick.u - 4 * thin.u) < 1e-9, "u repeat scales with radius");
  assert.equal(thick.v, thin.v, "v repeat depends on length only");
  assert.ok(Math.abs(barkRepeat(2, 40, tile).v - 4 * thick.v) < 1e-9, "v repeat scales with length");
  // texels per cm are equal in both directions
  const { u, v } = barkRepeat(1.3, 7, tile);
  assert.ok(Math.abs(u / (2 * Math.PI * 1.3) - v / 7) < 1e-9);
  assert.deepEqual(barkRepeat(0, 0, tile), { u: 0, v: 0 });
});

test("color space contract: only colour and emissive maps are sRGB; normal, roughness and AO are linear", () => {
  for (const role of ["diffuse", "emissive"]) assert.equal(isColorMap(role), true, role);
  for (const role of ["normal", "roughness", "ao", "metalness"]) assert.equal(isColorMap(role), false, role);
  assert.deepEqual([...TEXTURE_MAPS].sort(), ["ao", "diffuse", "emissive", "metalness", "normal", "roughness"]);
});
