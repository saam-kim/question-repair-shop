import { Fragment, useState } from 'react';
import { ProgressBadge } from './ProgressBadge';
import { questionStatus, respondingStatus, feedbackReceivedStatus, revisionStatus } from '../lib/teamStatus';
import { getScaleTypeInfo } from '../lib/scaleTypes';
import { QUESTION_IDS } from '../types';
import type { Assignments, Team } from '../types';

export function TeamProgressTable({
  teams,
  assignments,
}: {
  teams: Record<string, Team>;
  assignments: Assignments;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = Object.entries(teams).sort((a, b) => a[1].teamNumber - b[1].teamNumber);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-slate-400">아직 입장한 조가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2 pr-4 font-medium">조</th>
            <th className="py-2 pr-4 font-medium">질문 작성</th>
            <th className="py-2 pr-4 font-medium">응답</th>
            <th className="py-2 pr-4 font-medium">피드백 도착</th>
            <th className="py-2 pr-4 font-medium">수리</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([teamId, team]) => {
            const isExpanded = expanded === teamId;
            const canPeek = Boolean(team.topic || team.questionsSubmittedAt);
            return (
              <Fragment key={teamId}>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-800">
                    <button
                      type="button"
                      disabled={!canPeek}
                      onClick={() => setExpanded(isExpanded ? null : teamId)}
                      className={`flex items-center gap-1.5 ${canPeek ? 'hover:text-blue-700' : 'cursor-default text-slate-800'}`}
                    >
                      {team.teamNumber}조 · {team.nickname}
                      {canPeek && <span className="text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</span>}
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBadge state={questionStatus(team)} />
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBadge state={respondingStatus(team, assignments, teamId)} />
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBadge state={feedbackReceivedStatus(teamId, assignments, teams)} />
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBadge state={revisionStatus(team)} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={5} className="px-4 py-4">
                      {team.topic && (
                        <p className="text-xs text-slate-500">
                          조사 주제: <span className="font-medium text-slate-700">{team.topic}</span>
                        </p>
                      )}
                      {team.questions ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                          {QUESTION_IDS.map((qid) => {
                            const q = team.questions?.[qid];
                            if (!q) return null;
                            return (
                              <div key={qid} className="rounded-lg border border-slate-200 bg-white p-3">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                  {getScaleTypeInfo(q.scaleType).label}
                                </span>
                                <p className="mt-1 text-sm text-slate-800">{q.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">아직 질문을 작성하지 않았습니다.</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
