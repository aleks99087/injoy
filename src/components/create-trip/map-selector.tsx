import { X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

const redIcon = new L.Icon({
  iconUrl: 'https://storage.yandexcloud.net/my-app-frames/miniINJOY/map-marker.svg',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -35],
});

const numberIcon = (number: number) =>
  new L.DivIcon({
    html: `<div style="background-color: #2563eb; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">${number}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });

type MapSelectorProps = {
  onClose: () => void;
  onSelect?: (latlng: LatLng, zoom?: number) => void;
  currentPosition?: { lat: number; lng: number } | null;
  initialPosition?: { lat: number; lng: number };
  zoom?: number;
  allPoints?: { lat: number; lng: number; name?: string }[];
  title?: string;
};

function CenterMap({ position, zoom }: { position: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([position.lat, position.lng], zoom);
  }, [position, zoom, map]);

  return null;
}

function SearchControl({ onLocationSelect }: { onLocationSelect: (latlng: LatLng, zoom?: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: true,
      showPopup: true,
      marker: {
        draggable: false,
      },
      popupFormat: ({ result }) => result.label,
      maxMarkers: 1,
    });

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (e: any) => {
      const { location, bounds } = e;
      const latlng = { lat: location.y, lng: location.x };

      if (bounds) {
        map.fitBounds([
          [bounds[0][0], bounds[0][1]],
          [bounds[1][0], bounds[1][1]]
        ]);
      } else {
        map.setView(latlng, 12);
      }

      onLocationSelect(latlng, map.getZoom());
    });

    return () => {
      map.removeControl(searchControl);
    };
  }, [map, onLocationSelect]);

  return null;
}

export function MapSelector({
  onClose,
  onSelect,
  currentPosition,
  initialPosition,
  zoom = 10,
  allPoints = [],
  title = 'Выберите место на карте',
}: MapSelectorProps) {
  const fallbackPosition = initialPosition || { lat: 55.7558, lng: 37.6173 };
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(() =>
  currentPosition ? 13 : zoom
  );


  function MapClickHandler() {
    useMapEvents({
      click(e) {
        if (onSelect) {
          setSelectedPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
          setCurrentZoom(e.target.getZoom());
        }
      },
    });
    return null;
  }

  const handleLocationSelect = (latlng: LatLng, zoom?: number) => {
    setSelectedPosition(latlng);
    if (zoom) {
      setCurrentZoom(zoom);
    }
  };

  const isEditable = !!onSelect;
  const canSave = isEditable && selectedPosition;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-semibold truncate max-w-[85%]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[400px]">
          <MapContainer center={fallbackPosition} zoom={zoom} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CenterMap position={fallbackPosition} zoom={zoom} />

            {allPoints.map((p, i) => (
              <Marker
                key={i}
                position={[p.lat, p.lng]}
                icon={currentPosition && p.lat === currentPosition.lat && p.lng === currentPosition.lng ? redIcon : numberIcon(i + 1)}
              >
                <Popup>{p.name || `Точка ${i + 1}`}</Popup>
              </Marker>
            ))}

            {selectedPosition && (
              <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={redIcon}>
                <Popup>Новая точка</Popup>
              </Marker>
            )}

            {isEditable && (
              <>
                <MapClickHandler />
                <SearchControl onLocationSelect={handleLocationSelect} />
              </>
            )}
          </MapContainer>
        </div>

        {isEditable && (
          <div className="p-4 flex justify-end border-t">
            <button
              onClick={() => selectedPosition && onSelect(selectedPosition, currentZoom)}
              className={`bg-[#FA5659] text-white px-4 py-2 rounded-lg transition ${!canSave ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e14b4d]'}`}
              disabled={!canSave}
            >
              Сохранить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
