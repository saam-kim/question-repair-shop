const STUDENT_KEY = 'qrs_student_identity';
const TEACHER_KEY = 'qrs_teacher_identity';

/** UI hint only; Firestore independently checks the authenticated owner. */
export function belongsToThisBrowser(ownerUid: string | undefined, uid: string | null): boolean {
  return Boolean(uid && ownerUid === uid);
}

export interface StudentIdentity {
  sessionId: string;
  teamId: string;
  sessionCode: string;
}

export interface TeacherIdentity {
  sessionId: string;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Firebase identity still authorizes the current page. */ }
}
function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* Storage may be unavailable on a shared device. */ }
}
export const studentStorage = {
  read: () => readJSON<StudentIdentity>(STUDENT_KEY),
  write: (identity: StudentIdentity) => writeJSON(STUDENT_KEY, identity),
  clear: () => remove(STUDENT_KEY),
};
export const teacherStorage = {
  read: () => readJSON<TeacherIdentity>(TEACHER_KEY),
  write: (identity: TeacherIdentity) => writeJSON(TEACHER_KEY, identity),
  clear: () => remove(TEACHER_KEY),
};
