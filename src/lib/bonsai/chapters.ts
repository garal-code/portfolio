// Chapter ledger for the bonsai page (world bible section 4).
// Pure data: shared by the page, the video time map and the tests.

export const CHAPTER_IDS = [
  "seed",
  "sprout",
  "trunk",
  "branches",
  "pruning",
  "pagoda",
  "finished",
] as const;

export type ChapterId = (typeof CHAPTER_IDS)[number];

export interface Chapter {
  id: ChapterId;
  /** Relative scroll length of the chapter's section. */
  scrollWeight: number;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: "seed", scrollWeight: 1.2 },
  { id: "sprout", scrollWeight: 1.0 },
  { id: "trunk", scrollWeight: 1.4 },
  { id: "branches", scrollWeight: 2.4 },
  { id: "pruning", scrollWeight: 1.2 },
  { id: "pagoda", scrollWeight: 1.2 },
  { id: "finished", scrollWeight: 1.0 },
];
