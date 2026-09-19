import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { state } from './classroom-state';
import '../../src/index.css';
Object.assign(window, { classroom: state });
createRoot(document.getElementById('root')!).render(<App />);
