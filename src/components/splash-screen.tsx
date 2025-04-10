import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, initTelegram } from '../lib/telegram';
import { supabase } from '../lib/supabase';

export function SplashScreen() {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(true);
  const [debugUserId, setDebugUserId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;

    script.onload = () => {
      initTelegram(); // ✅ инициализируем и сохраняем telegramUserId
      const user = tg.getUser(); // ✅ достаём пользователя через tg, а не напрямую

      setIsAnimating(false);

      setDebugInfo(
        JSON.stringify(
          {
            hasTelegram: !!window.Telegram?.WebApp,
            initData: window.Telegram?.WebApp?.initData,
            user: user ?? null,
          },
          null,
          2
        )
      );

      if (user) {
        // 🔧 Преобразуем .svg → .jpg (если есть)
        const normalizedPhotoUrl = user.photo_url?.endsWith('.svg')
          ? user.photo_url.replace('.svg', '.jpg')
          : user.photo_url;

        supabase
          .from('users')
          .upsert({
            id: user.id.toString(),
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            language_code: user.language_code,
            photo_url: normalizedPhotoUrl,
          })
          .then(({ error }) => {
            if (error) console.error('Ошибка сохранения пользователя:', error);
            else console.log('✅ Пользователь сохранён:', user.id);
          });

        setDebugUserId(user.id.toString());
      } else {
        console.warn('⛔️ Данные пользователя не найдены в initDataUnsafe');
      }

      // ⏳ Переход через 5 сек
      const startParam = tg.getStartParam();
      const tripId = startParam?.startsWith('trip_')
        ? startParam.replace('trip_', '')
        : null;

      setTimeout(() => {
        if (tripId) {
          navigate(`/trips/${tripId}`);
        } else {
          navigate('/feed');
        }
      }, 5000);
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-black"
      style={{
        backgroundImage:
          'url(https://storage.yandexcloud.net/my-video-frames/Image_injoy/d311b52a520201016e1314dab453fa8c.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div
        className={
          `
          absolute inset-0 flex flex-col items-center justify-between py-20
          transition-all duration-1000 ease-in-out
          ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `
        }
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
      {/* ✅ Отладочный вывод user_id */}
      {debugUserId && (
        <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-lg">
          user_id: {debugUserId}
        </div>
      )}
    </div>
  );
}