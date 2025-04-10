import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2 } from 'lucide-react';
import type { LatLng } from 'leaflet';
import { supabase } from '../../lib/supabase';
import { tg } from '../../lib/telegram';
import { TripForm } from './trip-form';
import { PointForm } from './point-form';
import { MapSelector } from './map-selector';
import type { PointInput } from './types';
import { countries } from '../../lib/countries';
import { countryCoords } from '../../lib/country-coords';

type Step = 'trip' | number;

export function CreateTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('trip');
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mapZoomLevels, setMapZoomLevels] = useState<Record<number, number>>({});
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const MIN_SWIPE_DISTANCE = 50;
  const mainRef = useRef<HTMLDivElement | null>(null);

  const [tripData, setTripData] = useState({
    title: '',
    country: '',
    location: '',
    lat: null,
    lng: null,
    budget: '',
    startDate: '',
    endDate: '',
    mainPhoto: null as File | null,
    mainPhotoPreview: null as string | null,
    isPublic: true
  });

  const [points, setPoints] = useState<PointInput[]>([{
    name: '',
    latitude: null,
    longitude: null,
    how_to_get: '',
    impressions: '',
    photos: [],
    previewUrls: []
  }]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);

  const pointRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const swipeDistance = touchEndX.current - touchStartX.current;
    if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
      if (swipeDistance > 0 && currentPointIndex > 0) {
        previousPoint();
      } else if (swipeDistance < 0 && currentPointIndex < points.length - 1) {
        nextPoint();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    pointRefs.current[currentPointIndex]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [currentPointIndex]);

  const handleTripSubmit = (data: typeof tripData) => {
    setTripData(data);
    setStep(1);
  };

  useEffect(() => {
    if (step !== 'trip') {
      requestAnimationFrame(() => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [step]);       

  const handleLocationSelect = (latlng: LatLng, zoom?: number) => {
    const newPoints = [...points];
    newPoints[currentPointIndex].latitude = latlng.lat;
    newPoints[currentPointIndex].longitude = latlng.lng;
    setPoints(newPoints);
    if (zoom !== undefined) {
      setMapZoomLevels((prev) => ({ ...prev, [currentPointIndex]: zoom }));
    }
    setShowMap(false);
  };

  const addPoint = () => {
    const newPoints = [...points, {
      name: '',
      latitude: null,
      longitude: null,
      how_to_get: '',
      impressions: '',
      photos: [],
      previewUrls: []
    }];
    setPoints(newPoints);
    const newIndex = newPoints.length - 1;
    setCurrentPointIndex(newIndex);
    setStep(newIndex + 1);
  };  

  const removePoint = (index: number) => {
    if (points.length <= 1) {
      setError('маршрут должен содержать хотя бы одну локацию');
      return;
    }
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    if (currentPointIndex >= newPoints.length) {
      setCurrentPointIndex(newPoints.length - 1);
      setStep(newPoints.length);
    } else if (currentPointIndex === index) {
      setStep(currentPointIndex + 1);
    }
  };

  const switchToPoint = (index: number) => {
    setCurrentPointIndex(index);
    setStep(index + 1);
  };  

  const nextPoint = () => {
    if (currentPointIndex < points.length - 1) {
      switchToPoint(currentPointIndex + 1);
    }
  };

  const previousPoint = () => {
    if (currentPointIndex > 0) {
      switchToPoint(currentPointIndex - 1);
    }
  };

  const uploadToYandexCloud = async (file: File, tripId: string, pointId: string, index: number) => {
    try {
      const res = await fetch('https://fastapi-yandex-upload.onrender.com/generate-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          key: `miniINJOY/${tripId}/${pointId}/${Date.now()}-${file.name}`,
          content_type: file.type
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to get upload URL: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const { upload_url, public_url } = await res.json();

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Failed to upload file: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`);
      }

      return public_url;
    } catch (err) {
      console.error('Error in uploadToYandexCloud:', err);
      throw err;
    }
  };

  const validatePoints = () => {
    for (const point of points) {
      if (!point.name || !point.latitude || !point.longitude || !point.how_to_get || !point.impressions) {
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      if (!validatePoints()) {
        setError('Пожалуйста, заполните все поля для каждой точки маршрута');
        return;
      }

      const userId = tg.getUserId() || '00000000-0000-0000-0000-000000000001';

      let mainPhotoUrl = null;
      if (tripData.mainPhoto) {
        const res = await fetch('https://fastapi-yandex-upload.onrender.com/generate-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            key: `miniINJOY/main-photos/${Date.now()}-${tripData.mainPhoto.name}`,
            content_type: tripData.mainPhoto.type
          })
        });

        if (!res.ok) throw new Error('Failed to get upload URL for main photo');

        const { upload_url, public_url } = await res.json();

        const uploadRes = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': tripData.mainPhoto.type,
          },
          body: tripData.mainPhoto
        });

        if (!uploadRes.ok) throw new Error('Failed to upload main photo');
        mainPhotoUrl = public_url;
      }

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          title: tripData.title,
          user_id: userId,
          country: tripData.country,
          location: tripData.location,
          lat: tripData.lat,
          lng: tripData.lng,
          budget: parseInt(tripData.budget.replace(/\s/g, '')),
          start_date: tripData.startDate,
          end_date: tripData.endDate,
          photo_url: mainPhotoUrl,
          is_draft: false,
          is_public: tripData.isPublic,
          likes: 0,
          comments: 0
        })
        .select()
        .single();

      if (tripError) {
        throw new Error(`Failed to create trip: ${tripError.message}`);
      }

      for (let i = 0; i < points.length; i++) {
        const point = points[i];

        const { data: pointData, error: pointError } = await supabase
          .from('points')
          .insert({
            trip_id: trip.id,
            name: point.name,
            latitude: point.latitude,
            longitude: point.longitude,
            how_to_get: point.how_to_get,
            impressions: point.impressions,
            order: i
          })
          .select()
          .single();

        if (pointError) {
          throw new Error(`Failed to create point: ${pointError.message}`);
        }

        for (let j = 0; j < point.photos.length; j++) {
          try {
            const file = point.photos[j];
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
              throw new Error(`Неподдерживаемый формат файла для фото ${j + 1}. Используйте JPEG или PNG`);
            }
            const publicUrl = await uploadToYandexCloud(file, trip.id, pointData.id, j);

            const { error: imageError } = await supabase
              .from('point_images')
              .insert({
                point_id: pointData.id,
                image_url: publicUrl,
                order: j
              });

            if (imageError) {
              throw new Error(`Failed to save image record: ${imageError.message}`);
            }
          } catch (uploadError) {
            throw new Error(`Failed to upload photo ${j + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        }
      }

      navigate(`/trips/${trip.id}`);
    } catch (err) {
      console.error('Error saving trip:', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить маршрут. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b z-10 px-4 py-2">
        <div className="flex items-center">
          <button
            onClick={() => step === 'trip' ? navigate(-1) : setStep(step === 1 ? 'trip' : step - 1)}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isSaving}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold flex-1 text-center">
            {step === 'trip' ? 'Новый маршрут' : `Точка маршрута ${step}`}
          </h1>
          {step !== 'trip' && (
            <button
              onClick={() => removePoint(currentPointIndex)}
              className="p-2 hover:bg-red-100 text-red-500 rounded-full"
              disabled={isSaving}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main
        ref={mainRef} //
        className="max-w-2xl mx-auto p-4 overflow-y-auto max-h-[calc(100vh-56px)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {step === 'trip' ? (
          <TripForm onSubmit={handleTripSubmit} initialData={tripData} />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6 px-2">
              <div className="flex overflow-x-auto no-scrollbar gap-2 snap-x snap-mandatory">
                {points.map((point, index) => (
                  <button
                    key={index}
                    ref={(el) => (pointRefs.current[index] = el)}
                    onClick={() => switchToPoint(index)}
                    disabled={isSaving}
                    title={point.name || `Точка ${index + 1}`}
                    className={`snap-center flex-shrink-0 min-w-[110px] max-w-[140px] px-4 py-1 rounded-full text-sm truncate text-center transition-all ${
                      currentPointIndex === index
                        ? 'bg-[#FA5659] text-white font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {`${index + 1}. ${point.name || 'Название'}`}
                  </button>
                ))}
              </div>
              <button
                onClick={addPoint}
                disabled={isSaving}
                title="Добавить точку"
                className="flex-shrink-0 h-8 px-3 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50"
              >
                <img
                  src="https://storage.yandexcloud.net/my-app-frames/miniINJOY/plus.svg"
                  alt="+"
                  className="w-5 h-5 block"
                />
              </button>
            </div>
              
            <PointForm
              point={points[currentPointIndex]}
              onUpdate={(point) => {
                const newPoints = [...points];
                newPoints[currentPointIndex] = point;
                setPoints(newPoints);
              }}
              onShowMap={() => setShowMap(true)}
              onAddPoint={addPoint}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </>
        )}
      </main>
    
      {showMap && (
        <MapSelector
          onClose={() => setShowMap(false)}
          onSelect={(latlng, zoom) => handleLocationSelect(latlng, zoom)}
          currentPosition={
            points[currentPointIndex].latitude && points[currentPointIndex].longitude
              ? {
                  lat: points[currentPointIndex].latitude,
                  lng: points[currentPointIndex].longitude
                }
              : null
          }
          initialPosition={(() => {
            const current = points[currentPointIndex];
            const previous = points[currentPointIndex - 1];

            if (current?.latitude && current?.longitude) {
              return { lat: current.latitude, lng: current.longitude };
            } else if (previous?.latitude && previous?.longitude) {
              return { lat: previous.latitude, lng: previous.longitude };
            } else if (tripData.lat && tripData.lng) {
              return { lat: tripData.lat, lng: tripData.lng };
            } else if (tripData.country in countryCoords) {
              return countryCoords[tripData.country];
            } else {
              return { lat: 55.7558, lng: 37.6173 };
            }
          })()}
          zoom={
            points[currentPointIndex].latitude && points[currentPointIndex].longitude
              ? 13
              : points[currentPointIndex - 1]?.latitude && points[currentPointIndex - 1]?.longitude
              ? 12
              : tripData.lat && tripData.lng
              ? 13
              : mapZoomLevels[currentPointIndex]
                ?? mapZoomLevels[currentPointIndex - 1]
                ?? 6
          }
          allPoints={points
            .map((p, i) =>
              p.latitude && p.longitude && i !== currentPointIndex
                ? { lat: p.latitude, lng: p.longitude }
                : null
            )
            .filter(Boolean) as { lat: number; lng: number }[]}
        />
      )}
    </div>
  );
}