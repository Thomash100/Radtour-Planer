import { Worker } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  "bike-trip-jobs",
  async (job) => {
    if (job.name === "sync-osm-poi") {
      console.log("OSM POI sync placeholder executed.", job.data);
      return { synced: 0, source: "local-seed" };
    }

    if (job.name === "send-lead") {
      console.log("Lead dispatch placeholder executed.", job.data);
      return { sent: true };
    }

    console.log("Unknown job received.", job.name, job.data);
    return { ignored: true };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} (${job.name}) completed.`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id ?? "unknown"} failed:`, error);
});

async function shutdown() {
  await worker.close();
  await connection.quit();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("BikeTripHub worker listening on queue bike-trip-jobs.");
