import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { tg } from '../../lib/telegram';

type Comment = {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
};

type CommentModalProps = {
  tripId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
};

export function CommentModal({ tripId, onClose, onCommentAdded }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = tg.getUser()?.id.toString() || 'anonym';

  useEffect(() => {
    const loadComments = async () => {
      const { data, error } = await supabase
        .from('trip_comments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      console.log('COMMENTS:', data, 'ERROR:', error); // Log comments and errors

      if (!error) {
        setComments(data);
      } else {
        console.error('Ошибка загрузки комментариев:', error);
      }
    };

    loadComments();
  }, [tripId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('trip_comments')
      .insert({ trip_id: tripId, user_id: userId, text: newComment })
      .select()
      .single();

    if (!error && data) {
      setComments([...comments, data]);
      setNewComment('');

      // обновим счетчик
      await supabase
        .from('trips')
        .update({ comments: comments.length + 1 })
        .eq('id', tripId);

      onCommentAdded?.(); // для Feed обновим счетчик комментариев
    } else {
      console.error('Ошибка отправки комментария:', error);
    }

    setLoading(false);
  };

  return (
    <div className="bg-white border rounded-xl mt-4 p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Комментарии</h2>
        <button
          onClick={onClose}
          className="flex items-center text-sm text-gray-500 hover:underline"
        >
          <ChevronUp className="w-4 h-4 mr-1" />
          Свернуть
        </button>
      </div>

      <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white">
              {comment.user_id[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-sm text-gray-800 font-semibold">
                {comment.user_id.slice(0, 6)}
              </div>
              <div className="text-sm text-gray-600">{comment.text}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <textarea
          rows={2}
          placeholder="Напишите комментарий..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full p-2 border rounded-lg text-sm"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !newComment.trim()}
          className="mt-2 w-full bg-[#FA5659] text-white rounded-lg py-2 hover:bg-[#E04E51] disabled:opacity-50"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
