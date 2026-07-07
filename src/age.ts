/**
 * Human age at a moment in time: "2y 4mo", "7mo", or "18d" for newborns.
 * Dates are compared in UTC calendar terms; birthdate is YYYY-MM-DD.
 */
export function ageAt(birthdate: string, at: Date): string {
  const [by, bm, bd] = birthdate.split("-").map(Number);
  let years = at.getUTCFullYear() - by;
  let months = at.getUTCMonth() + 1 - bm;
  let days = at.getUTCDate() - bd;
  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 0)).getUTCDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0 || (years === 0 && months < 0)) return "";
  if (years === 0 && months === 0) return `${days}d`;
  if (years === 0) return `${months}mo`;
  return months === 0 ? `${years}y` : `${years}y ${months}mo`;
}
