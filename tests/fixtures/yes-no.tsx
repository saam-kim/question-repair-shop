import { createRoot } from 'react-dom/client';
import { QuestionsStep } from '../../src/pages/student/steps/QuestionsStep';
import { RespondingStep } from '../../src/pages/student/steps/RespondingStep';
import { RevisionStep } from '../../src/pages/student/steps/RevisionStep';
import { DoneStep } from '../../src/pages/student/steps/DoneStep';
import { TeacherResults } from '../../src/pages/teacher/TeacherResults';
import { sampleResponseValue } from '../../src/lib/rehearsalSampleData';
import { calls, storedResponses, storedFeedback } from './db';
import type { Team } from '../../src/types';
import '../../src/index.css';

const root = createRoot(document.getElementById('root')!);
const team: Team = { teamNumber: 1, nickname: '테스트', ownerUid: 'test', createdAt: 1 };
const responder: Team = { teamNumber: 2, nickname: '응답자', ownerUid: 'test2', createdAt: 1, responsesGiven: storedResponses as Team['responsesGiven'], feedbackGiven: storedFeedback as Team['feedbackGiven'] };

function render(stage: string) {
  const props = { sessionId: 'local-test', teamId: 'team1' };
  if (stage === 'questions') root.render(<QuestionsStep {...props} topic="스마트폰 사용" />);
  if (stage === 'responding' || stage === 'revision') {
    team.questions = calls.find((c) => c.name === 'questions')!.args[2] as Team['questions'];
  }
  if (stage === 'responding') root.render(
    <RespondingStep {...props} teamId="team2" targetTeamId="team1" targetTeam={team} myTeam={responder} progressIndex={0} progressTotal={1} />,
  );
  if (stage === 'multi') {
    delete storedResponses.team1;
    delete storedFeedback.team1;
    team.questions = calls.filter((c) => c.name === 'questions').at(-1)!.args[2] as Team['questions'];
    root.render(<RespondingStep key="multi" {...props} teamId="team2" targetTeamId="team1" targetTeam={team} myTeam={responder} progressIndex={0} progressTotal={1} />);
  }
  if (stage === 'revision') root.render(<RevisionStep {...props} myTeam={team} allTeams={{ team1: team, team2: responder }} />);
  if (stage === 'results') {
    team.revisions = calls.find((c) => c.name === 'revisions')!.args[2] as Team['revisions'];
    root.render(<><DoneStep myTeam={team} teamId="team1" allTeams={{ team1: team }} /><TeacherResults teams={{ team1: team }} /></>);
  }
}

Object.assign(window, { testApp: { calls, render, sampleResponseValue } });
render('questions');
