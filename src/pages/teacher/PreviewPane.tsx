import { StudentTopBar } from '../../components/StudentTopBar';
import { PausedOverlay } from '../../components/PausedOverlay';
import { phaseStepLabel } from '../../lib/phases';
import { StudentPhaseContent } from '../student/StudentPhaseContent';
import type { SessionData } from '../../types';

/** 실제 학생이 iPad에서 보는 화면을 교사 대시보드 안에서 그대로 재현한다. */
export function PreviewPane({
  sessionId,
  teamId,
  data,
  onReset,
  fill = false,
}: {
  sessionId: string;
  teamId: string;
  data: SessionData;
  onReset: () => void;
  /** true면 부모 컨테이너 높이를 그대로 채운다(전체화면 리허설 모드용). 기본은 고정 640px. */
  fill?: boolean;
}) {
  const { session, teams, assignments = {} } = data;
  const myTeam = teams[teamId];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-2px_rgba(30,64,175,0.06)] ${fill ? 'h-full' : 'h-[640px]'}`}
    >
      <div className="flex h-full flex-col">
        {session.status === 'PAUSED' && <PausedOverlay />}
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
          <span>🧪 미리보기 · 실제 데이터로 이 세션에 참여 중인 조입니다</span>
          <button type="button" onClick={onReset} className="underline hover:text-amber-900">
            이 조 리셋
          </button>
        </div>
        <StudentTopBar
          nickname={myTeam.nickname}
          teamNumber={myTeam.teamNumber}
          stepLabel={phaseStepLabel(session.currentPhase)}
        />
        <StudentPhaseContent
          sessionId={sessionId}
          teamId={teamId}
          session={session}
          myTeam={myTeam}
          allTeams={teams}
          assignments={assignments}
        />
      </div>
    </div>
  );
}
