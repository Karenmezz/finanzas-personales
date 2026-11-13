export type UserProfile = { displayName: string; photo: string | null };
export const emptyProfile: UserProfile = { displayName: "", photo: null };
export function validProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as UserProfile;
  if (typeof profile.displayName !== "string" || !profile.displayName.trim() || profile.displayName.length > 60) return false;
  if (profile.photo === null) return true;
  if (typeof profile.photo !== "string" || profile.photo.length > 180000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(profile.photo)) return false;
  try { const binary = atob(profile.photo.split(",")[1]); return binary.charCodeAt(0) === 255 && binary.charCodeAt(1) === 216 && binary.charCodeAt(2) === 255 && binary.charCodeAt(binary.length - 2) === 255 && binary.charCodeAt(binary.length - 1) === 217; } catch { return false; }
}
export function greetingDate(now = new Date()) {
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(now).replace(",", "");
  return date.charAt(0).toUpperCase() + date.slice(1);
}
export function nextColombiaMidnight(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year,month,day] = date.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day+1,5));
}
