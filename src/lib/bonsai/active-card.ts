/** A chapter section or career stop, measured against the viewport top. */
export interface CardZone {
  id: string;
  top: number;
  bottom: number;
}

/**
 * The id of the card that is on screen: the zone containing the vertical centre
 * of the viewport. Above the first zone the first card is active; in a gap or
 * below the last zone the last zone that started above the centre stays active.
 * It only reads its arguments, so the same scroll position always gives the same
 * card, forward or back.
 */
export function activeCardId(zones: readonly CardZone[], viewportHeight: number): string | undefined {
  const centre = viewportHeight / 2;
  const containing = zones.find((zone) => zone.top <= centre && centre < zone.bottom);
  if (containing) return containing.id;
  const passed = zones.filter((zone) => zone.top <= centre);
  return (passed.at(-1) ?? zones[0])?.id;
}
