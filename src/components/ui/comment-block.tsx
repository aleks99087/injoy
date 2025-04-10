import { useEffect, useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { tg } from '../../lib/telegram';

type Comment = {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  users?: {
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  };
};

type CommentBlockProps = {
  tripId: string;
};

export function CommentBlock({ tripId }: CommentBlockProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = tg.getUser()?.id.toString() || 'anonymous';
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('trip_comments')
      .select('*, users(id, first_name, last_name, photo_url)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Ошибка загрузки комментариев:', error);
    } else {
      setComments(data || []);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadComments();
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expanded]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      setSubmitting(true);
  
      const { data, error } = await supabase
        .from('trip_comments')
        .insert({
          trip_id: tripId,
          user_id: currentUserId,
          text: newComment.trim(),
        })
        .select('*, users(id, first_name, last_name, photo_url)')
        .single();
  
      if (error) throw error;
  
      // 🔧 Явно мержим users
      setComments((prev) => [...prev, { ...data, users: data.users }]);
      setNewComment('');
    } catch (err) {
      console.error('Ошибка отправки комментария:', err);
    } finally {
      setSubmitting(false);
    }
  };  

  return (
    <div className="px-4 py-4 text-sm text-gray-700 border-t bg-white">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold text-gray-800">Комментарии</div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center text-sm text-gray-500 hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Развернуть
            </>
          )}
        </button>
      </div>

      {expanded && (
        <>
          {comments.length === 0 ? (
            <div className="text-gray-400 italic">Пока нет комментариев</div>
          ) : (
            <div className="space-y-4 h-[200px] overflow-y-auto pr-1 mb-4">
              {comments.map((comment) => {
                const initials = (comment.users?.first_name?.[0] || '') + (comment.users?.last_name?.[0] || '');
                const fullName = `${comment.users?.first_name || ''} ${comment.users?.last_name || ''}`.trim();

                return (
                  <div key={comment.id} className="flex items-start gap-2">
                    {comment.users?.photo_url ? (
                      <img
                        src={comment.users.photo_url}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                        {initials || 'A'}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{fullName || 'Аноним'}</div>
                      <div className="text-gray-700">{comment.text}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sticky bottom-0 bg-white pt-2">
            <textarea
              ref={inputRef}
              rows={2}
              placeholder="Напишите комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm h-[60px]"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className="mt-2 w-full bg-[#FA5659] text-white rounded-lg py-2 hover:bg-[#E04E51] disabled:opacity-50 h-[40px]"
            >
              Отправить
            </button>
          </div>
        </>
      )}
    </div>
  );
}