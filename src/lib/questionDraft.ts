import { SCALE_TYPES } from './scaleTypes';
import { REVISION_REASONS } from './revisionReasons';
import { QUESTION_IDS, type QuestionId, type RevisionReason, type ScaleType } from '../types';
import type { QuestionInput } from '../firebase/db';

interface FormDraft {
  text: string;
  scaleType: ScaleType;
  isCustomLikert: boolean;
  likertLabels: string[];
  hasOtherOption: boolean;
  options: string[];
  unit: string;
}

export interface QuestionDraft extends FormDraft { intentionalFlaw: boolean }
export interface RevisionDraft extends FormDraft { reasons: RevisionReason[] }

function isFormDraft(value: unknown): value is FormDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as FormDraft;
  return typeof draft.text === 'string' && SCALE_TYPES.some((type) => type.id === draft.scaleType)
    && typeof draft.isCustomLikert === 'boolean' && typeof draft.hasOtherOption === 'boolean'
    && typeof draft.unit === 'string'
    && Array.isArray(draft.likertLabels) && draft.likertLabels.length === 5
    && draft.likertLabels.every((label) => typeof label === 'string')
    && Array.isArray(draft.options) && draft.options.length <= 5
    && draft.options.every((option) => typeof option === 'string');
}

function isDraftRecord<T>(value: unknown, validate: (draft: unknown) => draft is T): value is Record<QuestionId, T> {
  return Boolean(value && typeof value === 'object'
    && QUESTION_IDS.every((qid) => validate((value as Record<string, unknown>)[qid])));
}

// Option lists may have 2–5 entries; never compare their length with a new draft's default.
export function isQuestionDraftRecord(value: unknown): value is Record<QuestionId, QuestionDraft> {
  return isDraftRecord(value, (draft): draft is QuestionDraft =>
    isFormDraft(draft) && typeof (draft as QuestionDraft).intentionalFlaw === 'boolean');
}

export function isRevisionDraftRecord(value: unknown): value is Record<QuestionId, RevisionDraft> {
  return isDraftRecord(value, (draft): draft is RevisionDraft => {
    if (!isFormDraft(draft)) return false;
    const reasons = (draft as RevisionDraft).reasons;
    return Array.isArray(reasons) && reasons.every((reason) => REVISION_REASONS.some((item) => item.id === reason));
  });
}

export function isDraftValid(draft: FormDraft): boolean {
  if (!draft.text.trim() || draft.text.length > 2000) return false;
  if (draft.scaleType === 'MULTI_SELECT') {
    const options = draft.options.map((option) => option.trim());
    if (options.length < 2 || options.length > 5 || options.some((option) => !option || option.length > 160)) return false;
    if (new Set(options).size !== options.length) return false;
  }
  if (draft.scaleType === 'LIKERT_5' && draft.isCustomLikert) {
    return draft.likertLabels.length === 5 && draft.likertLabels.every((label) => label.trim().length > 0 && label.length <= 160);
  }
  return draft.scaleType !== 'SHORT_ANSWER' || draft.unit.length <= 40;
}

export function questionInputFromDraft(draft: FormDraft): QuestionInput {
  return {
    text: draft.text.trim(),
    scaleType: draft.scaleType,
    likertLabels: draft.scaleType === 'LIKERT_5' && draft.isCustomLikert ? draft.likertLabels.map((label) => label.trim()) : undefined,
    hasOtherOption: ['LIKERT_5', 'MULTI_SELECT'].includes(draft.scaleType) ? draft.hasOtherOption : undefined,
    options: draft.scaleType === 'MULTI_SELECT' ? draft.options.map((option) => option.trim()) : undefined,
    unit: draft.scaleType === 'SHORT_ANSWER' && draft.unit.trim() ? draft.unit.trim() : undefined,
  };
}
