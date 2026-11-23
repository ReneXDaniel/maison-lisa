/** Full years between a YYYY-MM-DD birth date and `at`. Returns null when unparseable. */
export function ageInYears(dob: string, at = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = at.getUTCFullYear() - y;
  const beforeBirthday = at.getUTCMonth() + 1 < mo || (at.getUTCMonth() + 1 === mo && at.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}
