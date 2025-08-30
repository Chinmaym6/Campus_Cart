import { z } from "zod";
import * as repo from "./roommate.repo.js";

const MatchesSchema = z.object({
  viewerId: z.number().int(),
  limit: z.coerce.number().int().min(1).max(12).default(3)
});

export async function getMatches(payload) {
  const { viewerId, limit } = MatchesSchema.parse(payload);
  return repo.findNearYou({ viewerId, limit });
}
