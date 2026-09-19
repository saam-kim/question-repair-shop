import { Notice } from '../../../components/Notice';
import { useLocalDraft } from '../../../hooks/useLocalDraft';
import { useState } from 'react';
import { submitResponseAndFeedback, markRespondingDone } from '../../../firebase/db';
import { LikertButtons } from '../../../components/LikertButtons';
import { YesNoButtons } from '../../../components/YesNoButtons';
import { EssayAnswerInput } from '../../../components/EssayAnswerInput';
import { ShortAnswerInput } from '../../../components/ShortAnswerInput';
import { BottomActionBar } from '../../../components/BottomActionBar';
import { Card } from '../../../components/Card';
import { getApplicableProblemTypes } from '../../../lib/problemTypes';
import { formatLikertResponse } from '../../../lib/likertScale';
import type { ProblemType, QuestionId, Team } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

interface RespondingProps {
  sessionId: string;
  teamId: string;
  targetTeamId: string;
  targetTeam: Team;
  myTeam?: Team;
  progressIndex: number;
  progressTotal: number;
}
interface AnswerDraft {
  stage: 'ANSWER' | 'FEEDBACK';
  value: number | string | null;
  problemTypes: ProblemType[];
  comment: string;
}
function validDraft(value: unknown): value is AnswerDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as AnswerDraft;
  return (
    ['ANSWER', 'FEEDBACK'].includes(d.stage) &&
    (d.value === null || typeof d.value === 'string' || typeof d.value === 'number') &&
    Array.isArray(d.problemTypes) &&
    d.problemTypes.every((p) => typeof p === 'string') &&
    typeof d.comment === 'string'
  );
}
export function RespondingStep(props: RespondingProps) {
  const firstMissing = QIDS.findIndex(
    (q) =>
      !props.myTeam?.responsesGiven?.[props.targetTeamId]?.[q] ||
      !props.myTeam?.feedbackGiven?.[props.targetTeamId]?.[q],
  );
  const [index, setIndex] = useState(Math.max(0, firstMissing));
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  if (firstMissing === -1) {
    return (
      <div className="mx-auto w-full max-w-xl p-8">
        <h1 className="text-xl font-semibold">질문 3개의 응답이 저장되었습니다</h1>
        <p className="mt-3 text-sm text-slate-500">완료 버튼을 눌러 다음 조로 이동하세요.</p>
        {finishError && (
          <div className="mt-4">
            <Notice>완료 처리를 저장하지 못했습니다. 다시 시도해주세요.</Notice>
          </div>
        )}
        <button
          className="btn-primary mt-6"
          disabled={finishing}
          onClick={async () => {
            setFinishing(true);
            setFinishError(false);
            try {
              await markRespondingDone(props.sessionId, props.teamId, props.targetTeamId);
            } catch {
              setFinishError(true);
            } finally {
              setFinishing(false);
            }
          }}
        >
          {finishing ? '저장하는 중…' : '응답 완료'}
        </button>
      </div>
    );
  }
  const qIndex = Math.max(index, firstMissing);
  return (
    <RespondingQuestion
      key={props.targetTeamId + QIDS[qIndex]}
      {...props}
      qIndex={qIndex}
      onNext={() => setIndex(qIndex + 1)}
    />
  );
}
function RespondingQuestion({
  sessionId,
  teamId,
  targetTeamId,
  targetTeam,
  progressIndex,
  progressTotal,
  qIndex,
  onNext,
}: RespondingProps & { qIndex: number; onNext: () => void }) {
  const [draft, setDraft, clearDraft] = useLocalDraft<AnswerDraft>(
    `${sessionId}_${teamId}_response_${targetTeamId}_${QIDS[qIndex]}`,
    () => ({ stage: 'ANSWER', value: null, problemTypes: [], comment: '' }),
    validDraft,
  );
  const { stage, value, problemTypes, comment } = draft;
  const setStage = (stage: AnswerDraft['stage']) => setDraft((d) => ({ ...d, stage }));
  const setValue = (value: AnswerDraft['value']) => setDraft((d) => ({ ...d, value }));
  const setComment = (comment: string) => setDraft((d) => ({ ...d, comment }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qid = QIDS[qIndex];
  const question = targetTeam?.questions?.[qid];
  const questionText = question?.text ?? '';
  const scaleType = question?.scaleType ?? 'LIKERT_5';

  function toggleProblemType(id: ProblemType) {
    setDraft((d) => {
      const prev = d.problemTypes;
      if (id === 'NONE') return { ...d, problemTypes: prev.includes('NONE') ? [] : ['NONE'] };
      const other = prev.filter((p) => p !== 'NONE');
      return {
        ...d,
        problemTypes: other.includes(id) ? other.filter((p) => p !== id) : [...other, id],
      };
    });
  }

  async function handleFeedbackSubmit() {
    if (value === null || !isAnswerValid) return;
    setError(null);
    setSaving(true);
    try {
      await submitResponseAndFeedback(sessionId, teamId, targetTeamId, qid, value, {
        problemTypes: problemTypes.length ? problemTypes : ['NONE'],
        comment: comment.trim(),
      });
      if (qIndex < QIDS.length - 1) {
        clearDraft();
        onNext();
      } else {
        await markRespondingDone(sessionId, teamId, targetTeamId);
        clearDraft();
      }
    } catch {
      setError('응답을 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  function respondedSummary(): string {
    if (value === null || String(value).trim() === '') return '';
    if (scaleType === 'YES_NO') return String(value);
    if (scaleType === 'LIKERT_5') {
      return formatLikertResponse(value, question?.likertLabels);
    }
    if (scaleType === 'SHORT_ANSWER') {
      return `${value}${question?.unit ? ` (${question.unit})` : ''}`;
    }
    const str = String(value);
    return str.length > 35 ? `"${str.slice(0, 35)}..."` : `"${str}"`;
  }

  const isAnswerValid =
    scaleType === 'YES_NO'
      ? value === '예' || value === '아니요'
      : scaleType === 'LIKERT_5'
        ? (typeof value === 'number' && value >= 1 && value <= 5) ||
          (Boolean(question?.hasOtherOption) &&
            typeof value === 'string' &&
            value.startsWith('기타: ') &&
            value.slice(4).trim().length > 0)
        : value !== null && String(value).trim().length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-slate-100 bg-white px-5 sm:px-8 py-3 text-sm text-slate-500">
        {progressIndex + 1}/{progressTotal}번째 조의 질문에 응답하고 있습니다 ·{' '}
        {targetTeam?.teamNumber}조 · {targetTeam?.nickname}
        {targetTeam?.topic && <span className="ml-2 text-slate-400">({targetTeam.topic})</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
        {stage === 'ANSWER' ? (
          <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold text-blue-600">Q{qIndex + 1}</p>
              <p className="mt-3 text-2xl font-medium leading-relaxed text-slate-900">
                {questionText}
              </p>
            </div>
            <div className="flex flex-col justify-center">
              {scaleType === 'LIKERT_5' && (
                <LikertButtons
                  value={value}
                  onChange={setValue}
                  customLabels={question?.likertLabels}
                  hasOtherOption={question?.hasOtherOption}
                />
              )}
              {scaleType === 'YES_NO' && <YesNoButtons value={value} onChange={setValue} />}
              {scaleType === 'ESSAY' && (
                <EssayAnswerInput
                  value={typeof value === 'string' ? value : ''}
                  onChange={setValue}
                />
              )}
              {(scaleType === 'SHORT_ANSWER' ||
                (scaleType as string) === 'NUMBER' ||
                (scaleType as string) === 'MULTIPLE_CHOICE') && (
                <ShortAnswerInput value={value} onChange={setValue} unit={question?.unit} />
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold text-blue-600">
                Q{qIndex + 1}에 답하면서 불편했던 점이 있었나요?
              </p>
              <p className="mt-3 text-2xl font-medium leading-relaxed text-slate-900">
                {questionText}
              </p>
              <p className="mt-4 text-sm font-medium text-slate-500">
                방금 응답: <span className="text-blue-700">{respondedSummary()}</span>
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex flex-wrap gap-2">
                {getApplicableProblemTypes(scaleType).map((pt) => {
                  const selected = problemTypes.includes(pt.id);
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => toggleProblemType(pt.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors
                        ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                    >
                      {pt.label}
                    </button>
                  );
                })}
              </div>

              <Card className="mt-5 p-4">
                <label className="text-sm font-medium text-slate-600">
                  구체적인 이유를 한 줄로 남겨주세요 (선택)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="예: 두 가지를 한 번에 묻는 것 같아요."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                />
              </Card>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-5 pb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <BottomActionBar
        onClick={() => (stage === 'ANSWER' ? setStage('FEEDBACK') : handleFeedbackSubmit())}
        disabled={saving || !isAnswerValid}
      >
        {stage === 'ANSWER'
          ? '다음'
          : saving
            ? '저장하는 중...'
            : qIndex < QIDS.length - 1
              ? '다음 질문 →'
              : '응답 완료'}
      </BottomActionBar>
    </div>
  );
}
