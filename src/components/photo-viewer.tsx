import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useKeenSlider } from 'keen-slider/react';
import { supabase } from '../lib/supabase';
import "keen-slider/keen-slider.min.css";

type ImageWithPoint = {
  id: string;
  image_url: string;
  point_id: string;
  point_name: string;
  impressions: string | null;
};

export function PhotoViewer() {
  const navigate = useNavigate();
  const { pointId } = useParams<{ pointId: string }>();
  const [searchParams] = useSearchParams();
  const initialImageIndex = parseInt(searchParams.get('initialImageIndex') || '0', 10);

  const [images, setImages] = useState<ImageWithPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(initialImageIndex);
  const [lastPointId, setLastPointId] = useState<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const [sliderRef] = useKeenSlider<HTMLDivElement>({
    initial: initialImageIndex,
    loop: true,
    mode: "snap",
    slides: { perView: 1 },
    drag: true,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
  });

  const current = images[currentSlide];

  useEffect(() => {
    if (current?.point_id !== lastPointId) {
      setLastPointId(current?.point_id);
      setShouldAnimate(true);
      const timeout = setTimeout(() => setShouldAnimate(false), 700); // match animation duration
      return () => clearTimeout(timeout);
    }
  }, [current?.point_id]);

  useEffect(() => {
    const loadGallery = async () => {
      if (!pointId) return;

      try {
        const { data: pointData } = await supabase
          .from('points')
          .select('id, name, trip_id')
          .eq('id', pointId)
          .single();

        if (!pointData) return;

        const { data: allPoints } = await supabase
          .from('points')
          .select('id, name, impressions')
          .eq('trip_id', pointData.trip_id);

        const pointMap = new Map<string, { name: string; impressions: string | null }>();
        allPoints?.forEach(p => {
          pointMap.set(p.id, { name: p.name, impressions: p.impressions });
        });

        const pointIds = allPoints?.map(p => p.id) || [];

        const { data: imagesData } = await supabase
          .from('point_images')
          .select('id, image_url, point_id')
          .in('point_id', pointIds)
          .order('created_at', { ascending: true });

        const enrichedImages = (imagesData || []).map((img) => {
          const point = pointMap.get(img.point_id);
          return {
            id: img.id,
            image_url: img.image_url,
            point_id: img.point_id,
            point_name: point?.name || 'Неизвестная точка',
            impressions: point?.impressions || null,
          };
        });

        setImages(enrichedImages);
      } catch (err) {
        console.error('Ошибка при загрузке фото:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
  }, [pointId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>Фотографии не найдены</p>
        <button
          onClick={() => navigate(-1)}
          className="text-[#FA5659] hover:underline ml-2"
        >
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Кнопка "назад" */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Индикаторы точек */}
      <div className="absolute top-8 inset-x-0 flex justify-center gap-1 z-10">
        {images.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentSlide ? 'bg-[#FA5659]' : 'bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Слайдер изображений */}
      <div ref={sliderRef} className="keen-slider h-full">
        {images.map((image) => (
          <div key={image.id} className="keen-slider__slide flex justify-center items-center">
            <img
              src={image.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Нижний блок с названием и впечатлениями */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 pt-8 text-white"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent)',
        }}
      >
        <h2
          key={current.point_name}
          className="inline-block text-xl font-semibold mb-2 bg-black/40 px-3 py-1 rounded animate-fadeIn"
        >
          {current.point_name}
        </h2>

        {current.impressions && (
          <div
            key={current.point_id + '-impression'}
            className="bg-black/30 p-2 rounded max-h-32 overflow-y-auto"
          >
            <div className="animate-fadeIn">
              <p className="text-sm opacity-90 leading-relaxed whitespace-pre-line">
                {current.impressions}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}