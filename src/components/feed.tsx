import { useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Heart, MessageCircle, Share2, Menu, User, Plus, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { tg } from '../lib/telegram';
import { Modal } from './ui/modal';
import { LikeButton } from './ui/like-button';
import { AnimatePresence, motion } from 'framer-motion';

type Trip = {
  id: string;
  title: string;
  photo_url: string | null;
  user_id: string;
  created_at: string;
  likes: number;
  comments: number;
  country: string | null;
  points?: { name: string }[]; // Added points field
};

type Comment = {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
};

type ViewMode = 'all' | 'personal';

export function Feed() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTripUrl, setCopiedTripUrl] = useState<string | null>(null);
  const commentContainerRef = useRef<HTMLDivElement>(null);
  const currentUserId = tg.getUser()?.id.toString() || '';
  const [debugInfo, setDebugInfo] = useState<string | null>(null);



  useEffect(() => {
    loadTrips();
  }, [selectedYear, viewMode, searchQuery]);

  const loadTrips = async () => {
    setDebugInfo(`⏳ Загрузка...\ncurrentUserId: ${currentUserId}\nviewMode: ${viewMode}`);
  
    // ⛔️ Если личные маршруты, но нет user_id — не делаем запрос
    if (viewMode === 'personal' && !currentUserId) {
      setTrips([]);
      setLoading(false);
      setError(null);
      setDebugInfo(prev => (prev || '') + '\nℹ️ Пропущен запрос — user_id пустой');
      return;
    }
  
    try {
      let query = supabase
        .from('trips')
        .select('*')
        .eq('is_draft', false);
  
      if (viewMode === 'personal') {
        query = query.eq('user_id', currentUserId);
      } else {
        query = query.eq('is_public', true);
      }
  
      if (selectedYear !== 'all') {
        query = query
          .gte('created_at', `${selectedYear}-01-01`)
          .lt('created_at', `${parseInt(selectedYear) + 1}-01-01`);
      }
  
      const { data, error: tripsError } = await query.order('created_at', { ascending: false });
  
      if (tripsError) throw tripsError;

      let loadedTrips = data || [];

      // Load points for trips
      const tripIds = loadedTrips.map((trip) => trip.id);
      const { data: pointsData, error: pointsError } = await supabase
        .from('points')
        .select('id, name, trip_id')
        .in('trip_id', tripIds);

      if (pointsError) throw pointsError;

      // Map points to trips
      const pointsByTripId: Record<string, { name: string }[]> = {};
      (pointsData || []).forEach((point) => {
        if (!pointsByTripId[point.trip_id]) {
          pointsByTripId[point.trip_id] = [];
        }
        pointsByTripId[point.trip_id].push({ name: point.name });
      });

      loadedTrips = loadedTrips.map((trip) => ({
        ...trip,
        points: pointsByTripId[trip.id] || [],
      }));

      // Filter trips based on search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();

        loadedTrips = loadedTrips.filter((trip) =>
          trip.title.toLowerCase().includes(query) ||
          (trip.country?.toLowerCase().includes(query)) ||
          (trip.location?.toLowerCase().includes(query)) ||
          (trip.points?.some((point) => point.name.toLowerCase().includes(query)))
        );
      }

      setTrips(loadedTrips);
      setDebugInfo(prev => (prev || '') + `\n✅ Загружено ${loadedTrips.length} маршрутов:\n` +
        loadedTrips.map(t => `• ${t.title} (${t.user_id})`).join('\n'));

    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[loadTrips] Failed:', err);
      setError('Failed to load trips');
      setDebugInfo(prev => (prev || '') + `\n❌ Ошибка: ${msg}`);    
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('trip_comments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(prev => ({ ...prev, [tripId]: data || [] }));
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const handleDelete = async (tripId: string) => {
    setTripToDelete(tripId);
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;

    try {
      setDeletingTrip(tripToDelete);
      
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripToDelete);

      if (error) throw error;

      const tripElement = document.querySelector(`[data-trip-id="${tripToDelete}"]`);
      if (tripElement) {
        tripElement.classList.add('scale-95', 'opacity-0');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setTrips(prev => prev.filter(t => t.id !== tripToDelete));
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('Не удалось удалить маршрут. Пожалуйста, попробуйте позже.');
    } finally {
      setDeletingTrip(null);
      setTripToDelete(null);
      setShowMenu(null);
    }
  };

  const toggleComments = async (tripId: string) => {
    if (expandedComments === tripId) {
      setExpandedComments(null);
    } else {
      setExpandedComments(tripId);
      if (!comments[tripId]) {
        await loadComments(tripId);
      }
    }
  };

  const handleSubmitComment = async (tripId: string) => {
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);

      const { data, error } = await supabase
        .from('trip_comments')
        .insert({
          trip_id: tripId,
          user_id: currentUserId,
          text: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Update comments state
      setComments(prev => ({
        ...prev,
        [tripId]: [...(prev[tripId] || []), data]
      }));

      // Update trip comments count
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        await supabase
          .from('trips')
          .update({ comments: (trip.comments || 0) + 1 })
          .eq('id', tripId);

        setTrips(prev =>
          prev.map(t =>
            t.id === tripId ? { ...t, comments: (t.comments || 0) + 1 } : t
          )
        );
      }

      setNewComment('');
      setTimeout(() => {
        commentContainerRef.current?.scrollTo({
          top: commentContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);      
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => loadTrips()} className="text-[#FA5659] hover:underline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">
              IN<span className="text-[#FA5659]">JOY</span>
            </h1>
            <div className="flex items-center space-x-4">
              {viewMode === 'personal' && (
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <User className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-1 rounded-full text-sm ${
                  viewMode === 'all'
                    ? 'bg-[#FA5659] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Все маршруты
              </button>
              <button
                onClick={() => setViewMode('personal')}
                className={`px-4 py-1 rounded-full text-sm ${
                  viewMode === 'personal'
                    ? 'bg-[#FA5659] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Мои маршруты
              </button>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Поиск по маршрутам, локациям и странам"
              className="w-full p-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FA5659]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main
        className="max-w-2xl mx-auto p-4 space-y-4 transition-opacity duration-300"
        style={{ opacity: loading ? 0.3 : 1 }}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FA5659]" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {viewMode === 'personal' 
                ? 'У вас пока нет приключений'
                : 'Приключений пока нет'}
            </p>
            <button
              onClick={() => navigate('/create')}
              className="text-[#FA5659] hover:underline"
            >
              Создать первое приключение
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${selectedYear}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 gap-4"
            >
              {selectedYear !== 'all' && (
                <h2 className="text-2xl font-bold">{selectedYear}</h2>
              )}
              {trips.map((trip) => (
                <article
                  key={trip.id}
                  data-trip-id={trip.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 ${
                    deletingTrip === trip.id ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                  }`}
                >
                  <div className="relative">
                    <div className="relative aspect-[5/4] w-full overflow-hidden">
                      <img
                        src={trip.photo_url || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'}
                        alt={trip.title}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button
                        onClick={() => setShowShareMenu(trip.id)}
                        className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      {viewMode === 'personal' && (
                        <button
                          onClick={() => setShowMenu(trip.id)}
                          className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white"
                        >
                          <Menu className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {showShareMenu === trip.id && (
                      <div className="absolute top-12 right-2 bg-white rounded-lg shadow-lg p-2 z-20">
                        <button
                          onClick={() => {
                            const version = Date.now();
                            const shareUrl = `https://functions.yandexcloud.net/d4etklk1qgrtvu71maeu?id=${trip.id}&v=${version}`;
                            const caption = `${trip.title} — маршрут в INJOY`;

                            // Отправляем ссылку с превью (страница функции), Telegram покажет OG preview
                            // Но внутри пользователь увидит кнопку "Открыть в Telegram", которая откроет Mini App
                            window.open(
                              `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption)}`
                            );

                            setShowShareMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                        >
                          Поделиться в Telegram
                        </button>
                        <button
                          onClick={() => {
                            const shareUrl = `https://functions.yandexcloud.net/d4etklk1qgrtvu71maeu?id=${trip.id}`;
                            navigator.clipboard.writeText(shareUrl);
                            setCopiedTripUrl(shareUrl);
                            setShowShareMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                        >
                          Скопировать ссылку
                        </button>
                      </div>
                    )}
                    {showMenu === trip.id && (
                      <div className="absolute top-12 right-2 bg-white rounded-lg shadow-lg p-2 z-20">
                        <button
                          onClick={() => handleDelete(trip.id)}
                          className="block w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h2 className="text-lg font-semibold">{trip.title}</h2>

                      <div className="flex items-center text-sm text-gray-500">
                        {trip.country && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {trip.country}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <LikeButton tripId={trip.id} initialCount={trip.likes} userId={currentUserId} />
                        <button
                          className="flex items-center text-gray-600"
                          onClick={() => toggleComments(trip.id)}
                        >
                          <MessageCircle className="w-5 h-5 mr-1" />
                          <span>{trip.comments}</span>
                        </button>
                      </div>

                      <div className="text-xs text-gray-400">
                        by Test User • {new Date(trip.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {expandedComments === trip.id && (
                      <div className="bg-white border rounded-xl mt-4 p-4 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h2 className="text-lg font-semibold">Комментарии</h2>
                          <button
                            onClick={() => setExpandedComments(null)}
                            className="flex items-center text-sm text-gray-500 hover:underline"
                          >
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Свернуть
                          </button>
                        </div>

                        <div
                          ref={commentContainerRef}
                          className="space-y-4 max-h-[200px] overflow-y-auto pr-1"
                        >
                          {comments[trip.id]?.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white">
                              {typeof comment.user_id === 'string' && comment.user_id.length > 0
                                ? comment.user_id[0].toUpperCase()
                                : 'U'}
                              </div>
                              <div>
                                <div className="text-sm text-gray-800 font-semibold">
                                {typeof comment.user_id === 'string' ? comment.user_id.slice(0, 6) : 'user'}
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
                            onClick={() => handleSubmitComment(trip.id)}
                            disabled={submittingComment || !newComment.trim()}
                            className="mt-2 w-full bg-[#FA5659] text-white rounded-lg py-2 hover:bg-[#E04E51] disabled:opacity-50"
                          >
                            Отправить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <button
        className="fixed bottom-20 right-4 bg-[#FA5659] text-white p-4 rounded-full shadow-lg hover:bg-[#E04E51] transition-colors"
        onClick={() => navigate('/create')}
      >
        <Plus className="w-6 h-6" />
      </button>

      <Modal
        isOpen={!!tripToDelete}
        onClose={() => setTripToDelete(null)}
        onConfirm={confirmDelete}
        title="Удаление маршрута"
        description="Вы уверены, что хотите удалить этот маршрут? Это действие нельзя будет отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
      <Modal
        isOpen={!!copiedTripUrl}
        onClose={() => setCopiedTripUrl(null)}
        onConfirm={() => setCopiedTripUrl(null)}
        title="Ссылка скопирована"
        description="Вы можете вставить её в чат, заметки или сохранить себе"
        confirmText="Ок"
        cancelText=""
      />
      {debugInfo && (
        <pre className="fixed bottom-4 left-4 bg-black/70 text-white text-xs p-3 rounded-lg max-w-[90vw] max-h-[40vh] overflow-auto z-50">
          {debugInfo}
        </pre>
      )}
    </div>
  );
}