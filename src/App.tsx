import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initTelegram } from './lib/telegram';
import { SplashScreen } from './components/splash-screen';
import { Feed } from './components/feed';
import { TripDetails } from './components/trip-details';
import { CreateTrip } from './components/create-trip/create-trip';
import { PhotoViewer } from './components/photo-viewer';
import SharePage from './pages/share';


function App() {
  useEffect(() => {
    initTelegram();
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;