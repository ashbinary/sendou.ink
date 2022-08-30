export const abilityCodes = [
  { name: "AD", type: "CLOTHES_ONLY" },
  { name: "BRU", type: "STACKABLE" },
  { name: "CB", type: "HEAD_ONLY" },
  { name: "DR", type: "SHOES_ONLY" },
  { name: "H", type: "CLOTHES_ONLY" },
  { name: "IA", type: "STACKABLE" },
  { name: "IRU", type: "STACKABLE" },
  { name: "ISM", type: "STACKABLE" },
  { name: "ISS", type: "STACKABLE" },
  { name: "LDE", type: "HEAD_ONLY" },
  { name: "NS", type: "CLOTHES_ONLY" },
  { name: "OG", type: "HEAD_ONLY" },
  { name: "OS", type: "SHOES_ONLY" },
  { name: "QR", type: "STACKABLE" },
  { name: "QSJ", type: "STACKABLE" },
  { name: "RES", type: "STACKABLE" },
  { name: "RP", type: "CLOTHES_ONLY" },
  { name: "RSU", type: "STACKABLE" },
  { name: "SCU", type: "STACKABLE" },
  { name: "SJ", type: "SHOES_ONLY" },
  { name: "SPU", type: "STACKABLE" },
  { name: "SRU", type: "STACKABLE" },
  { name: "SS", type: "STACKABLE" },
  { name: "SSU", type: "STACKABLE" },
  { name: "T", type: "CLOTHES_ONLY" },
  { name: "TI", type: "CLOTHES_ONLY" },
] as const;

export const abilitiesShort = abilityCodes.map((ability) => ability.name);
