import { z } from "zod";
import * as repo from "./notifications.repo.js";

const RecentSchema = z.object({
  viewerId: z.number().int(),
  limit: z.coerce.number().int().min(1).max(20).default(3)
});

export async function recent(payload) {
  const { viewerId, limit } = RecentSchema.parse(payload);
  return repo.getRecent({ viewerId, limit });
}
