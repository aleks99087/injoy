import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type LikeButtonProps = {
  tripId: string;
  initialCount: number;
  userId: string;
};

export function LikeButton({ tripId, initialCount, userId }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkLiked = async () => {
      const { data } = await supabase
        .from('trip_likes')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      setLiked(!!data);
    };

    checkLiked();
  }, [tripId, userId]);

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (liked) {
        // Удаляем лайк
        await supabase
          .from('trip_likes')
          .delete()
          .eq('trip_id', tripId)
          .eq('user_id', userId);

        await supabase
          .from('trips')
          .update({ likes: likes - 1 })
          .eq('id', tripId);

        setLikes((prev) => prev - 1);
        setLiked(false);
      } else {
        // Добавляем лайк
        await supabase
          .from('trip_likes')
          .insert({ trip_id: tripId, user_id: userId });

        await supabase
          .from('trips')
          .update({ likes: likes + 1 })
          .eq('id', tripId);

        setLikes((prev) => prev + 1);
        setLiked(true);
      }
    } catch (err) {
      console.error('Ошибка при переключении лайка:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`flex items-center text-sm ${liked ? 'text-[#FA5659]' : 'text-gray-600'}`}
      onClick={toggleLike}
      disabled={loading}
    >
      <Heart className="w-5 h-5 mr-1" fill={liked ? '#FA5659' : 'none'} />
      {likes}
    </button>
  );
}