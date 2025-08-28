import cron from "node-cron";
import { cleanupExpiredListings } from "../jobs/tasks/cleanupExpiredListings.js";
import { priceDropNotify } from "../jobs/tasks/priceDropNotify.js";
import { digestEmailDaily } from "../jobs/tasks/digestEmailDaily.js";
import { trustScoreDaily } from "../jobs/tasks/trustScoreDaily.js";

export function startJobs() {
  // Every hour
  cron.schedule("0 * * * *", async () => {
    await cleanupExpiredListings().catch(console.error);
    await priceDropNotify().catch(console.error);
  });

  // Daily at 8am
  cron.schedule("0 8 * * *", async () => {
    await digestEmailDaily().catch(console.error);
    await trustScoreDaily().catch(console.error);
  });

  // You can add weekly tasks here if needed
  console.log("⏱️ cron jobs scheduled");
}
