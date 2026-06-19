import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

let connection: IORedis | null = null;
let queue: Queue | null = null;

export function getBikeTripQueue() {
  if (!connection) {
    connection = new IORedis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null
    });
  }

  if (!queue) {
    queue = new Queue("bike-trip-jobs", { connection });
  }

  return queue;
}
