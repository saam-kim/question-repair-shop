import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';

const RoleSelect = lazy(() => import('./pages/RoleSelect').then((m) => ({ default: m.RoleSelect })));
const TeacherHome = lazy(() => import('./pages/teacher/TeacherHome').then((m) => ({ default: m.TeacherHome })));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })));
const StudentJoin = lazy(() => import('./pages/student/StudentJoin').then((m) => ({ default: m.StudentJoin })));
const StudentApp = lazy(() => import('./pages/student/StudentApp').then((m) => ({ default: m.StudentApp })));

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<RoleSelect />} />
          <Route path="/teacher" element={<TeacherHome />} />
          <Route path="/teacher/:sessionId" element={<TeacherDashboard />} />
          <Route path="/student" element={<StudentJoin />} />
          <Route path="/student/:sessionId" element={<StudentApp />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
