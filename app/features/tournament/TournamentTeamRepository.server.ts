// TODO: add rest of the functions here that relate more to tournament teams than tournament/bracket

import { db } from "~/db/sql";

export function setActiveRoster({
  teamId,
  activeRosterUserIds,
}: {
  teamId: number;
  activeRosterUserIds: number[];
}) {
  return db
    .updateTable("TournamentTeam")
    .set({ activeRosterUserIds: JSON.stringify(activeRosterUserIds) })
    .where("TournamentTeam.id", "=", teamId)
    .execute();
}
