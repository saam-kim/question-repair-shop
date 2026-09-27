import { createRoot } from 'react-dom/client';
import { useSession } from '../../src/hooks/useSession';
import { StudentPhaseContent } from '../../src/pages/student/StudentPhaseContent';
import { ConnectionStatus } from '../../src/components/ConnectionStatus';
import { state, emitCache } from './network-firestore';
import { advancePhase, submitResponseAndFeedback } from '../../src/firebase/firestoreDb';
import '../../src/index.css';

function Screen() {
  const { data, loading, error } = useSession('s123456');
  if (loading || !data?.teams.student) return <p>Loading</p>;
  return <div className="student-shell">
    <ConnectionStatus />
    <output data-testid="phase">{data.session.currentPhase}</output>
    <output data-testid="responses">{JSON.stringify(data.teams.student.responsesGiven ?? {})}</output>
    {error && <p role="alert">{error}</p>}
    <StudentPhaseContent sessionId="s123456" teamId="student" session={data.session} myTeam={data.teams.student} allTeams={data.teams} assignments={data.assignments ?? {}} />
  </div>;
}
Object.assign(window, { networkTest: { state, emitCache, advancePhase, submitResponseAndFeedback } });
createRoot(document.getElementById('root')!).render(<Screen />);
