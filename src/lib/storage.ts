const STUDENT_KEY = 'qrs_student_identity';
const TEACHER_KEY = 'qrs_teacher_identity';

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

export const studentStorage = {
  read: () => readJSON<StudentIdentity>(STUDENT_KEY),
  write: (identity: StudentIdentity) => localStorage.setItem(STUDENT_KEY, JSON.stringify(identity)),
  clear: () => localStorage.removeItem(STUDENT_KEY),
};

export const teacherStorage = {
  read: () => readJSON<TeacherIdentity>(TEACHER_KEY),
  write: (identity: TeacherIdentity) => localStorage.setItem(TEACHER_KEY, JSON.stringify(identity)),
  clear: () => localStorage.removeItem(TEACHER_KEY),
};

/**
 * 교사 대시보드 "미리보기(리허설)" 패널이 실제 학생 접속 저장소(studentStorage)와
 * 완전히 분리된 자리에 미리보기 조의 teamId를 기억해두기 위한 저장소.
 * 세션 + 슬롯 번호로 키를 나눠, 같은 브라우저 안에서도 조끼리 서로 섞이지 않게 한다.
 */
export const previewStorage = {
  read: (sessionId: string, slot: number) => readJSON<{ teamId: string }>(`qrs_preview_${sessionId}_${slot}`),
  write: (sessionId: string, slot: number, teamId: string) =>
    localStorage.setItem(`qrs_preview_${sessionId}_${slot}`, JSON.stringify({ teamId })),
  clear: (sessionId: string, slot: number) => localStorage.removeItem(`qrs_preview_${sessionId}_${slot}`),
};
