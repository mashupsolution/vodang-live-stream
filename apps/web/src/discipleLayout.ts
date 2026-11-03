/** Native 1080×1920 coordinates, shared by character rendering and targeted FX.
 * Each row reserves room below the opaque seated art for its own nameplate. */
export function discipleSeat(slot: number) {
  const row = Math.floor(slot / 5);
  const spread = 146 + row * 9;
  return {
    x: 540 + ((slot % 5) - 2) * spread,
    y: 1138 + row * 106,
    size: 96 + row,
    labelWidth: spread - 14,
  };
}
