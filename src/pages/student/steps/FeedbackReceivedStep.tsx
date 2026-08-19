import { Card } from '../../../components/Card';
import { getProblemTypeInfo } from '../../../lib/problemTypes';
import { getFeedbackForQuestion, splitByProblem, summarizeProblemTypes } from '../../../lib/feedbackUtils';
import type { QuestionId, Team } from '../../../types';

const QIDS: QuestionId[] = ['q1', 'q2', 'q3'];

export function FeedbackReceivedStep({
  myTeam,
  teamId,
  allTeams,
}: {
  myTeam: Team;
  teamId: string;
  allTeams: Record<string, Team>;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-10 py-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">우리 조 질문 수리하기</h1>
        <p className="mt-1 text-slate-500">다른 조가 우리 질문에 응답하며 남긴 피드백입니다.</p>

        <div className="mt-5 space-y-5">
          {QIDS.map((qid, idx) => {
            const entries = getFeedbackForQuestion(allTeams, teamId, qid);
            const { noProblem, issues: issueEntries } = splitByProblem(entries);
            const issueSummary = summarizeProblemTypes(entries);
            const comments = issueEntries.map((e) => e.entry.comment).filter(Boolean);

            return (
              <Card key={qid} className="p-6">
                <p className="text-sm font-semibold text-blue-600">Q{idx + 1}</p>
                <p className="mt-1 text-lg font-medium text-slate-900">{myTeam.questions?.[qid]?.text}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                    🟢 문제 없음: {noProblem.length}명
                  </span>
                  {issueSummary.map(({ type, count }) => {
                    const info = getProblemTypeInfo(type);
                    return (
                      <span
                        key={type}
                        className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600"
                        title={info.description}
                      >
                        {info.severity === 'REQUIRED' ? '🔴' : '🟡'} {info.requiredRuleLabel ?? info.label}
                        {count > 1 ? ` · ${count}명` : ''}
                      </span>
                    );
                  })}
                </div>

                {comments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {comments.map((comment, i) => (
                      <p key={i} className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700">
                        <span className="italic">"{comment}"</span>
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <p className="mt-8 rounded-xl bg-blue-50 px-5 py-4 text-center text-blue-700">
          잠시 후 선생님이 질문 수리 단계로 넘어가면 이 피드백을 참고해 질문을 고칠 수 있어요.
        </p>
      </div>
    </div>
  );
}
