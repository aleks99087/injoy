export type PointInput = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  how_to_get: string;
  impressions: string;
  photos: File[];
  previewUrls: string[];
};