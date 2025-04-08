import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg } from '../lib/telegram'; // проверь путь, может быть другим

export function SplashScreen() {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);

      // доп. таймер для выхода после анимации
      setTimeout(() => {
        const startParam = tg.getStartParam();
        console.log('🧩 startParam из Telegram:', startParam);
        alert(`🧩 startParam: ${startParam}`);
      
        if (startParam?.startsWith('trip_')) {
          const tripId = startParam.replace('trip_', '');
          navigate(`/trips/${tripId}`);
        } else {
          navigate('/feed');
        }
      }, 2500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className="min-h-screen relative overflow-hidden bg-black"
      style={{
        backgroundImage: 'url(https://storage.yandexcloud.net/my-video-frames/Image_injoy/d311b52a520201016e1314dab453fa8c.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div 
        className={`
          absolute inset-0 flex flex-col items-center justify-between py-20
          transition-all duration-1000 ease-in-out
          ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
      >
        {/* Logo and tagline */}
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-6 text-white drop-shadow-lg">
            IN<span className="text-rose-500">JOY</span>
          </h1>
          <p className="text-sm tracking-wider text-white/90 drop-shadow-lg">
            ЖИВИ • ПУТЕШЕСТВУЙ • ДЕЛИСЬ
          </p>
        </div>

        {/* Bottom tagline */}
        <div className="text-center space-y-3">
          <p className="text-xl text-white/90 drop-shadow-lg">ЖИЗНЬ - ЭТО</p>
          <p className="text-4xl font-bold tracking-wider text-rose-500 drop-shadow-lg">
            ПУТЕШЕСТВИЕ
          </p>
        </div>
      </div>
    </div>
  );
}