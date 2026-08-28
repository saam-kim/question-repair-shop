export type SessionStatus = 'LOBBY' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export type SessionPhase =
  | 'LOBBY'
  | 'QUESTION'
  | 'RESPONDING'
  | 'FEEDBACK_REVIEW'
  | 'REVISION'
  | 'RESULT'
  | 'ENDED';

export const PHASE_ORDER: SessionPhase[] = [
  'LOBBY',
  'QUESTION',
  'RESPONDING',
  'FEEDBACK_REVIEW',
  'REVISION',
  'RESULT',
  'ENDED',
];

export interface Session {
  sessionCode: string;
  status: SessionStatus;
  currentPhase: SessionPhase;
  createdAt: number;
  teacherUid: string;
  teamCounter?: number;
  pokemonPool?: string[];
  assignments?: Assignments;
}

export type QuestionId = 'q1' | 'q2' | 'q3';
export const QUESTION_IDS: QuestionId[] = ['q1', 'q2', 'q3'];

export type ScaleType = 'LIKERT_5' | 'ESSAY' | 'SHORT_ANSWER';

export interface QuestionItem {
  text: string;
  order: number;
  createdAt: number;
  scaleType: ScaleType;
  /** LIKERT_5일 때 커스텀 5개 척도 레이블 (미지정 시 기본 '전혀 그렇지 않다'~'매우 그렇다') */
  likertLabels?: string[];
  /** LIKERT_5일 때 '기타' 직접 입력 선택지 허용 여부 */
  hasOtherOption?: boolean;
  /** SHORT_ANSWER일 때 선택적으로 붙는 단위 힌트 (예: "권", "시간", "명") */
  unit?: string;
  /** 레거시 지원용 선택지 목록 */
  options?: string[];
}

export interface ResponseEntry {
  /** LIKERT_5는 숫자(1~5) 또는 "기타: [내용]", ESSAY/SHORT_ANSWER는 문자열 */
  value: number | string;
  respondedAt: number;
}

export type ProblemType =
  | 'NONE'
  | 'UNCLEAR'
  | 'DOUBLE_BARRELED'
  | 'OVERLAPPING_OPTIONS'
  | 'LEADING'
  | 'ANSWERING_DIFFICULT'
  | 'OTHER';

export interface FeedbackEntry {
  problemTypes: ProblemType[];
  comment: string;
  createdAt: number;
}

export type RevisionReason =
  | 'CLARITY'
  | 'SINGLE_TOPIC'
  | 'REMOVE_LEADING'
  | 'SPECIFICITY'
  | 'EASIER_TO_ANSWER'
  | 'OTHER';

export interface RevisionEntry {
  originalText: string;
  revisedText: string;
  revisionReasons: RevisionReason[];
  createdAt: number;
  scaleType: ScaleType;
  likertLabels?: string[];
  hasOtherOption?: boolean;
  unit?: string;
  options?: string[];
}

export interface Team {
  teamNumber: number;
  nickname: string;
  ownerUid: string;
  createdAt: number;
  topic?: string;
  questions?: Partial<Record<QuestionId, QuestionItem>>;
  questionsSubmittedAt?: number;
  responsesGiven?: Record<string, Partial<Record<QuestionId, ResponseEntry>>>;
  feedbackGiven?: Record<string, Partial<Record<QuestionId, FeedbackEntry>>>;
  respondingProgress?: Record<string, 'DONE'>;
  revisions?: Partial<Record<QuestionId, RevisionEntry>>;
  revisionsSubmittedAt?: number;
  lastActiveAt?: number;
}

export type TeamWithId = Team & { id: string };

export type Assignments = Record<string, string[]>;

export interface SessionData {
  session: Session;
  teams: Record<string, Team>;
  assignments?: Assignments;
}
