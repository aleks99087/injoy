import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, initTelegram } from '../lib/telegram';
import { supabase } from '../lib/supabase';

// Функция для конвертации SVG в JPG
const convertSvgToJpg = (svgUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Устанавливаем размер холста в зависимости от изображения
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Преобразуем в JPG
        const jpgDataUrl = canvas.toDataURL('image/jpeg');
        resolve(jpgDataUrl); // Возвращаем URL изображения
      } else {
        reject('Ошибка при конвертации');
      }
    };
    img.onerror = (err) => reject(err);

    img.src = svgUrl; // Загружаем SVG
  });
};

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
      initTelegram(); // Инициализация и сохранение telegramUserId
      const user = tg.getUser(); // Получаем пользователя
  
      setIsAnimating(false);
  
      setDebugInfo(JSON.stringify({
        hasTelegram: !!window.Telegram?.WebApp,
        initData: window.Telegram?.WebApp?.initData,
        user: user ?? null
      }, null, 2));
  
      if (user) {
        const photoUrl = user.photo_url;

        // Проверяем, если это SVG, конвертируем в JPG
        if (photoUrl && photoUrl.endsWith('.svg')) {
          convertSvgToJpg(photoUrl)
            .then((jpgUrl) => {
              // Сохраняем конвертированное фото в базе
              supabase.from('users').upsert({
                id: user.id.toString(),
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                language_code: user.language_code,
                photo_url: jpgUrl // Сохраняем JPG
              }).then(({ error }) => {
                if (error) console.error('Ошибка сохранения пользователя:', error);
                else console.log('✅ Пользователь сохранён:', user.id);
              });
            })
            .catch((err) => {
              console.error('Ошибка при конвертации SVG:', err);
            });
        } else {
          // Если это не SVG, просто сохраняем как есть
          supabase.from('users').upsert({
            id: user.id.toString(),
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            language_code: user.language_code,
            photo_url: photoUrl // Сохраняем как есть
          }).then(({ error }) => {
            if (error) console.error('Ошибка сохранения пользователя:', error);
            else console.log('✅ Пользователь сохранён:', user.id);
          });
        }

        setDebugUserId(user.id.toString());
      } else {
        console.warn('⛔️ Данные пользователя не найдены в initDataUnsafe');
      }
  
      // Переход через 5 секунд
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
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className={`absolute inset-0 flex flex-col items-center justify-between py-20 transition-all duration-1000 ease-in-out ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Logo and tagline */}
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-6 text-white drop-shadow-lg">
            IN<span className="text-rose-500">JOY</span>
          </h1>
          <p className="text-sm tracking-wider text-white/90 drop-shadow-lg">ЖИВИ • ПУТЕШЕСТВУЙ • ДЕЛИСЬ</p>
        </div>

        {/* Bottom tagline */}
        <div className="text-center space-y-3">
          <p className="text-xl text-white/90 drop-shadow-lg">ЖИЗНЬ - ЭТО</p>
          <p className="text-4xl font-bold tracking-wider text-rose-500 drop-shadow-lg">
            ПУТЕШЕСТВИЕ
          </p>
        </div>
      </div>

      {/* Отладочный вывод user_id */}
      {debugUserId && (
        <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-lg">
          user_id: {debugUserId}
        </div>
      )}
    </div>
  );
}