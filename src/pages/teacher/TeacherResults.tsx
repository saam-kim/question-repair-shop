import { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { getProblemTypeInfo } from '../../lib/problemTypes';
import { REVISION_REASONS } from '../../lib/revisionReasons';
import { teacherFeedbackSummary } from '../../lib/teacherFeedbackSummary';
import { getLikertLabels } from '../../lib/likertScale';
import { getScaleTypeInfo } from '../../lib/scaleTypes';
import { QUESTION_IDS, type ProblemType, type QuestionItem, type RevisionEntry, type Team } from '../../types';

function QuestionContent({ text, question }: { text: string; question: QuestionItem | RevisionEntry }) {
  const options = question.scaleType === 'LIKERT_5' ? getLikertLabels(question.likertLabels)
    : question.scaleType === 'YES_NO' ? ['예', '아니요']
      : question.scaleType === 'MULTI_SELECT' ? question.options ?? [] : [];
  return <>
    <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold leading-7">{text}</p>
    <p className="mt-3 text-xs text-slate-500">{getScaleTypeInfo(question.scaleType).label}{question.unit ? ` · 단위: ${question.unit}` : ''}</p>
    {options.length > 0 && <ol className="mt-2 space-y-1 text-sm text-slate-600">
      {options.map((option, i) => <li key={i}>{i + 1}. {option}</li>)}
      {question.hasOtherOption && <li>기타 (직접 입력)</li>}
    </ol>}
  </>;
}

function RevisionComparison({ team, questionId }: { team: Team; questionId: typeof QUESTION_IDS[number] }) {
  const original = team.questions?.[questionId];
  const revision = team.revisions?.[questionId];
  if (!original) return null;
  return <div className="mt-4 space-y-4">
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500">수리 전</p>
        <QuestionContent text={revision?.originalText ?? original.text} question={original} />
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-semibold text-blue-700">수리 후</p>
        {revision ? <QuestionContent text={revision.revisedText} question={revision} />
          : <p className="mt-2 text-sm text-slate-500">아직 수리한 질문을 제출하지 않았습니다.</p>}
      </div>
    </div>
    {revision && <div>
      <p className="text-xs font-semibold text-slate-500">학생들이 설명한 수정 이유</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {revision.revisionReasons.length ? revision.revisionReasons.map((reason) => <span key={reason} className="rounded-full bg-white px-3 py-1 text-xs text-blue-700">
          {REVISION_REASONS.find((item) => item.id === reason)?.label ?? reason}
        </span>) : <p className="text-sm text-slate-500">선택한 수정 이유가 없습니다.</p>}
      </div>
    </div>}
  </div>;
}

export function TeacherResults({ teams }: { teams: Record<string, Team> }) {
  const summary = useMemo(() => teacherFeedbackSummary(teams), [teams]);
  const [selectedProblem, setSelectedProblem] = useState<ProblemType | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const problem = summary.find((entry) => entry.problemType === selectedProblem);
  const info = problem ? getProblemTypeInfo(problem.problemType) : null;
  const maxCount = summary[0]?.questions.length ?? 1;
  const cases = Object.entries(teams).sort((a, b) => a[1].teamNumber - b[1].teamNumber)
    .flatMap(([teamId, team]) => QUESTION_IDS.filter((qid) => team.revisions?.[qid]).map((qid) => ({ key: `${teamId}_${qid}`, teamId, team, qid })));
  const currentCase = cases.find((item) => item.key === selectedCase) ?? cases[0];

  return <div className="mt-6 space-y-6">
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">우리 반 질문, 함께 살펴볼 점</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">문항별 응답 조의 30% 이상이 지적한 유형만 표시합니다. 유형을 누르면 문항을, 문항을 누르면 수리 전후를 볼 수 있습니다.</p>
      <p className="mt-2 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
        학생들의 평가는 검토할 단서입니다. 오류가 확정되었다는 뜻은 아니며, 실제 문항과 수정 내용을 보고 교사가 판단해주세요.
        집계 단위는 응답 조이며, ‘문제 없음’ 응답과 피드백을 남기지 않은 응답도 분모에 포함합니다. 한 문항이 여러 유형에 포함될 수 있습니다.
      </p>
      {!summary.length ? <p className="mt-5 text-sm text-slate-500">현재 문항별 응답 조의 30% 이상이 지적한 유형이 없습니다. 응답이 없는 문항은 집계하지 않습니다.</p>
        : <div className="mt-5 space-y-2">
          {summary.map((entry) => <button key={entry.problemType} type="button" aria-expanded={selectedProblem === entry.problemType}
            onClick={() => { setSelectedProblem(selectedProblem === entry.problemType ? null : entry.problemType); setSelectedQuestion(null); }}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedProblem === entry.problemType ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
            <span className="flex items-start justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-700">{getProblemTypeInfo(entry.problemType).label}</span>
              <span className="shrink-0 font-semibold text-blue-700">{entry.questions.length}문항</span>
            </span>
            <span className="mt-3 block h-1.5 rounded-full bg-slate-100" aria-hidden="true">
              <span className="block h-1.5 rounded-full bg-blue-500" style={{ width: `${entry.questions.length / maxCount * 100}%` }} />
            </span>
          </button>)}
        </div>}
      {problem && info && <section className="mt-5 rounded-2xl border border-blue-200 bg-slate-50 p-4 sm:p-5" aria-label="선택한 유형의 문항">
        <h3 className="text-sm font-semibold text-slate-900">{info.label} · {problem.questions.length}문항</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">확인할 기준: {info.description}</p>
        <p className="mt-1 text-xs leading-6 text-slate-500">수리 후에도 이 문제가 남아 있는지, 수정하면서 새로운 문제가 생기지 않았는지 살펴보세요.</p>
        <div className="mt-4 space-y-3">
          {problem.questions.map((item) => {
            const expanded = selectedQuestion === item.key;
            return <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <button type="button" aria-expanded={expanded} onClick={() => setSelectedQuestion(expanded ? null : item.key)} className="w-full text-left">
                <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-blue-700">{item.team.teamNumber}조 · {item.team.nickname} Q{item.questionId.slice(1)}</span>
                  <span className="text-slate-500">{item.responseCount}개 응답 조 중 {item.pointedOutCount}개 조 지적 · {Math.round(item.pointedOutCount / item.responseCount * 100)}%</span>
                </span>
                <span className="mt-2 block whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800">{item.team.questions?.[item.questionId]?.text}</span>
                <span className="mt-2 block text-xs text-blue-600">{expanded ? '수리 전후 접기 ↑' : '수리 전후 확인 ↓'}</span>
              </button>
              {expanded && <>
                {item.team.questions?.[item.questionId]?.intentionalFlaw && <p className="mt-3 text-xs text-amber-700">학생들이 ‘친구들이 고쳐 볼 문항’으로 지정한 질문입니다.</p>}
                {item.comments.length > 0 && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-semibold">이 유형을 지적한 응답 조의 의견</p>
                  {item.comments.map((comment, i) => <p key={i} className="mt-2 whitespace-pre-wrap break-words leading-6">{comment}</p>)}
                </div>}
                <RevisionComparison team={item.team} questionId={item.questionId} />
              </>}
            </div>;
          })}
        </div>
      </section>}
    </Card>
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">질문 수리 사례</h2>
      <p className="mt-1 text-sm text-slate-500">30% 기준과 관계없이 제출된 모든 수리 사례를 비교할 수 있습니다.</p>
      {!cases.length ? <p className="mt-4 text-sm text-slate-500">아직 제출된 수리 사례가 없습니다.</p> : <>
        <div className="mt-4 flex flex-wrap gap-2">{cases.map((item) => <button key={item.key} type="button" aria-pressed={currentCase?.key === item.key}
          onClick={() => setSelectedCase(item.key)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${currentCase?.key === item.key ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
          {item.team.teamNumber}조 Q{item.qid.slice(1)}
        </button>)}</div>
        {currentCase && <>
          <RevisionComparison team={currentCase.team} questionId={currentCase.qid} />
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {Object.values(teams).flatMap((reviewer) => {
              const comment = reviewer.feedbackGiven?.[currentCase.teamId]?.[currentCase.qid]?.comment;
              return comment ? [comment] : [];
            }).map((comment, i) => <p key={i} className="rounded-xl bg-slate-50 p-3 whitespace-pre-wrap break-words">{comment}</p>)}
          </div>
        </>}
      </>}
    </Card>
  </div>;
}
