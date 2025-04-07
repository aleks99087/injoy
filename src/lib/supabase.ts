import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Trip = {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  country: string | null;
  photo_url: string | null;
  likes: number;
  comments: number;
  budget: number;
  start_date: string;
  end_date: string;
};

export type Point = {
  id: string;
  trip_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  order: number;
  created_at: string;
  how_to_get: string | null;
  impressions: string | null;
  rating: number | null;
  map_url: string | null;
};

export type PointImage = {
  id: string;
  point_id: string;
  image_url: string;
  created_at: string;
  order: number;
};

export async function getTrip(id: string) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (tripError) throw tripError;

  const { data: points, error: pointsError } = await supabase
    .from('points')
    .select('*')
    .eq('trip_id', id)
    .order('order');

  if (pointsError) throw pointsError;

  return { trip, points };
}