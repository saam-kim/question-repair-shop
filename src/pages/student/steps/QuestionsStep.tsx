import { useState } from 'react';
import { submitQuestions, setTeamTopic, type QuestionInput } from '../../../firebase/db';
import { Card } from '../../../components/Card';
import { BottomActionBar } from '../../../components/BottomActionBar';
import { DEFAULT_LIKERT_LABELS, LIKERT_VALUES, getLikertLabels } from '../../../lib/likertScale';
import { SCALE_TYPES } from '../../../lib/scaleTypes';
import type { QuestionId, ScaleType } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

interface QuestionDraft {
  text: string;
  scaleType: ScaleType;
  isCustomLikert: boolean;
  likertLabels: string[];
  hasOtherOption: boolean;
  unit: string;
}

function emptyDraft(): QuestionDraft {
  return {
    text: '',
    scaleType: 'LIKERT_5',
    isCustomLikert: false,
    likertLabels: [...DEFAULT_LIKERT_LABELS],
    hasOtherOption: false,
    unit: '',
  };
}

function isDraftValid(d: QuestionDraft): boolean {
  if (!d.text.trim()) return false;
  if (d.scaleType === 'LIKERT_5' && d.isCustomLikert) {
    return d.likertLabels.every((l) => l.trim().length > 0);
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

  function updateLikertLabel(qid: QuestionId, index: number, val: string) {
    setDrafts((prev) => {
      const labels = [...prev[qid].likertLabels];
      labels[index] = val;
      return { ...prev, [qid]: { ...prev[qid], likertLabels: labels } };
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
                likertLabels:
                  d.scaleType === 'LIKERT_5' && d.isCustomLikert
                    ? d.likertLabels.map((l) => l.trim())
                    : undefined,
                hasOtherOption: d.scaleType === 'LIKERT_5' ? d.hasOtherOption : undefined,
                unit: d.scaleType === 'SHORT_ANSWER' && d.unit.trim() ? d.unit.trim() : undefined,
              },
            ];
          }),
        ) as Record<QuestionId, QuestionInput>,
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
                  const labels = getLikertLabels(d.isCustomLikert ? d.likertLabels : undefined);
                  return (
                    <div key={qid} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-blue-600">Q{idx + 1}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {scaleInfo?.label}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-medium text-slate-800">{d.text}</p>

                      {d.scaleType === 'LIKERT_5' && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                          {labels.map((lbl, i) => (
                            <span key={i} className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                              {i + 1}. {lbl}
                            </span>
                          ))}
                          {d.hasOtherOption && (
                            <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                              + 기타(직접 작성)
                            </span>
                          )}
                        </div>
                      )}

                      {d.scaleType === 'ESSAY' && (
                        <p className="mt-2 text-xs text-slate-500">✍️ 서술형 주관식 문항</p>
                      )}

                      {d.scaleType === 'SHORT_ANSWER' && (
                        <p className="mt-2 text-xs text-slate-500">
                          📝 단답형 주관식 {d.unit.trim() ? `(단위: ${d.unit.trim()})` : ''}
                        </p>
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
                조사 주제 <span className="font-medium text-slate-700">"{topic}"</span>에 대한 질문을 만들어보세요.{' '}
                <button
                  type="button"
                  onClick={() => setTeamTopic(sessionId, teamId, '')}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  주제 다시 정하기
                </button>
              </p>
            </div>
            <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 pt-1 text-xs text-slate-500 md:flex">
              {LIKERT_VALUES.map((v) => (
                <span key={v} className="rounded-full bg-slate-100 px-2.5 py-1">
                  {v}. {DEFAULT_LIKERT_LABELS[v - 1]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {QIDS.map((qid, idx) => {
              const d = drafts[qid];
              return (
                <Card key={qid} className="flex flex-col p-5">
                  <label className="text-sm font-semibold text-blue-600">Q{idx + 1}</label>
                  <textarea
                    value={d.text}
                    onChange={(e) => updateDraft(qid, { text: e.target.value })}
                    placeholder="예: 나는 학교에서 이루어지는 수업에 전반적으로 만족한다."
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
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

                  {d.scaleType === 'LIKERT_5' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">5점 척도 선택지</span>
                        <button
                          type="button"
                          onClick={() => updateDraft(qid, { isCustomLikert: !d.isCustomLikert })}
                          className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                        >
                          {d.isCustomLikert ? '기본 척도로 변경' : '✏️ 척도 직접 수정'}
                        </button>
                      </div>

                      {d.isCustomLikert ? (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[11px] text-slate-400">
                            질문에 적합하게 5개 구간/척도명을 작성하세요 (예: 없음, 1~3회 등):
                          </p>
                          {d.likertLabels.map((lbl, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="w-4 shrink-0 text-center text-xs font-bold text-slate-400">
                                {i + 1}
                              </span>
                              <input
                                value={lbl}
                                onChange={(e) => updateLikertLabel(qid, i, e.target.value)}
                                placeholder={DEFAULT_LIKERT_LABELS[i]}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {DEFAULT_LIKERT_LABELS.map((lbl, i) => (
                            <span key={i} className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600 border border-slate-200">
                              {i + 1}. {lbl}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 border-t border-slate-200/80 pt-2">
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={d.hasOtherOption}
                            onChange={(e) => updateDraft(qid, { hasOtherOption: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>'기타' (직접 입력) 선택지 추가</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {d.scaleType === 'ESSAY' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      💡 응답자가 자유롭게 생각을 적을 수 있는 긴 서술형 주관식 입력란이 제공됩니다.
                    </div>
                  )}

                  {d.scaleType === 'SHORT_ANSWER' && (
                    <div className="mt-3 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">단위 힌트 (선택)</label>
                      <input
                        value={d.unit}
                        onChange={(e) => updateDraft(qid, { unit: e.target.value })}
                        placeholder="예: 권, 시간, 명, 회 등"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-400">
                        응답자가 짧은 단어나 숫자 형태로 간결하게 답변합니다.
                      </p>
                    </div>
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
