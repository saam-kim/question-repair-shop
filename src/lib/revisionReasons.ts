import type { RevisionReason } from '../types';

export const REVISION_REASONS: { id: RevisionReason; label: string }[] = [
  { id: 'CLARITY', label: '질문을 더 명확하게 수정함' },
  { id: 'SINGLE_TOPIC', label: '한 가지 내용만 묻도록 수정함' },
  { id: 'REMOVE_LEADING', label: '유도 표현을 제거함' },
  { id: 'SPECIFICITY', label: '표현을 구체적으로 수정함' },
  { id: 'EASIER_TO_ANSWER', label: '응답자가 답하기 쉽게 수정함' },
  { id: 'OTHER', label: '기타' },
];
