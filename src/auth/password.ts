import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  const key = process.env.SESSION_SECRET ?? "missing-session-secret";
  return createHmac("sha256", key).update(value).digest();
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword || !process.env.SESSION_SECRET) return false;
  return timingSafeEqual(digest(username), digest(expectedUsername)) && timingSafeEqual(digest(password), digest(expectedPassword));
}
