import { getResponseSummary } from '../lib/responseSummary';
import type { QuestionId, QuestionItem, Team } from '../types';

export function QuestionResponseSummary({ teams, targetId, qid, question }: {
  teams: Record<string, Team>;
  targetId: string;
  qid: QuestionId;
  question?: QuestionItem;
}) {
  const summary = getResponseSummary(teams, targetId, qid, question);
  return (
    <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4" aria-label="익명 응답 집계">
      <p className="text-sm font-semibold text-slate-800">친구들의 응답 · {summary.total}개 조</p>
      <p className="mt-1 text-xs text-slate-500">조별 기기에서 제출한 응답이며, 어떤 조가 답했는지는 표시하지 않습니다.</p>
      {summary.total === 0 && <p className="mt-3 text-sm text-slate-500">아직 응답이 없습니다.</p>}
      {summary.counts.length > 0 && (
        <div className="mt-3 space-y-2">
          {summary.counts.map(({ label, count }) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 text-slate-700">{label}</span>
              <span className="shrink-0 font-semibold text-blue-700">{count}개 조</span>
            </div>
          ))}
        </div>
      )}
      {summary.written.length > 0 && (
        <div className="mt-3 border-t border-blue-100 pt-3">
          <p className="text-xs font-semibold text-slate-600">직접 쓴 응답과 ‘기타’ 이유</p>
          <ul className="mt-2 space-y-2">
            {summary.written.map((answer, i) => <li key={i} className="break-words rounded-lg bg-white px-3 py-2 text-sm text-slate-700">{answer}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
