import { faker } from "@faker-js/faker";
import invariant from "tiny-invariant";
import {
  lastCompletedVoting,
  nextNonCompletedVoting,
} from "~/modules/plus-server";
import { db } from "~/db";
import { sql } from "~/db/sql";
import type { UpsertManyPlusVotesArgs } from "./models/plusVotes.server";
import { ADMIN_DISCORD_ID } from "~/constants";
import shuffle from "just-shuffle";

const ADMIN_TEST_AVATAR = "fcfd65a3bea598905abb9ca25296816b";

const NZAP_TEST_DISCORD_ID = "455039198672453645";
const NZAP_TEST_AVATAR = "f809176af93132c3db5f0a5019e96339"; // https://cdn.discordapp.com/avatars/455039198672453645/f809176af93132c3db5f0a5019e96339.webp?size=160

const basicSeeds = [
  adminUser,
  nzapUser,
  users,
  userBios,
  lastMonthsVoting,
  lastMonthSuggestions,
  thisMonthsSuggestions,
  badgesToAdmin,
  badgesToUsers,
  badgeManagers,
];

export function seed() {
  wipeDB();

  let count = 0;
  for (const seedFunc of basicSeeds) {
    count++;
    console.log("ran seed", count);
    seedFunc();
  }
}

function wipeDB() {
  const tablesToDelete = [
    "User",
    "PlusVote",
    "PlusSuggestion",
    "PlusVote",
    "BadgeOwner",
    "BadgeManager",
  ];

  for (const table of tablesToDelete) {
    sql.prepare(`delete from "${table}"`).run();
  }
}

function adminUser() {
  db.users.upsert({
    discordDiscriminator: "4059",
    discordId: ADMIN_DISCORD_ID,
    discordName: "Sendou",
    twitch: "Sendou",
    youtubeId: "UCWbJLXByvsfQvTcR4HLPs5Q",
    discordAvatar: ADMIN_TEST_AVATAR,
    twitter: "sendouc",
  });
}

function nzapUser() {
  db.users.upsert({
    discordDiscriminator: "6227",
    discordId: NZAP_TEST_DISCORD_ID,
    discordName: "N-ZAP",
    twitch: null,
    youtubeId: null,
    discordAvatar: NZAP_TEST_AVATAR,
    twitter: null,
  });
}

function users() {
  new Array(500).fill(null).map(fakeUser).forEach(db.users.upsert);
}

function userBios() {
  for (let id = 3; id < 500; id++) {
    if (Math.random() < 0.25) continue; // 75% have bio

    sql.prepare(`UPDATE "User" SET bio = $bio WHERE id = $id`).run({
      id,
      bio: faker.lorem.paragraphs(
        faker.helpers.arrayElement([1, 1, 1, 2, 3, 4]),
        "\n\n"
      ),
    });
  }
}

function fakeUser() {
  return {
    discordAvatar: null,
    discordDiscriminator: String(faker.random.numeric(4)),
    discordId: String(faker.random.numeric(17)),
    discordName: uniqueDiscordName(),
    twitch: null,
    twitter: null,
    youtubeId: null,
  };
}

const usedNames = new Set<string>();
function uniqueDiscordName() {
  let result = faker.random.word();
  while (usedNames.has(result)) {
    result = faker.random.word();
  }
  usedNames.add(result);

  return result;
}

const idToPlusTier = (id: number) => {
  if (id < 30) return 1;
  if (id < 80) return 2;
  if (id <= 150) return 3;

  // these ids failed the voting
  if (id >= 200 && id <= 209) return 1;
  if (id >= 210 && id <= 219) return 2;
  if (id >= 220 && id <= 229) return 3;

  throw new Error("Invalid id - no plus tier");
};

function lastMonthsVoting() {
  const votes: UpsertManyPlusVotesArgs = [];

  const { month, year } = lastCompletedVoting(new Date());

  const fiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 1000);

  for (let id = 1; id < 151; id++) {
    if (id === 2) continue; // omit N-ZAP user for testing;

    votes.push({
      authorId: 1,
      month,
      year,
      score: 1,
      tier: idToPlusTier(id),
      validAfter: fiveMinutesAgo,
      votedId: id,
    });
  }

  for (let id = 200; id < 225; id++) {
    votes.push({
      authorId: 1,
      month,
      year,
      score: -1,
      tier: idToPlusTier(id),
      validAfter: fiveMinutesAgo,
      votedId: id,
    });
  }

  db.plusVotes.upsertMany(votes);
}

function lastMonthSuggestions() {
  const usersSuggested = [
    3, 10, 14, 90, 120, 140, 200, 201, 203, 204, 205, 216, 217, 218, 219, 220,
  ];
  const { month, year } = lastCompletedVoting(new Date());

  for (const id of usersSuggested) {
    db.plusSuggestions.create({
      authorId: 1,
      month,
      year,
      suggestedId: id,
      text: faker.lorem.lines(),
      tier: idToPlusTier(id),
    });
  }
}

function thisMonthsSuggestions() {
  const usersInPlus = db.users
    .findAll()
    .filter((u) => u.plusTier && u.id !== 1); // exclude admin
  const { month, year } = nextNonCompletedVoting(new Date());

  for (let userId = 150; userId < 190; userId++) {
    const amountOfSuggestions = faker.helpers.arrayElement([1, 1, 2, 3, 4]);

    for (let i = 0; i < amountOfSuggestions; i++) {
      const suggester = usersInPlus.shift();
      invariant(suggester);
      invariant(suggester.plusTier);

      db.plusSuggestions.create({
        authorId: suggester.id,
        month,
        year,
        suggestedId: userId,
        text: faker.lorem.lines(),
        tier: suggester.plusTier,
      });
    }
  }
}

function badgesToAdmin() {
  const availableBadgeIds = shuffle(
    sql
      .prepare(`select "id" from "Badge"`)
      .all()
      .map((b) => b.id)
  ).slice(0, 8) as number[];

  const badgesWithDuplicates = availableBadgeIds.flatMap((id) =>
    new Array(faker.helpers.arrayElement([1, 1, 1, 2, 3, 4]))
      .fill(null)
      .map(() => id)
  );

  for (const id of badgesWithDuplicates) {
    sql
      .prepare(
        `insert into "BadgeOwner" ("badgeId", "userId") values ($id, $userId)`
      )
      .run({ id, userId: 1 });
  }
}

function badgesToUsers() {
  const availableBadgeIds = shuffle(
    sql
      .prepare(`select "id" from "Badge"`)
      .all()
      .map((b) => b.id)
  );

  let userIds = sql
    .prepare(`select "id" from "User" where id != 2`) // no badges for N-ZAP
    .all()
    .map((u) => u.id) as number[];

  for (const id of availableBadgeIds) {
    userIds = shuffle(userIds);
    for (
      let i = 0;
      i <
      faker.datatype.number({
        min: 1,
        max: 24,
      });
      i++
    ) {
      const userToGetABadge = userIds.shift()!;
      sql
        .prepare(
          `insert into "BadgeOwner" ("badgeId", "userId") values ($id, $userId)`
        )
        .run({ id, userId: userToGetABadge });

      userIds.push(userToGetABadge);
    }
  }
}

function badgeManagers() {
  // make N-ZAP user manager of several badges
  for (let id = 1; id <= 10; id++) {
    sql
      .prepare(
        `insert into "BadgeManager" ("badgeId", "userId") values ($id, $userId)`
      )
      .run({ id, userId: 2 });
  }
}
