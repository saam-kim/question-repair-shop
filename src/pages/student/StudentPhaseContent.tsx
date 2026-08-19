import { WaitingScreen } from '../../components/WaitingScreen';
import { TopicStep } from './steps/TopicStep';
import { QuestionsStep } from './steps/QuestionsStep';
import { RespondingStep } from './steps/RespondingStep';
import { FeedbackReceivedStep } from './steps/FeedbackReceivedStep';
import { RevisionStep } from './steps/RevisionStep';
import { DoneStep } from './steps/DoneStep';
import type { Session, Team, Assignments } from '../../types';

interface StudentPhaseContentProps {
  sessionId: string;
  teamId: string;
  session: Session;
  myTeam: Team;
  allTeams: Record<string, Team>;
  assignments: Assignments;
}

/**
 * 현재 세션 phase + 우리 조 진행 상태에 맞는 학생 화면을 고른다.
 * StudentApp(실제 학생 접속)과 교사 대시보드의 미리보기 패널이 이 컴포넌트를 함께 사용한다.
 */
export function StudentPhaseContent({
  sessionId,
  teamId,
  session,
  myTeam,
  allTeams,
  assignments,
}: StudentPhaseContentProps) {
  switch (session.currentPhase) {
    case 'LOBBY':
      return (
        <WaitingScreen
          title="곧 활동이 시작됩니다"
          description="선생님이 활동을 시작하면 자동으로 화면이 전환됩니다."
        />
      );

    case 'QUESTION':
      if (!myTeam.topic) {
        return <TopicStep sessionId={sessionId} teamId={teamId} />;
      }
      if (!myTeam.questionsSubmittedAt) {
        return <QuestionsStep sessionId={sessionId} teamId={teamId} topic={myTeam.topic} />;
      }
      return (
        <WaitingScreen
          title="질문지를 제출했습니다"
          description="다른 조가 질문지를 모두 제출할 때까지 기다려주세요."
        />
      );

    case 'RESPONDING': {
      const targets = assignments[teamId] ?? [];
      if (targets.length === 0) {
        return <WaitingScreen title="응답할 조를 배정하고 있습니다" description="잠시만 기다려주세요." />;
      }
      const nextTarget = targets.find((t) => myTeam.respondingProgress?.[t] !== 'DONE');
      if (!nextTarget) {
        return (
          <WaitingScreen
            title="배정된 3개 조의 질문에 모두 응답했습니다"
            description="다른 조가 응답을 마칠 때까지 기다려주세요."
          />
        );
      }
      return (
        <RespondingStep
          key={nextTarget}
          sessionId={sessionId}
          teamId={teamId}
          targetTeamId={nextTarget}
          targetTeam={allTeams[nextTarget]}
          progressIndex={targets.indexOf(nextTarget)}
          progressTotal={targets.length}
        />
      );
    }

    case 'FEEDBACK_REVIEW':
      return <FeedbackReceivedStep myTeam={myTeam} teamId={teamId} allTeams={allTeams} />;

    case 'REVISION':
      if (!myTeam.revisionsSubmittedAt) {
        return (
          <RevisionStep sessionId={sessionId} teamId={teamId} myTeam={myTeam} allTeams={allTeams} />
        );
      }
      return (
        <WaitingScreen
          title="질문 수리를 완료했습니다"
          description="다른 조가 수리를 마칠 때까지 기다려주세요."
        />
      );

    case 'RESULT':
      return <DoneStep myTeam={myTeam} teamId={teamId} allTeams={allTeams} />;

    case 'ENDED':
      return <WaitingScreen title="활동이 종료되었습니다" description="오늘 활동에 참여해주셔서 고맙습니다." />;

    default:
      return null;
  }
}
