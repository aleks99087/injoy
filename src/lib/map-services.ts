const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248cb9505be617041eba58cfa7236a89d12';

export async function searchPlaces(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}`
  );
  const data = await response.json();
  return data.map((item: any) => ({
    id: item.place_id,
    name: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }));
}

export async function getRoute(points: { lat: number; lng: number }[]) {
  if (points.length < 2) return null;

  const coordinates = points.map((p) => [p.lng, p.lat]).join(';');
  const response = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: OPENROUTE_API_KEY,
      },
      body: JSON.stringify({
        coordinates: points.map((p) => [p.lng, p.lat]),
      }),
    }
  );

  const data = await response.json();
  return data;
}

export async function geocode(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`
  );
  const data = await response.json();
  if (data.length === 0) return null;

  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  };
}

export async function reverseGeocode(lat: number, lon: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  );
  const data = await response.json();
  return {
    display_name: data.display_name,
    address: data.address,
  };
}