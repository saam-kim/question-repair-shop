import { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { getProblemTypeInfo } from '../../lib/problemTypes';
import { REVISION_REASONS } from '../../lib/revisionReasons';
import type { ProblemType, QuestionId, Team } from '../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

interface RevisionCase {
  key: string;
  teamLabel: string;
  qLabel: string;
  original: string;
  revised: string;
  reasons: string[];
  feedbackComments: string[];
}

export function TeacherResults({ teams }: { teams: Record<string, Team> }) {
  const problemCounts = useMemo(() => {
    const counts: Partial<Record<ProblemType, number>> = {};
    Object.values(teams).forEach((team) => {
      Object.values(team.feedbackGiven ?? {}).forEach((byQuestion) => {
        Object.values(byQuestion).forEach((entry) => {
          entry.problemTypes.forEach((pt) => {
            if (pt === 'NONE') return;
            counts[pt] = (counts[pt] ?? 0) + 1;
          });
        });
      });
    });
    return (Object.entries(counts) as [ProblemType, number][]).sort((a, b) => b[1] - a[1]);
  }, [teams]);

  const maxCount = problemCounts[0]?.[1] ?? 1;

  const cases = useMemo(() => {
    const result: RevisionCase[] = [];
    Object.entries(teams)
      .sort((a, b) => a[1].teamNumber - b[1].teamNumber)
      .forEach(([teamId, team]) => {
        QIDS.forEach((qid, idx) => {
          const revision = team.revisions?.[qid];
          if (!revision) return;
          const comments: string[] = [];
          Object.values(teams).forEach((other) => {
            const fb = other.feedbackGiven?.[teamId]?.[qid];
            if (fb?.comment) comments.push(fb.comment);
          });
          result.push({
            key: `${teamId}_${qid}`,
            teamLabel: `${team.teamNumber}조`,
            qLabel: `Q${idx + 1}`,
            original: revision.originalText,
            revised: revision.revisedText,
            reasons: revision.revisionReasons.map((r) => REVISION_REASONS.find((rr) => rr.id === r)?.label ?? r),
            feedbackComments: comments,
          });
        });
      });
    return result;
  }, [teams]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = cases.find((c) => c.key === selectedKey) ?? cases[0] ?? null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900">우리 반 질문지 실험 결과</h2>
        <p className="mt-1 text-sm text-slate-500">가장 많이 발견된 문제</p>

        {problemCounts.length === 0 ? (
          <p className="mt-4 text-slate-400">아직 집계된 피드백이 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {problemCounts.map(([pt, count]) => {
              const info = getProblemTypeInfo(pt);
              return (
                <div key={pt}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {info.severity === 'REQUIRED' ? '🔴' : '🟡'} {info.label}
                    </span>
                    <span className="text-slate-500">{count}회</span>
                  </div>
                  <div className="mt-1 h-3 w-full rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-blue-500"
                      style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900">질문 수리 사례</h2>
        <p className="mt-1 text-sm text-slate-500">학생들에게 보여줄 사례를 선택하세요 (익명 처리됨).</p>

        {cases.length === 0 ? (
          <p className="mt-4 text-slate-400">아직 제출된 수리 사례가 없습니다.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {cases.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedKey(c.key)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-colors
                    ${selected?.key === c.key ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  {c.teamLabel} {c.qLabel}
                </button>
              ))}
            </div>

            {selected && (
              <div className="mt-6 rounded-xl border border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-500">수리 전</p>
                <p className="mt-1 text-lg text-slate-700 line-through decoration-slate-300">{selected.original}</p>

                {selected.feedbackComments.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium">응답자 피드백</p>
                    {selected.feedbackComments.map((c, i) => (
                      <p key={i} className="mt-1 italic">"{c}"</p>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-center text-slate-400">↓</p>

                <p className="mt-2 text-sm font-semibold text-slate-500">수리 후</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">{selected.revised}</p>

                {selected.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.reasons.map((r) => (
                      <span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        🟢 {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
