import { HashRouter, Routes, Route } from 'react-router-dom';
import { RoleSelect } from './pages/RoleSelect';
import { TeacherHome } from './pages/teacher/TeacherHome';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { StudentJoin } from './pages/student/StudentJoin';
import { StudentApp } from './pages/student/StudentApp';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/:sessionId" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentJoin />} />
        <Route path="/student/:sessionId" element={<StudentApp />} />
      </Routes>
    </HashRouter>
  );
}
