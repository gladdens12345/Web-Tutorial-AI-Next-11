import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// Initialize a new rate limiter instance.
// This configuration allows a maximum of 10 requests every 10 seconds per unique identifier.
export const rateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "ratelimit_heartbeat",
});