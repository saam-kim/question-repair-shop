import { useEffect, useRef, useState } from 'react';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { useSession } from '../../hooks/useSession';
import {
  joinOrCreateTeam,
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
import { previewStorage } from '../../lib/storage';
import { assignReviewers, MIN_TEAMS_FOR_ASSIGNMENT } from '../../lib/assignmentAlgorithm';
import { SAMPLE_TOPICS, SAMPLE_QUESTIONS, sampleResponseValue } from '../../lib/rehearsalSampleData';
import { PreviewPane } from './PreviewPane';
import { LoadingScreen } from '../../components/LoadingScreen';
import { PhaseIndicator } from '../../components/PhaseIndicator';
import { QUESTION_IDS } from '../../types';
import type { QuestionId, SessionPhase } from '../../types';

const SLOTS = [1, 2, 3, 4];

export function RehearsalOverlay({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { uid } = useAnonAuth();
  const { data } = useSession(sessionId);
  const [activeSlot, setActiveSlot] = useState(1);
  const [slotTeamIds, setSlotTeamIds] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!uid || !data || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      for (const slot of SLOTS) {
        const stored = previewStorage.read(sessionId, slot);
        if (stored && data.teams[stored.teamId]) {
          setSlotTeamIds((prev) => ({ ...prev, [slot]: stored.teamId }));
          continue;
        }
        try {
          const { teamId } = await joinOrCreateTeam(sessionId, uid);
          previewStorage.write(sessionId, slot, teamId);
          setSlotTeamIds((prev) => ({ ...prev, [slot]: teamId }));
        } catch {
          // 실패한 슬롯은 비워두고 다음으로 — 탭의 "이 조 리셋"으로 다시 시도 가능
        }
      }
    })();
  }, [uid, data, sessionId]);

  async function handleResetSlot(slot: number) {
    previewStorage.clear(sessionId, slot);
    setSlotTeamIds((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    if (!uid) return;
    const { teamId } = await joinOrCreateTeam(sessionId, uid);
    previewStorage.write(sessionId, slot, teamId);
    setSlotTeamIds((prev) => ({ ...prev, [slot]: teamId }));
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3f6fc]">
        <LoadingScreen />
      </div>
    );
  }

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
              if (!team.topic) await setTeamTopic(sessionId, teamId, SAMPLE_TOPICS[i % SAMPLE_TOPICS.length]);
              await submitQuestions(
                sessionId,
                teamId,
                Object.fromEntries(
                  QUESTION_IDS.map((qid) => [qid, { text: SAMPLE_QUESTIONS[qid], scaleType: 'LIKERT_5' as const }]),
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
            jobs.push(
              (async () => {
                for (const qid of QUESTION_IDS) {
                  const q = targetTeam.questions?.[qid];
                  if (!q) continue;
                  const value = sampleResponseValue(q.scaleType, q.options);
                  await submitResponseAndFeedback(sessionId, teamId, targetId, qid, value, {
                    problemTypes: ['NONE'],
                    comment: '',
                  });
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
                    return [
                      qid,
                      {
                        originalText: q?.text ?? '',
                        revisedText: `${q?.text ?? ''} (자동 수정)`,
                        revisionReasons: ['CLARITY'],
                        scaleType: q?.scaleType ?? 'LIKERT_5',
                        options: q?.options,
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f3f6fc]">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8 py-4">
        <div className="flex items-center gap-4">
          <p className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
            🧪 리허설 모드
          </p>
          <PhaseIndicator currentPhase={session.currentPhase} />
        </div>
        <div className="flex items-center gap-2">
          {showAutoFill && (
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={busy}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              ⚡ 전체 조 자동 채우기
            </button>
          )}
          {phaseActionLabel[session.currentPhase] && (
            <button
              type="button"
              onClick={handlePhaseAction}
              disabled={busy || !canAdvance}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
            >
              {phaseActionLabel[session.currentPhase]}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ✕ 닫기
          </button>
        </div>
      </header>

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
              {team ? `${team.teamNumber}조 · ${team.nickname}` : '준비 중…'}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {SLOTS.map((slot) => {
          const teamId = slotTeamIds[slot];
          const ready = teamId && teams[teamId];
          return (
            <div key={slot} className={slot === activeSlot ? 'h-full' : 'hidden'}>
              {ready ? (
                <PreviewPane
                  sessionId={sessionId}
                  teamId={teamId}
                  data={data}
                  onReset={() => handleResetSlot(slot)}
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
    </div>
  );
}
