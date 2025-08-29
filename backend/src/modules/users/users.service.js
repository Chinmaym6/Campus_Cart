import { z } from "zod";
import * as repo from "./users.repo.js";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_m: z.number().min(0).max(100000).optional()
});

export async function setMyLocation(userId, payload) {
  const { latitude, longitude, accuracy_m } = LocationSchema.parse(payload);
  return repo.updateLastLocation(userId, { latitude, longitude, accuracy_m });
}
