import { useState } from 'react';
import { submitRevisions, type RevisionInput } from '../../../firebase/db';
import { Card } from '../../../components/Card';
import { BottomActionBar } from '../../../components/BottomActionBar';
import { getFeedbackForQuestion, summarizeProblemTypes } from '../../../lib/feedbackUtils';
import { getProblemTypeInfo } from '../../../lib/problemTypes';
import { REVISION_REASONS } from '../../../lib/revisionReasons';
import { SCALE_TYPES, MIN_CHOICE_OPTIONS, MAX_CHOICE_OPTIONS } from '../../../lib/scaleTypes';
import type { QuestionId, RevisionReason, ScaleType, Team } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

interface RevisionDraft {
  text: string;
  scaleType: ScaleType;
  options: string[];
  unit: string;
  reasons: RevisionReason[];
}

function draftFromQuestion(team: Team, qid: QuestionId): RevisionDraft {
  const q = team.questions?.[qid];
  return {
    text: q?.text ?? '',
    scaleType: q?.scaleType ?? 'LIKERT_5',
    options: q?.options && q.options.length >= MIN_CHOICE_OPTIONS ? q.options : ['', ''],
    unit: q?.unit ?? '',
    reasons: [],
  };
}

function isDraftValid(d: RevisionDraft): boolean {
  if (!d.text.trim()) return false;
  if (d.scaleType === 'MULTIPLE_CHOICE') {
    return d.options.map((o) => o.trim()).filter(Boolean).length >= MIN_CHOICE_OPTIONS;
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
                options:
                  d.scaleType === 'MULTIPLE_CHOICE'
                    ? d.options.map((o) => o.trim()).filter(Boolean)
                    : undefined,
                unit: d.scaleType === 'NUMBER' && d.unit.trim() ? d.unit.trim() : undefined,
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
                    rows={4}
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

                  {d.scaleType === 'MULTIPLE_CHOICE' && (
                    <div className="mt-2 space-y-1.5">
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
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
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
