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

      // редирект в Mini App через start_param
      setTimeout(() => {
        window.location.href = `https://t.me/injoy_trip_bot?startapp=trip_${id}`;
      }, 1200); // можно уменьшить задержку, чтобы не тормозило
    };

    fetchTrip();
  }, [id]);

  if (!trip) return null;

  const title = `${trip.title} — маршрут в INJOY`;
  const description = 'Смотри маршрут, ставь лайк и добавляй в избранное';
  const image = trip.photo_url || 'https://injoy-ten.vercel.app/default-preview.jpg';

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://injoy-ten.vercel.app/share/${id}`} />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <p>Переходим в маршрут...</p>
      </div>
    </>
  );
}
