import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';

// Temporarily disabled StrictMode to fix realtime subscription issues
// StrictMode causes double-mounting which breaks Supabase subscriptions
createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster position="top-center" />
  </>
);
