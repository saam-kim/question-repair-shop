import { useState } from 'react';
import { submitQuestions, setTeamTopic } from '../../../firebase/db';
import { Card } from '../../../components/Card';
import { BottomActionBar } from '../../../components/BottomActionBar';
import { LIKERT_LABELS, LIKERT_VALUES } from '../../../lib/likertScale';
import { SCALE_TYPES, MIN_CHOICE_OPTIONS, MAX_CHOICE_OPTIONS } from '../../../lib/scaleTypes';
import type { QuestionId, ScaleType } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

interface QuestionDraft {
  text: string;
  scaleType: ScaleType;
  options: string[];
  unit: string;
}

function emptyDraft(): QuestionDraft {
  return { text: '', scaleType: 'LIKERT_5', options: ['', ''], unit: '' };
}

function isDraftValid(d: QuestionDraft): boolean {
  if (!d.text.trim()) return false;
  if (d.scaleType === 'MULTIPLE_CHOICE') {
    return d.options.map((o) => o.trim()).filter(Boolean).length >= MIN_CHOICE_OPTIONS;
  }
  return true;
}

export function QuestionsStep({
  sessionId,
  teamId,
  topic,
}: {
  sessionId: string;
  teamId: string;
  topic: string;
}) {
  const [drafts, setDrafts] = useState<Record<QuestionId, QuestionDraft>>({
    q1: emptyDraft(),
    q2: emptyDraft(),
    q3: emptyDraft(),
  });
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allFilled = QIDS.every((qid) => isDraftValid(drafts[qid]));

  function updateDraft(qid: QuestionId, patch: Partial<QuestionDraft>) {
    setDrafts((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }

  function updateOption(qid: QuestionId, index: number, text: string) {
    setDrafts((prev) => {
      const options = [...prev[qid].options];
      options[index] = text;
      return { ...prev, [qid]: { ...prev[qid], options } };
    });
  }

  function addOption(qid: QuestionId) {
    setDrafts((prev) => {
      if (prev[qid].options.length >= MAX_CHOICE_OPTIONS) return prev;
      return { ...prev, [qid]: { ...prev[qid], options: [...prev[qid].options, ''] } };
    });
  }

  function removeOption(qid: QuestionId, index: number) {
    setDrafts((prev) => {
      if (prev[qid].options.length <= MIN_CHOICE_OPTIONS) return prev;
      return { ...prev, [qid]: { ...prev[qid], options: prev[qid].options.filter((_, i) => i !== index) } };
    });
  }

  async function handleFinalSubmit() {
    setSubmitting(true);
    try {
      await submitQuestions(
        sessionId,
        teamId,
        Object.fromEntries(
          QIDS.map((qid) => {
            const d = drafts[qid];
            return [
              qid,
              {
                text: d.text.trim(),
                scaleType: d.scaleType,
                options:
                  d.scaleType === 'MULTIPLE_CHOICE'
                    ? d.options.map((o) => o.trim()).filter(Boolean)
                    : undefined,
                unit: d.scaleType === 'NUMBER' && d.unit.trim() ? d.unit.trim() : undefined,
              },
            ];
          }),
        ) as Record<QuestionId, { text: string; scaleType: ScaleType; options?: string[]; unit?: string }>,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (reviewing) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="text-2xl font-bold text-slate-900">제출 전 확인해주세요</h1>
            <p className="mt-1 text-slate-500">제출하면 다른 조가 이 질문지에 응답하게 됩니다.</p>

            <Card className="mt-6 p-6">
              <p className="text-sm font-medium text-slate-500">조사 주제</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{topic}</p>

              <div className="mt-5 space-y-4">
                {QIDS.map((qid, idx) => {
                  const d = drafts[qid];
                  const scaleInfo = SCALE_TYPES.find((s) => s.id === d.scaleType);
                  return (
                    <div key={qid} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-blue-600">Q{idx + 1}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          {scaleInfo?.label}
                        </span>
                      </div>
                      <p className="mt-1 text-base text-slate-800">{d.text}</p>
                      {d.scaleType === 'MULTIPLE_CHOICE' && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {d.options
                            .map((o) => o.trim())
                            .filter(Boolean)
                            .map((o, i) => (
                              <span key={i} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                                {o}
                              </span>
                            ))}
                        </div>
                      )}
                      {d.scaleType === 'NUMBER' && d.unit.trim() && (
                        <p className="mt-1.5 text-xs text-slate-400">단위: {d.unit.trim()}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        <BottomActionBar
          onClick={handleFinalSubmit}
          disabled={submitting}
          secondary={
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="rounded-xl border border-slate-300 px-6 py-4 text-lg font-medium text-slate-600 hover:bg-slate-50"
            >
              수정하기
            </button>
          }
        >
          {submitting ? '제출하는 중...' : '우리 조 질문지 제출하기'}
        </BottomActionBar>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">질문 3개 만들기</h1>
              <p className="mt-1 text-slate-500">
                조사 주제 <span className="font-medium text-slate-700">"{topic}"</span>에 대한 질문을 만들어보세요.
                {' '}
                <button
                  type="button"
                  onClick={() => setTeamTopic(sessionId, teamId, '')}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  주제 다시 정하기
                </button>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5 pt-1 text-xs text-slate-500">
              {LIKERT_VALUES.map((v) => (
                <span key={v} className="rounded-full bg-slate-100 px-2.5 py-1">
                  {v}. {LIKERT_LABELS[v]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {QIDS.map((qid, idx) => {
              const d = drafts[qid];
              return (
                <Card key={qid} className="p-5">
                  <label className="text-sm font-semibold text-blue-600">Q{idx + 1}</label>
                  <textarea
                    value={d.text}
                    onChange={(e) => updateDraft(qid, { text: e.target.value })}
                    placeholder="예: 나는 학교에서 이루어지는 수업에 전반적으로 만족한다."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-blue-500"
                  />

                  <p className="mt-3 text-xs font-semibold text-slate-500">응답 방식</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SCALE_TYPES.map((st) => {
                      const selected = d.scaleType === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => updateDraft(qid, { scaleType: st.id })}
                          title={st.description}
                          className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors
                            ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>

                  {d.scaleType === 'MULTIPLE_CHOICE' && (
                    <div className="mt-3 space-y-1.5">
                      {d.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input
                            value={opt}
                            onChange={(e) => updateOption(qid, i, e.target.value)}
                            placeholder={`선택지 ${i + 1}`}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                          {d.options.length > MIN_CHOICE_OPTIONS && (
                            <button
                              type="button"
                              onClick={() => removeOption(qid, i)}
                              className="shrink-0 text-slate-400 hover:text-rose-500"
                              aria-label="선택지 삭제"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {d.options.length < MAX_CHOICE_OPTIONS && (
                        <button
                          type="button"
                          onClick={() => addOption(qid)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          + 선택지 추가
                        </button>
                      )}
                    </div>
                  )}

                  {d.scaleType === 'NUMBER' && (
                    <input
                      value={d.unit}
                      onChange={(e) => updateDraft(qid, { unit: e.target.value })}
                      placeholder="단위 (선택, 예: 권)"
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <BottomActionBar onClick={() => setReviewing(true)} disabled={!allFilled}>
        제출 전 확인하기
      </BottomActionBar>
    </div>
  );
}
