import type { SessionPhase } from '../types';

export const PHASE_STAGES: { phase: SessionPhase; label: string }[] = [
  { phase: 'QUESTION', label: '질문 만들기' },
  { phase: 'RESPONDING', label: '질문 응답하기' },
  { phase: 'FEEDBACK_REVIEW', label: '피드백 확인' },
  { phase: 'REVISION', label: '질문 수리하기' },
  { phase: 'RESULT', label: '결과 확인' },
];

export function phaseStageIndex(phase: SessionPhase): number {
  return PHASE_STAGES.findIndex((s) => s.phase === phase);
}

export function phaseStepLabel(phase: SessionPhase): string {
  const idx = phaseStageIndex(phase);
  if (idx === -1) return '';
  return `진행 ${idx + 1}/${PHASE_STAGES.length}`;
}
