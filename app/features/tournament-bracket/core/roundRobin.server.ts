import { removeDuplicates } from "~/utils/arrays";
import type { AllMatchResult } from "../queries/allMatchResultsByTournamentId.server";
import type { TournamentTeam } from "~/db/types";

// xxx: TODO unit tests
export function teamsThatAdvanceFromGroups({
  results,
  advancingPerGroupCount,
}: {
  results: AllMatchResult[];
  advancingPerGroupCount: number;
}) {
  const result: TournamentTeam["id"][] = [];

  const roundRobinMatches = results.filter(
    (r) => r.stageType === "round_robin"
  );
  const groupIds = removeDuplicates(roundRobinMatches.map((r) => r.groupId));

  for (const groupId of groupIds) {
    const matches = roundRobinMatches.filter((r) => r.groupId === groupId);
    const teamScores: {
      teamId: number;
      wins: number;
      scoreDifference: number;
    }[] = [];

    for (const match of matches) {
      let scoreOpponentOne = teamScores.find(
        (s) => s.teamId === match.opponentOne.id
      );
      if (!scoreOpponentOne) {
        scoreOpponentOne = {
          teamId: match.opponentOne.id,
          wins: 0,
          scoreDifference: 0,
        };
        teamScores.push(scoreOpponentOne);
      }
      let scoreOpponentTwo = teamScores.find(
        (s) => s.teamId === match.opponentTwo.id
      );
      if (!scoreOpponentTwo) {
        scoreOpponentTwo = {
          teamId: match.opponentTwo.id,
          wins: 0,
          scoreDifference: 0,
        };
        teamScores.push(scoreOpponentTwo);
      }

      if (match.opponentOne.result === "win") {
        scoreOpponentOne.wins++;
      }
      if (match.opponentTwo.result === "win") {
        scoreOpponentTwo.wins++;
      }

      scoreOpponentOne.scoreDifference +=
        match.opponentOne.score - match.opponentTwo.score;
      scoreOpponentTwo.scoreDifference +=
        match.opponentTwo.score - match.opponentOne.score;
    }

    teamScores.sort((a, b) => {
      if (a.wins > b.wins) return -1;
      if (a.wins < b.wins) return 1;
      if (a.scoreDifference > b.scoreDifference) return -1;
      if (a.scoreDifference < b.scoreDifference) return 1;
      return 0;
    });

    // xxx: TODO invariant here that we can resolve the teams without a tie
    // also handle the "manual tiebreaker" case

    // xxx: handle seeding correctly -> should be 1st group 1st then 2nd group 1st etc. could be done by giving ids like 10,11,20,21 etc. then sorting later

    result.push(
      ...teamScores.slice(0, advancingPerGroupCount).map((s) => s.teamId)
    );
  }

  return result;
}
