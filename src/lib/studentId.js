/**
 * Builds the Student ID: first name, capital first letter of the last name, TAS- and the permit number.
 * Kudas Gan with permit 177610 gives Kudas-G-TAS-177610.
 * This is the same rule as make_student_id in the database. The database one is the real one;
 * this copy only shows the student their ID while they fill in the form.
 */
export function makeStudentId(fullName, permitNumber) {
  const parts = String(fullName || '').trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length < 2) return '';
  const first = parts[0].replace(/[^\p{L}]/gu, '');
  const last = parts[parts.length - 1].replace(/[^\p{L}]/gu, '');
  const permit = String(permitNumber || '').replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
  if (!first || !last || !permit) return '';
  return `${first.charAt(0).toUpperCase()}${first.slice(1).toLowerCase()}-${last.charAt(0).toUpperCase()}-TAS-${permit}`;
}
