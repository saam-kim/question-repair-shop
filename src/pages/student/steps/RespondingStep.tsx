import { useState } from 'react';
import { submitResponseAndFeedback, markRespondingDone } from '../../../firebase/db';
import { LikertButtons } from '../../../components/LikertButtons';
import { EssayAnswerInput } from '../../../components/EssayAnswerInput';
import { ShortAnswerInput } from '../../../components/ShortAnswerInput';
import { BottomActionBar } from '../../../components/BottomActionBar';
import { Card } from '../../../components/Card';
import { getApplicableProblemTypes } from '../../../lib/problemTypes';
import { formatLikertResponse } from '../../../lib/likertScale';
import type { ProblemType, QuestionId, Team } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

export function RespondingStep({
  sessionId,
  teamId,
  targetTeamId,
  targetTeam,
  progressIndex,
  progressTotal,
}: {
  sessionId: string;
  teamId: string;
  targetTeamId: string;
  targetTeam: Team;
  progressIndex: number;
  progressTotal: number;
}) {
  const [qIndex, setQIndex] = useState(0);
  const [stage, setStage] = useState<'ANSWER' | 'FEEDBACK'>('ANSWER');
  const [value, setValue] = useState<number | string | null>(null);
  const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const qid = QIDS[qIndex];
  const question = targetTeam?.questions?.[qid];
  const questionText = question?.text ?? '';
  const scaleType = question?.scaleType ?? 'LIKERT_5';

  function toggleProblemType(id: ProblemType) {
    setProblemTypes((prev) => {
      if (id === 'NONE') return prev.includes('NONE') ? [] : ['NONE'];
      const withoutNone = prev.filter((p) => p !== 'NONE');
      return withoutNone.includes(id) ? withoutNone.filter((p) => p !== id) : [...withoutNone, id];
    });
  }

  function resetForNextQuestion() {
    setValue(null);
    setProblemTypes([]);
    setComment('');
    setStage('ANSWER');
  }

  async function handleFeedbackSubmit() {
    if (value === null || String(value).trim() === '') return;
    setSaving(true);
    try {
      await submitResponseAndFeedback(sessionId, teamId, targetTeamId, qid, value, {
        problemTypes: problemTypes.length ? problemTypes : ['NONE'],
        comment: comment.trim(),
      });
      if (qIndex < QIDS.length - 1) {
        setQIndex((i) => i + 1);
        resetForNextQuestion();
      } else {
        await markRespondingDone(sessionId, teamId, targetTeamId);
      }
    } finally {
      setSaving(false);
    }
  }

  function respondedSummary(): string {
    if (value === null || String(value).trim() === '') return '';
    if (scaleType === 'LIKERT_5') {
      return formatLikertResponse(value, question?.likertLabels);
    }
    if (scaleType === 'SHORT_ANSWER') {
      return `${value}${question?.unit ? ` (${question.unit})` : ''}`;
    }
    const str = String(value);
    return str.length > 35 ? `"${str.slice(0, 35)}..."` : `"${str}"`;
  }

  const isAnswerValid = value !== null && String(value).trim().length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-slate-100 bg-white px-10 py-3 text-sm text-slate-500">
        {progressIndex + 1}/{progressTotal}번째 조의 질문에 응답하고 있습니다 · {targetTeam?.teamNumber}조 · {targetTeam?.nickname}
        {targetTeam?.topic && <span className="ml-2 text-slate-400">({targetTeam.topic})</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {stage === 'ANSWER' ? (
          <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold text-blue-600">Q{qIndex + 1}</p>
              <p className="mt-3 text-2xl font-medium leading-relaxed text-slate-900">{questionText}</p>
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
              {scaleType === 'ESSAY' && (
                <EssayAnswerInput
                  value={typeof value === 'string' ? value : ''}
                  onChange={setValue}
                />
              )}
              {(scaleType === 'SHORT_ANSWER' || (scaleType as string) === 'NUMBER' || (scaleType as string) === 'MULTIPLE_CHOICE') && (
                <ShortAnswerInput
                  value={value}
                  onChange={setValue}
                  unit={question?.unit}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold text-blue-600">Q{qIndex + 1}에 답하면서 불편했던 점이 있었나요?</p>
              <p className="mt-3 text-2xl font-medium leading-relaxed text-slate-900">{questionText}</p>
              <p className="mt-4 text-sm font-medium text-slate-500">방금 응답: <span className="text-blue-700">{respondedSummary()}</span></p>
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
                      className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors
                        ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                    >
                      {pt.label}
                    </button>
                  );
                })}
              </div>

              <Card className="mt-5 p-4">
                <label className="text-sm font-medium text-slate-600">구체적인 이유를 한 줄로 남겨주세요 (선택)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="예: 두 가지를 한 번에 묻는 것 같아요."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                />
              </Card>
            </div>
          </div>
        )}
      </div>

      <BottomActionBar
        onClick={() => (stage === 'ANSWER' ? setStage('FEEDBACK') : handleFeedbackSubmit())}
        disabled={stage === 'ANSWER' ? !isAnswerValid : saving}
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
