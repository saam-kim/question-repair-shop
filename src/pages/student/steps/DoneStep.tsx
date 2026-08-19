import { Card } from '../../../components/Card';
import { getFeedbackForQuestion, countProblemTypes } from '../../../lib/feedbackUtils';
import { getProblemTypeInfo } from '../../../lib/problemTypes';
import { REVISION_REASONS } from '../../../lib/revisionReasons';
import type { ProblemType, QuestionId, Team } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

export function DoneStep({
  myTeam,
  teamId,
  allTeams,
}: {
  myTeam: Team;
  teamId: string;
  allTeams: Record<string, Team>;
}) {
  const overallCounts: Partial<Record<ProblemType, number>> = {};
  QIDS.forEach((qid) => {
    const counts = countProblemTypes(getFeedbackForQuestion(allTeams, teamId, qid));
    (Object.keys(counts) as ProblemType[]).forEach((pt) => {
      overallCounts[pt] = (overallCounts[pt] ?? 0) + (counts[pt] ?? 0);
    });
  });
  const topProblem = (Object.entries(overallCounts) as [ProblemType, number][]).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="text-4xl" aria-hidden>🎉</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">질문 수리 완료!</h1>
          <p className="mt-1 text-slate-500">우리가 만든 질문은 응답자에게 어떤 점이 어려웠을까요?</p>
        </div>

        {topProblem && (
          <Card className="mt-6 p-5 text-center">
            <p className="text-sm font-medium text-slate-500">가장 많이 받은 피드백</p>
            <p className="mt-1 text-lg font-semibold text-rose-600">
              🔴 {getProblemTypeInfo(topProblem[0]).label} ({topProblem[1]}회)
            </p>
          </Card>
        )}

        <div className="mt-6 space-y-4">
          {QIDS.map((qid, idx) => {
            const revision = myTeam.revisions?.[qid];
            if (!revision) return null;
            return (
              <Card key={qid} className="p-6">
                <p className="text-sm font-semibold text-blue-600">Q{idx + 1}</p>
                <div className="mt-2 flex flex-col gap-2">
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 line-through decoration-slate-300">
                    {revision.originalText}
                  </p>
                  <p className="text-center text-slate-400">↓</p>
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-800">
                    {revision.revisedText}
                  </p>
                </div>
                {revision.revisionReasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {revision.revisionReasons.map((r) => (
                      <span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        🟢 {REVISION_REASONS.find((rr) => rr.id === r)?.label}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="mt-8 border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-lg font-medium text-blue-900">
            좋은 질문은 처음부터 완벽하게 만들어지는 것이 아니라,
            <br />
            다른 사람의 응답과 피드백을 통해 더 좋아집니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
