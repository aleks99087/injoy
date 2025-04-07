import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu } from 'lucide-react';
import { useKeenSlider } from 'keen-slider/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import "keen-slider/keen-slider.min.css";
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { MapSelector } from './create-trip/map-selector';
import { useStickyHeader } from '../lib/useStickyHeader';

type Trip = {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  country: string | null;
  user_id: string;
  created_at: string;
};

type Point = {
  id: string;
  trip_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  how_to_get: string | null;
  impressions: string | null;
  order: number;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
};

type PointImage = {
  id: string;
  point_id: string;
  url: string;
  order: number;
};

const ANIMATION_DURATION = 500;
const MAX_HEADER_HEIGHT = 400;
const MIN_HEADER_HEIGHT = 200;

export function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [pointImages, setPointImages] = useState<Record<string, PointImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerImageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    initial: 0,
    loop: true,
    duration: ANIMATION_DURATION,
    slides: { perView: 1, number: points.length },
    drag: true,
    slideChanged(slider) {
      const newSlide = slider.track.details.abs % points.length;
      setCurrentSlide(newSlide);
    },
  });

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.update();
    }
  }, [points.length]); 

  const initStickyHeader = (
    contentRef: React.RefObject<HTMLDivElement>,
    headerRef: React.RefObject<HTMLDivElement>,
    headerImageRef: React.RefObject<HTMLImageElement>
  ) => {
    const content = contentRef.current;
    const header = headerRef.current;
    const headerImage = headerImageRef.current;
  
    if (!content || !header || !headerImage) return;
  
    let ticking = false;
  
    const updateHeader = () => {
      const scrollY = content.scrollTop;
      const newHeight = Math.max(MIN_HEADER_HEIGHT, MAX_HEADER_HEIGHT - scrollY);
      const progress = (MAX_HEADER_HEIGHT - newHeight) / (MAX_HEADER_HEIGHT - MIN_HEADER_HEIGHT);
  
      header.style.height = `${newHeight}px`;
      headerImage.style.transform = `scale(${1 + progress * 0.1}) translateY(${progress * -20}px)`;
  
      ticking = false;
    };
  
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };
  
    content.addEventListener('scroll', onScroll, { passive: true });
    updateHeader();
  
    return () => content.removeEventListener('scroll', onScroll);
  };

  useEffect(() => {
    let frame: number;
  
    const waitForRefs = () => {
      const content = contentRef.current;
      const header = headerRef.current;
      const headerImage = headerImageRef.current;
  
      if (content && header && headerImage) {
        console.log('[TripDetails] Рефы появились');
        initStickyHeader(contentRef, headerRef, headerImageRef);
      } else {
        console.log('[TripDetails] Рефов всё ещё нет...');
        frame = requestAnimationFrame(waitForRefs);
      }
    };
  
    frame = requestAnimationFrame(waitForRefs);
    return () => cancelAnimationFrame(frame);
  }, []);  

  useEffect(() => {
    if (!id) return;

    const loadTripDetails = async () => {
      try {
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();

        if (tripError) throw tripError;
        setTrip(tripData);

        const { data: pointsData, error: pointsError } = await supabase
          .from('points')
          .select('*')
          .eq('trip_id', id)
          .order('order', { ascending: true });

        if (pointsError) throw pointsError;
        setPoints(pointsData || []);

        if (pointsData) {
          const pointIds = pointsData.map(p => p.id);
          const { data: imagesData, error: imagesError } = await supabase
            .from('point_images')
            .select('*')
            .in('point_id', pointIds)
            .order('created_at', { ascending: true });

          if (imagesError) throw imagesError;

          const imagesByPoint = imagesData?.reduce((acc, img) => {
            if (!acc[img.point_id]) {
              acc[img.point_id] = [];
            }
            acc[img.point_id].push(img);
            return acc;
          }, {} as Record<string, PointImage[]>) || {};

          setPointImages(imagesByPoint);
        }
      } catch (err) {
        console.error('Error loading trip details:', err);
        setError('Failed to load trip details');
      } finally {
        setLoading(false);
      }
    };

    loadTripDetails();
  }, [id]);

  const handleRating = async (pointId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('points')
        .update({ rating })
        .eq('id', pointId);

      if (error) throw error;

      setPoints(points.map(p => 
        p.id === pointId ? { ...p, rating } : p
      ));
    } catch (err) {
      console.error('Error updating rating:', err);
    }
  };

  const handleImageClick = (pointId: string, imageIndex: number) => {
    navigate(`/points/${pointId}/photos?initialImageIndex=${imageIndex}`);
  };

  const openLocationMap = (point: Point) => {
    if (point.latitude && point.longitude) {
      setSelectedPoint(point);
      setShowMap(true);
    }
  };

  const handlePointSelect = (index: number) => {
    if (instanceRef.current) {
      instanceRef.current.moveToIdx(index, true, {
        duration: ANIMATION_DURATION
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FA5659]" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Trip not found'}</p>
          <button onClick={() => navigate('/feed')} className="text-[#FA5659] hover:underline">
            Return to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-details-page">
      <div 
        ref={headerRef}
        className="trip-header"
        style={{ height: `${MAX_HEADER_HEIGHT}px` }}
      >
        <img
          ref={headerImageRef}
          src={trip.photo_url || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'}
          alt={trip.title}
          className="trip-header-image"
        />
        
        <div className="trip-header-gradient" />

        <div className="trip-header-controls">
          <div className="absolute top-4 left-0 right-0 px-4">
            <div className="flex justify-between items-center text-white max-w-4xl mx-auto">
              <button
                onClick={() => navigate('/feed')}
                className="p-2 rounded-full bg-black/30 hover:bg-black/40 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Trip Title with Semi-Transparent Background and Rounded Corners */}
              <div className="px-4 py-1 bg-black/30 rounded-full">
                <h1 className="text-xl font-bold text-white text-center truncate">
                  {trip.title}
                </h1>
              </div>

              <button className="p-2 rounded-full bg-black/30 hover:bg-black/40 transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-20 left-0 right-0 px-4">
            <div className="inline-block text-white px-2 py-1 rounded-md bg-gradient-to-r from-black/50 to-black/20 max-w-[80%]">
              <div className="text-lg font-medium tracking-wide">{trip.country}</div>
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
              {points.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handlePointSelect(index)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-300",
                    currentSlide === index
                      ? "bg-[#FA5659] text-white scale-105"
                      : "bg-black/30 text-white hover:bg-black/40"
                  )}
                >
                  <span className="font-bold">
                    {currentSlide === index ? `${index + 1} место` : index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="trip-content overflow-y-auto" ref={contentRef}>
        {points.length > 0 && (
          <div ref={sliderRef} key={points.length} className="keen-slider">
            {points.map((point) => (
              <div key={point.id} className="keen-slider__slide">
                <div className="p-4 transition-all duration-300 ease-in-out">
                  <h2 className="text-2xl font-semibold mb-4">{point.name}</h2>

                  <div className="grid grid-cols-2 gap-4 items-start mb-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1 h-[20px]">
                        {point.rating ? 'Моя оценка места' : 'Поставь оценку'}
                      </div>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRating(point.id, star)}
                            className={cn(
                              'text-2xl transition',
                              point.rating
                                ? star <= point.rating
                                  ? 'text-[#FA5659]'
                                  : 'text-[#FA5659]/30 hover:text-[#FA5659]'
                                : 'text-gray-300 hover:text-[#FA5659]'
                            )}
                          >
                            {point.rating ? (star <= point.rating ? '★' : '☆') : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {point.latitude && point.longitude && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1 h-[20px]">Локация на карте</div>
                        <button
                          className="inline-flex items-center text-[#FA5659] hover:underline"
                          onClick={() => openLocationMap(point)}
                        >
                          <img
                            src="https://storage.yandexcloud.net/my-app-frames/miniINJOY/MapPinSimpleArea.svg"
                            alt="Map Icon"
                            className="w-5 h-5 mr-2"
                          />
                          Открыть
                        </button>
                      </div>
                    )}
                  </div>

                  {pointImages[point.id]?.length > 0 && (
                    <div className="flex gap-2 overflow-auto mb-6">
                      {pointImages[point.id].map((img, index) => (
                        <img
                          key={img.id}
                          src={img.image_url}
                          alt=""
                          className="h-24 w-24 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                          onClick={() => handleImageClick(point.id, index)}
                        />
                      ))}
                    </div>
                  )}

                  {point.how_to_get && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">Как добраться</h3>
                      <p className="text-gray-600">{point.how_to_get}</p>
                    </div>
                  )}

                  {point.impressions && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">Впечатления</h3>
                      <p className="text-gray-600">{point.impressions}</p>
                    </div>
                  )}

                  {point.description && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Описание</h3>
                      <p className="text-gray-600">{point.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showMap && selectedPoint && (
          <MapSelector
            onClose={() => setShowMap(false)}
            currentPosition={{
              lat: selectedPoint.latitude!,
              lng: selectedPoint.longitude!,
            }}
            initialPosition={{
              lat: selectedPoint.latitude!,
              lng: selectedPoint.longitude!,
            }}
            allPoints={points
              .filter((p) => p.latitude !== null && p.longitude !== null)
              .map((p) => ({
                lat: p.latitude!,
                lng: p.longitude!,
                name: p.name,
              }))}
            title={selectedPoint.name}
          />
        )}
      </div>
    </div>
  );
}