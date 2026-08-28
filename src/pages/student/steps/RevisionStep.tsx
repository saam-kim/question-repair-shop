import { useState } from 'react';
import { submitRevisions, type RevisionInput } from '../../../firebase/db';
import { Card } from '../../../components/Card';
import { BottomActionBar } from '../../../components/BottomActionBar';
import { getFeedbackForQuestion, summarizeProblemTypes } from '../../../lib/feedbackUtils';
import { getProblemTypeInfo } from '../../../lib/problemTypes';
import { REVISION_REASONS } from '../../../lib/revisionReasons';
import { DEFAULT_LIKERT_LABELS } from '../../../lib/likertScale';
import { SCALE_TYPES } from '../../../lib/scaleTypes';
import type { QuestionId, RevisionReason, ScaleType, Team } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

interface RevisionDraft {
  text: string;
  scaleType: ScaleType;
  isCustomLikert: boolean;
  likertLabels: string[];
  hasOtherOption: boolean;
  unit: string;
  reasons: RevisionReason[];
}

function draftFromQuestion(team: Team, qid: QuestionId): RevisionDraft {
  const q = team.questions?.[qid];
  const hasCustomLabels = Boolean(q?.likertLabels && q.likertLabels.length === 5);
  return {
    text: q?.text ?? '',
    scaleType: q?.scaleType ?? 'LIKERT_5',
    isCustomLikert: hasCustomLabels,
    likertLabels: hasCustomLabels && q?.likertLabels ? [...q.likertLabels] : [...DEFAULT_LIKERT_LABELS],
    hasOtherOption: Boolean(q?.hasOtherOption),
    unit: q?.unit ?? '',
    reasons: [],
  };
}

function isDraftValid(d: RevisionDraft): boolean {
  if (!d.text.trim()) return false;
  if (d.scaleType === 'LIKERT_5' && d.isCustomLikert) {
    return d.likertLabels.every((l) => l.trim().length > 0);
  }
  return true;
}

export function RevisionStep({
  sessionId,
  teamId,
  myTeam,
  allTeams,
}: {
  sessionId: string;
  teamId: string;
  myTeam: Team;
  allTeams: Record<string, Team>;
}) {
  const [drafts, setDrafts] = useState<Record<QuestionId, RevisionDraft>>({
    q1: draftFromQuestion(myTeam, 'q1'),
    q2: draftFromQuestion(myTeam, 'q2'),
    q3: draftFromQuestion(myTeam, 'q3'),
  });
  const [submitting, setSubmitting] = useState(false);

  function updateDraft(qid: QuestionId, patch: Partial<RevisionDraft>) {
    setDrafts((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }

  function updateLikertLabel(qid: QuestionId, index: number, val: string) {
    setDrafts((prev) => {
      const labels = [...prev[qid].likertLabels];
      labels[index] = val;
      return { ...prev, [qid]: { ...prev[qid], likertLabels: labels } };
    });
  }

  function toggleReason(qid: QuestionId, reason: RevisionReason) {
    setDrafts((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        reasons: prev[qid].reasons.includes(reason)
          ? prev[qid].reasons.filter((r) => r !== reason)
          : [...prev[qid].reasons, reason],
      },
    }));
  }

  const allFilled = QIDS.every((qid) => isDraftValid(drafts[qid]));

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitRevisions(
        sessionId,
        teamId,
        Object.fromEntries(
          QIDS.map((qid) => {
            const d = drafts[qid];
            return [
              qid,
              {
                originalText: myTeam.questions?.[qid]?.text ?? '',
                revisedText: d.text.trim(),
                revisionReasons: d.reasons,
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
        ) as Record<QuestionId, RevisionInput>,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-slate-900">🔧 질문 수리하기</h1>
          <p className="mt-1 text-slate-500">받은 피드백을 참고해 질문을 다듬어보세요.</p>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {QIDS.map((qid, idx) => {
              const d = drafts[qid];
              const original = myTeam.questions?.[qid]?.text ?? '';
              const unchanged = d.text.trim() === original.trim();
              const issues = summarizeProblemTypes(getFeedbackForQuestion(allTeams, teamId, qid));
              return (
                <Card key={qid} className="flex flex-col p-5">
                  <p className="text-sm font-semibold text-blue-600">Q{idx + 1} · 수리 전</p>
                  <p className="mt-1 text-sm text-slate-500 line-through decoration-slate-300">{original}</p>

                  {issues.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {issues.map(({ type, count }) => {
                        const info = getProblemTypeInfo(type);
                        return (
                          <span
                            key={type}
                            className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600"
                          >
                            {info.severity === 'REQUIRED' ? '🔴' : '🟡'} {info.requiredRuleLabel ?? info.label}
                            {count > 1 ? ` ×${count}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <label className="mt-4 block text-sm font-semibold text-slate-700">수리 후</label>
                  <textarea
                    value={d.text}
                    onChange={(e) => updateDraft(qid, { text: e.target.value })}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                  />
                  {unchanged && (
                    <p className="mt-1.5 text-xs text-amber-600">아직 원래 질문과 같아요. 정말 수정이 필요 없는지 한 번 더 확인해보세요.</p>
                  )}

                  <p className="mt-4 text-xs font-semibold text-slate-500">응답 방식</p>
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

                  {d.scaleType === 'SHORT_ANSWER' && (
                    <div className="mt-3 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">단위 힌트 (선택)</label>
                      <input
                        value={d.unit}
                        onChange={(e) => updateDraft(qid, { unit: e.target.value })}
                        placeholder="예: 권, 시간, 명, 회 등"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <p className="mt-4 text-sm font-medium text-slate-600">무엇을 수정했나요?</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {REVISION_REASONS.map((r) => {
                      const selected = d.reasons.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleReason(qid, r.id)}
                          className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors
                            ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <BottomActionBar onClick={handleSubmit} disabled={!allFilled || submitting}>
        {submitting ? '제출하는 중...' : '수리 완료하고 제출하기'}
      </BottomActionBar>
    </div>
  );
}
