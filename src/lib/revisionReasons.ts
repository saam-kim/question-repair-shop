import type { RevisionReason } from '../types';

export const REVISION_REASONS: { id: RevisionReason; label: string }[] = [
  { id: 'CLARITY', label: '질문의 의미가 명확하도록 수정함' },
  { id: 'SINGLE_TOPIC', label: '한 문항에 한 가지 내용만 묻도록 수정함' },
  { id: 'REMOVE_LEADING', label: '특정 응답을 유도하지 않도록 수정함' },
  { id: 'SPECIFICITY', label: '표현을 구체적으로 수정함' },
  { id: 'EASIER_TO_ANSWER', label: '응답자가 답하기 쉽게 수정함' },
  { id: 'OTHER', label: '기타' },
];
