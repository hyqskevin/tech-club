import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@/components/ui/sonner';

interface ImportMetaEnv { VITE_CLIENT_BASE_PATH?: string; }
const CLIENT_BASE_PATH = (import.meta.env as unknown as ImportMetaEnv).VITE_CLIENT_BASE_PATH ?? '/';

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600 mb-4">页面出错了</h2>
              <p className="text-gray-600 mb-4">{(error as Error).message}</p>
              <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                重新加载
              </button>
            </div>
          </div>
        )}
      >
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </ErrorBoundary>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);