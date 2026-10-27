// One source for the career order: oldest job first, like the branches grow.
// resume.ts lists jobs newest first; the career timeline on the page uses this.

export interface CareerEntry<T> {
  job: T;
  /** Index of the job in the list it came from. */
  index: number;
}

/** Jobs oldest first by `startDate`. Equal dates keep the reversed list order. */
export function careerEntries<T extends { startDate: string }>(jobs: readonly T[]): CareerEntry<T>[] {
  return jobs
    .map((job, index) => ({ job, index }))
    .sort((a, b) =>
      a.job.startDate < b.job.startDate ? -1 : a.job.startDate > b.job.startDate ? 1 : b.index - a.index,
    );
}

export function careerOrder<T extends { startDate: string }>(jobs: readonly T[]): T[] {
  return careerEntries(jobs).map((entry) => entry.job);
}
