import type { Params } from "@remix-run/react";
import invariant from "tiny-invariant";
import type {
  BracketFormat,
  TournamentFormat,
  TournamentMatch,
  TournamentStage,
} from "~/db/types";
import {
  checkInHasStarted,
  teamHasCheckedIn,
  type TournamentLoaderData,
  type TournamentLoaderTeam,
} from "~/features/tournament";
import type { DataTypes, ValueToArray } from "~/modules/brackets-manager/types";
import type { Stage } from "~/modules/brackets-model";
import {
  seededRandom,
  sourceTypes,
} from "~/modules/tournament-map-list-generator";
import { assertUnreachable } from "~/utils/types";
import type { FindMatchById } from "../tournament-bracket/queries/findMatchById.server";
import type { FindTeamsByTournamentId } from "../tournament/queries/findTeamsByTournamentId.server";
import { teamsThatAdvanceFromGroups } from "./core/roundRobin.server";
import type { AllMatchResult } from "./queries/allMatchResultsByTournamentId.server";
import { STAGE_SEARCH_PARAM } from "./tournament-bracket-constants";

export function matchIdFromParams(params: Params<string>) {
  const result = Number(params["mid"]);
  invariant(!Number.isNaN(result), "mid is not a number");

  return result;
}

const passNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export function resolveRoomPass(matchId: TournamentMatch["id"]) {
  let result = "";

  for (let i = 0; i < 4; i++) {
    const { shuffle } = seededRandom(`${matchId}-${i}`);

    result += shuffle(passNumbers)[0];
  }

  return result;
}

export function resolveHostingTeam(
  teams: [TournamentLoaderTeam, TournamentLoaderTeam]
) {
  if (teams[0].prefersNotToHost && !teams[1].prefersNotToHost) return teams[1];
  if (!teams[0].prefersNotToHost && teams[1].prefersNotToHost) return teams[0];
  if (!teams[0].seed && !teams[1].seed) return teams[0];
  if (!teams[0].seed) return teams[1];
  if (!teams[1].seed) return teams[0];
  if (teams[0].seed < teams[1].seed) return teams[0];
  if (teams[1].seed < teams[0].seed) return teams[1];

  console.error("resolveHostingTeam: unexpected default");
  return teams[0];
}

export function resolveTournamentStageName({
  bracketFormat,
  isUnderground,
}: {
  bracketFormat: BracketFormat;
  isUnderground: boolean;
}) {
  if (isUnderground) return "Underground stage";

  switch (bracketFormat) {
    case "SE":
    case "DE":
      return "Elimination stage";
    case "RR":
      return "Groups stage";
    default: {
      assertUnreachable(bracketFormat);
    }
  }
}

export function resolveTournamentStageType(
  format: BracketFormat
): TournamentStage["type"] {
  switch (format) {
    case "SE":
      return "single_elimination";
    case "DE":
      return "double_elimination";
    case "RR":
      return "round_robin";
    default: {
      assertUnreachable(format);
    }
  }
}

export function resolveTournamentStageSettings(
  format: BracketFormat
): Stage["settings"] {
  switch (format) {
    case "SE":
      return {};
    case "DE":
      return {
        grandFinal: "double",
      };
    // xxx: resolve from TO setting
    case "RR":
      return {
        groupCount: 2,
      };
    default: {
      assertUnreachable(format);
    }
  }
}

export function mapCountPlayedInSetWithCertainty({
  bestOf,
  scores,
}: {
  bestOf: number;
  scores: [number, number];
}) {
  const maxScore = Math.max(...scores);
  const scoreSum = scores.reduce((acc, curr) => acc + curr, 0);

  return scoreSum + (Math.ceil(bestOf / 2) - maxScore);
}

export function checkSourceIsValid({
  source,
  match,
}: {
  source: string;
  match: NonNullable<FindMatchById>;
}) {
  if (sourceTypes.includes(source as any)) return true;

  const asTeamId = Number(source);

  if (match.opponentOne?.id === asTeamId) return true;
  if (match.opponentTwo?.id === asTeamId) return true;

  return false;
}

export function HACKY_resolvePoolCode(event: TournamentLoaderData["event"]) {
  if (event.name.includes("Paddling Pool")) return "PP";
  if (event.name.includes("In The Zone")) return "ITZ";

  return "PICNIC";
}

export function bracketSubscriptionKey(tournamentId: number) {
  return `BRACKET_CHANGED_${tournamentId}`;
}

export function matchSubscriptionKey(matchId: number) {
  return `MATCH_CHANGED_${matchId}`;
}

export function fillWithNullTillPowerOfTwo<T>(arr: T[]) {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(arr.length)));
  const nullsToAdd = nextPowerOfTwo - arr.length;

  return [...arr, ...new Array(nullsToAdd).fill(null)];
}

export function everyMatchIsOver(bracket: ValueToArray<DataTypes>) {
  // tournament didn't start yet
  if (bracket.match.length === 0) return false;

  let lastWinner = -1;
  for (const [i, match] of bracket.match.entries()) {
    // special case - bracket reset might not be played depending on who wins in the grands
    const isLast = i === bracket.match.length - 1;
    if (isLast && lastWinner === 1) {
      continue;
    }
    // BYE
    if (match.opponent1 === null || match.opponent2 === null) {
      continue;
    }
    if (
      match.opponent1?.result !== "win" &&
      match.opponent2?.result !== "win"
    ) {
      return false;
    }

    lastWinner = match.opponent1?.result === "win" ? 1 : 2;
  }

  return true;
}

export function resolveBracketFormatFromRequest({
  request,
  tournamentFormat,
}: {
  request: Request;
  tournamentFormat: TournamentFormat;
}): { bracketFormat: BracketFormat; isUnderground: boolean } {
  if (tournamentFormat === "SE" || tournamentFormat === "DE") {
    return { bracketFormat: tournamentFormat, isUnderground: false };
  }

  const url = new URL(request.url);
  const stage = url.searchParams.get(STAGE_SEARCH_PARAM.key);
  if (tournamentFormat === "RR_TO_SE") {
    if (stage === STAGE_SEARCH_PARAM.finals) {
      return { bracketFormat: "SE", isUnderground: false };
    }
    if (stage === STAGE_SEARCH_PARAM.underground) {
      return { bracketFormat: "SE", isUnderground: true };
    }

    return { bracketFormat: "RR", isUnderground: false };
  }

  assertUnreachable(tournamentFormat);
}

export function teamsThatWillPlay({
  teams,
  tournament,
  bracketFormat,
  isUnderground,
  results,
}: {
  teams: FindTeamsByTournamentId;
  tournament: Pick<TournamentLoaderData["event"], "startTime" | "format">;
  bracketFormat: BracketFormat;
  isUnderground: boolean;
  results: AllMatchResult[];
}) {
  if (tournament.format === "RR_TO_SE" && bracketFormat === "SE") {
    const teamsThatAdvance = teamsThatAdvanceFromGroups({
      advancingPerGroupCount: 2,
      results,
    });

    // xxx: TODO underground checkin
    if (isUnderground) {
      return teams.filter((t) => !teamsThatAdvance.includes(t.id));
    }
    return teams.filter((t) => teamsThatAdvance.includes(t.id));
  }

  if (checkInHasStarted(tournament)) {
    return teams.filter(teamHasCheckedIn);
  }

  return teams;
}
