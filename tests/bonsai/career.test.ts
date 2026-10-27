import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { careerEntries, careerOrder } from "../../src/lib/bonsai/career.ts";
import { jobs } from "../../src/data/resume.ts";

test("careerOrder returns the resume jobs oldest first, by startDate", () => {
  const ordered = careerOrder(jobs);
  assert.equal(ordered.length, jobs.length);
  const dates = ordered.map((job) => job.startDate);
  assert.deepEqual(dates, [...dates].sort());
  assert.deepEqual(dates, ["2018", "2021", "2022", "2025"]);
  assert.match(ordered[0]!.company, /GMV/);
  assert.match(ordered[3]!.company, /Santander/);
});

test("careerOrder does not mutate its input and handles month precision and ties", () => {
  const input = [
    { startDate: "2022-03", name: "c" },
    { startDate: "2022", name: "b" },
    { startDate: "2019-11", name: "a" },
    { startDate: "2022", name: "tie-later-in-list" },
  ];
  const copy = structuredClone(input);
  const ordered = careerOrder(input);
  assert.deepEqual(input, copy);
  assert.deepEqual(
    ordered.map((job) => job.name),
    ["a", "tie-later-in-list", "b", "c"],
    "equal dates keep the newest-first list reversed, like the resume lists them",
  );
  assert.deepEqual(
    careerEntries(input).map((entry) => entry.index),
    [2, 3, 1, 0],
  );
});

test("the page uses the same helper and no longer reverses the resume list", () => {
  const page = readFileSync(new URL("../../src/pages/index.astro", import.meta.url), "utf8");
  assert.match(page, /careerOrder\(jobs\)/);
  assert.doesNotMatch(page, /\.reverse\(\)/);
});
