import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initTelegram } from './lib/telegram';
import { SplashScreen } from './components/splash-screen';
import { Feed } from './components/feed';
import { TripDetails } from './components/trip-details';
import { CreateTrip } from './components/create-trip/create-trip';
import { PhotoViewer } from './components/photo-viewer';
import { AiAssistant } from './components/AI/AiAssistant';
import SharePage from './pages/share';

function App() {
  useEffect(() => {
    initTelegram();

    // Глобальный перехват ошибок
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      const message = [
        '[window.onerror]',
        `Message: ${msg}`,
        `URL: ${url}`,
        `Line: ${lineNo}, Col: ${columnNo}`,
        `Error object: ${JSON.stringify(error)}`,
      ].join('\n');
      localStorage.setItem('lastWindowError', message);
      return false;
    };

    window.onunhandledrejection = function (event) {
      const message = `[onunhandledrejection] Reason: ${event.reason}`;
      localStorage.setItem('lastWindowError', message);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/create" element={<CreateTrip />} />
        <Route path="/points/:pointId/photos" element={<PhotoViewer />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/ai-assistant" element={<AiAssistant />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;