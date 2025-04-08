import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../lib/supabase';

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    const fetchTrip = async () => {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      setTrip(data);
    };

    fetchTrip();
  }, [id]);

  if (!trip) return null;

  const title = `${trip.title} — маршрут в INJOY`;
  const description = 'Смотри маршрут, ставь лайк и добавляй в избранное';
  const image = trip.photo_url || 'https://storage.yandexcloud.net/my-app-frames/miniINJOY/placeholder.jpg';
  const pageUrl = `https://injoy-ten.vercel.app/share/${id}`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />

        {/* Twitter preview fallback */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
      </Helmet>

      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <img
          src={image}
          alt={trip.title}
          className="max-w-full max-h-96 rounded shadow-lg mb-6"
        />
        <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        <a
          href={`https://t.me/injoy_trip_bot?startapp=trip_${id}`}
          className="bg-rose-500 text-white px-6 py-3 rounded-lg text-lg shadow-md hover:bg-rose-600 transition"
        >
          Открыть в Telegram
        </a>
      </div>
    </>
  );
}