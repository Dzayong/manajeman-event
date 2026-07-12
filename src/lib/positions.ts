import type { Position } from "@prisma/client";

export const POSITION_LABELS: Record<Position, string> = {
  KETUA_PANITIA: "Ketua Pelaksana",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
  SC: "Steering Committee",
  KOORDINATOR: "Koordinator",
  STAFF: "Staff",
};

/** Core event positions sit outside any division. */
export const CORE_POSITIONS: Position[] = [
  "KETUA_PANITIA",
  "SEKRETARIS",
  "BENDAHARA",
  "SC",
];

export function isCorePosition(position: Position): boolean {
  return CORE_POSITIONS.includes(position);
}
