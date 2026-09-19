import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import {
  setTeamTopic,
  submitQuestions,
  submitResponseAndFeedback,
  markRespondingDone,
  submitRevisions,
  startClass,
  advancePhase,
  writeAssignments,
  type QuestionInput,
  type RevisionInput,
} from '../../firebase/db';
import { createRehearsal, closeRehearsal } from '../../lib/rehearsalStore';
import { assignReviewers, MIN_TEAMS_FOR_ASSIGNMENT } from '../../lib/assignmentAlgorithm';
import {
  SAMPLE_TOPICS,
  SAMPLE_QUESTION_SPECS,
  sampleResponseValue,
  sampleFeedbackForQuestion,
} from '../../lib/rehearsalSampleData';
import { PreviewPane } from './PreviewPane';
import { LoadingScreen } from '../../components/LoadingScreen';
import { PhaseIndicator } from '../../components/PhaseIndicator';
import { QUESTION_IDS } from '../../types';
import type { QuestionId, SessionPhase } from '../../types';

const SLOTS = [1, 2, 3, 4];

export function RehearsalOverlay({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const [sessionId, setSessionId] = useState(createRehearsal);
  const { data } = useSession(sessionId);
  const [activeSlot, setActiveSlot] = useState(1);
  const slotTeamIds: Record<number, string> = { 1: 'team1', 2: 'team2', 3: 'team3', 4: 'team4' };
  const [busy, setBusy] = useState(false);
  function handleReset() {
    closeRehearsal(sessionId);
    setSessionId(createRehearsal());
    setActiveSlot(1);
  }
  function handleClose() {
    closeRehearsal(sessionId);
    onClose();
  }

  if (!data)
    return (
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-canvas"
      >
        <LoadingScreen />
      </dialog>
    );

  const { session, teams, assignments = {} } = data;
  const teamEntries = Object.entries(teams);
  const submittedTeamIds = teamEntries.filter(([, t]) => t.questionsSubmittedAt).map(([id]) => id);

  async function handlePhaseAction() {
    setBusy(true);
    try {
      if (session.currentPhase === 'LOBBY') {
        await startClass(sessionId);
      } else if (session.currentPhase === 'QUESTION') {
        const assignmentResult = assignReviewers(submittedTeamIds);
        await writeAssignments(sessionId, assignmentResult);
        await advancePhase(sessionId, 'RESPONDING');
      } else {
        const nextPhase: Record<string, SessionPhase> = {
          RESPONDING: 'FEEDBACK_REVIEW',
          FEEDBACK_REVIEW: 'REVISION',
          REVISION: 'RESULT',
        };
        const next = nextPhase[session.currentPhase];
        if (next) await advancePhase(sessionId, next);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoFill() {
    setBusy(true);
    try {
      const jobs: Promise<void>[] = [];

      if (session.currentPhase === 'QUESTION') {
        SLOTS.forEach((slot, i) => {
          const teamId = slotTeamIds[slot];
          const team = teamId ? teams[teamId] : undefined;
          if (!teamId || !team || team.questionsSubmittedAt) return;
          jobs.push(
            (async () => {
              if (!team.topic)
                await setTeamTopic(sessionId, teamId, SAMPLE_TOPICS[i % SAMPLE_TOPICS.length]);
              await submitQuestions(
                sessionId,
                teamId,
                Object.fromEntries(
                  QUESTION_IDS.map((qid) => {
                    const spec = SAMPLE_QUESTION_SPECS[qid];
                    return [
                      qid,
                      {
                        text: spec.text,
                        scaleType: spec.scaleType,
                        likertLabels: spec.likertLabels,
                        hasOtherOption: spec.hasOtherOption,
                        unit: spec.unit,
                      },
                    ];
                  }),
                ) as Record<QuestionId, QuestionInput>,
              );
            })(),
          );
        });
      } else if (session.currentPhase === 'RESPONDING') {
        SLOTS.forEach((slot) => {
          const teamId = slotTeamIds[slot];
          const team = teamId ? teams[teamId] : undefined;
          if (!teamId || !team) return;
          const targets = assignments[teamId] ?? [];
          targets.forEach((targetId) => {
            if (team.respondingProgress?.[targetId] === 'DONE') return;
            const targetTeam = teams[targetId];
            if (!targetTeam) return;

            // targetId 조의 입장에서 내가 몇 번째 리뷰어인지 판별
            const allReviewersForTarget = Object.entries(assignments)
              .filter(([, tList]) => tList.includes(targetId))
              .map(([reviewerId]) => reviewerId);
            const reviewerIndex = Math.max(0, allReviewersForTarget.indexOf(teamId));

            jobs.push(
              (async () => {
                for (const qid of QUESTION_IDS) {
                  const q = targetTeam.questions?.[qid];
                  if (!q) continue;
                  const value = sampleResponseValue(q.scaleType, q.likertLabels, q.unit);
                  const feedback = sampleFeedbackForQuestion(qid, reviewerIndex);
                  await submitResponseAndFeedback(
                    sessionId,
                    teamId,
                    targetId,
                    qid,
                    value,
                    feedback,
                  );
                }
                await markRespondingDone(sessionId, teamId, targetId);
              })(),
            );
          });
        });
      } else if (session.currentPhase === 'REVISION') {
        SLOTS.forEach((slot) => {
          const teamId = slotTeamIds[slot];
          const team = teamId ? teams[teamId] : undefined;
          if (!teamId || !team || team.revisionsSubmittedAt) return;
          jobs.push(
            (async () => {
              await submitRevisions(
                sessionId,
                teamId,
                Object.fromEntries(
                  QUESTION_IDS.map((qid) => {
                    const q = team.questions?.[qid];
                    let revisedText = q?.text ?? '';
                    let reasons: RevisionInput['revisionReasons'] = ['CLARITY'];

                    if (qid === 'q1') {
                      revisedText = q?.text ?? '';
                      reasons = [];
                    } else if (qid === 'q2') {
                      revisedText = '나는 이 주제 관련 활동에 얼마나 자주 참여하나요?';
                      reasons = ['SINGLE_TOPIC', 'CLARITY'];
                    } else if (qid === 'q3') {
                      revisedText =
                        '최근 1주일 동안 이 활동에 참여한 총 시간(단위: 시간)을 적어주세요.';
                      reasons = ['SPECIFICITY', 'EASIER_TO_ANSWER'];
                    }

                    return [
                      qid,
                      {
                        originalText: q?.text ?? '',
                        revisedText,
                        revisionReasons: reasons,
                        scaleType: q?.scaleType ?? 'LIKERT_5',
                        likertLabels: q?.likertLabels,
                        hasOtherOption: q?.hasOtherOption,
                        unit: q?.unit,
                      },
                    ];
                  }),
                ) as Record<QuestionId, RevisionInput>,
              );
            })(),
          );
        });
      }

      await Promise.all(jobs);
    } finally {
      setBusy(false);
    }
  }

  const phaseActionLabel: Partial<Record<SessionPhase, string>> = {
    LOBBY: '질문 만들기 시작',
    QUESTION: '응답 배정하고 시작하기',
    RESPONDING: '피드백 확인 단계로',
    FEEDBACK_REVIEW: '질문 수리 시작',
    REVISION: '전체 결과 보기',
  };
  const canAdvance =
    session.currentPhase === 'LOBBY'
      ? teamEntries.length > 0
      : session.currentPhase === 'QUESTION'
        ? submittedTeamIds.length >= MIN_TEAMS_FOR_ASSIGNMENT
        : true;
  const showAutoFill = ['QUESTION', 'RESPONDING', 'REVISION'].includes(session.currentPhase);

  const sortedSlots = [...SLOTS].sort((a, b) => {
    const ta = teams[slotTeamIds[a] ?? '']?.teamNumber ?? a + 999;
    const tb = teams[slotTeamIds[b] ?? '']?.teamNumber ?? b + 999;
    return ta - tb;
  });

  return (
    <dialog
      ref={dialogRef}
      aria-label="수업 리허설"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      className="fixed inset-0 z-50 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col border-0 bg-canvas p-0"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-8 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <p className="shrink-0 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
            수업 리허설
          </p>
          <div className="hidden min-w-[480px] max-w-2xl flex-1 xl:block">
            <PhaseIndicator currentPhase={session.currentPhase} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showAutoFill && (
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={busy}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              예시로 자동 채우기
            </button>
          )}
          {phaseActionLabel[session.currentPhase] && (
            <button
              type="button"
              onClick={handlePhaseAction}
              disabled={busy || !canAdvance}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
            >
              {phaseActionLabel[session.currentPhase]}
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </header>

      <p className="bg-blue-50 px-8 py-2 text-xs text-blue-800">
        연습용 공간입니다. 실제 수업과 학생 기록에는 반영되지 않으며, 닫으면 연습 내용이 사라집니다.
      </p>
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-100 bg-white px-8 py-3">
        {sortedSlots.map((slot) => {
          const team = teams[slotTeamIds[slot] ?? ''];
          return (
            <button
              key={slot}
              type="button"
              onClick={() => setActiveSlot(slot)}
              className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors
                ${activeSlot === slot ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
            >
              {team ? `${team.teamNumber}조 · ${team.nickname}` : `${slot}조 준비 중…`}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {SLOTS.map((slot) => {
          const teamId = slotTeamIds[slot];
          const ready = teamId && teams[teamId];
          return (
            <div key={sessionId + slot} className={slot === activeSlot ? 'h-full' : 'hidden'}>
              {ready ? (
                <PreviewPane
                  sessionId={sessionId}
                  teamId={teamId}
                  data={data}
                  onReset={handleReset}
                  fill
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-100 bg-white">
                  <LoadingScreen />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </dialog>
  );
}
