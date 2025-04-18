import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Plane, PartyPopper, MapPinned, Hotel, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL!;

const suggestions = [
  { icon: <Plane className="w-4 h-4 mr-2" />, text: 'Создать новый маршрут', prompt: 'Создай новый маршрут' },
  { icon: <MapPinned className="w-4 h-4 mr-2" />, text: '7-дневная поездка в Сочи', prompt: '7-дневная поездка в Сочи' },
  { icon: <PartyPopper className="w-4 h-4 mr-2" />, text: 'Вдохнови меня, в какую страну поехать', prompt: 'Вдохнови меня, в какую страну поехать' },
  { icon: <Hotel className="w-4 h-4 mr-2" />, text: 'Покажи мне необычные отели', prompt: 'Покажи мне необычные отели' },
];

const rotatingPlaceholders = [
  'Путешествие по Золотому кольцу',
  '5 дней в Карелии',
  'Тур в Сочи с детьми',
  'Романтический маршрут по Казани',
  'Поездка на Алтай на 7 дней',
];

const fallbackSuggestions = [
  '+ Создай маршрут с детьми',
  '+ Найди отель у моря',
  '+ Найди пляжи рядом',
];

export function AiAssistant() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [loading, setLoading] = useState(false);
  type Message = 
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'trip'; content: string };

  const [messages, setMessages] = useState<Message[]>([]);

  const [rotatingSuggestions, setRotatingSuggestions] = useState<string[]>(fallbackSuggestions);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasUserSpoken, setHasUserSpoken] = useState(false);
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      if (hasUserSpoken) return;
      const currentPhrase = rotatingPlaceholders[phraseIndex];
      setPlaceholder(currentPhrase.slice(0, charIndex));
      charIndex++;

      if (charIndex <= currentPhrase.length) {
        timeoutId = setTimeout(type, 70);
      } else {
        setTimeout(() => {
          phraseIndex = (phraseIndex + 1) % rotatingPlaceholders.length;
          charIndex = 0;
          type();
        }, 2000);
      }
    };

    type();
    return () => clearTimeout(timeoutId);
  }, [hasUserSpoken]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getUserId = () => {
    try {
      const tgUserId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (tgUserId) return tgUserId.toString();

      const localId = localStorage.getItem('user_id');
      if (localId) return localId;

      const generated = crypto.randomUUID();
      localStorage.setItem('user_id', generated);
      return generated;
    } catch {
      return 'unknown-user';
    }
  };
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const user_id = getUserId();
        const res = await fetch(`${API_BASE_URL}/api/chat-history?user_id=${user_id}`);
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages.map(msg => ({
            role: msg.role,
            content: msg.message
          })));
        }
      } catch (err) {
        console.error('Ошибка при загрузке истории чата:', err);
      }
    };
  
    fetchHistory();
  }, []);  

  const sendPromptToAI = async (prompt: string) => {
    try {
      const user_id = getUserId();
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt, user_id }),
      });
  
      const data = await res.json();
  
      if (data.suggestions?.length > 0) {
        setRotatingSuggestions(data.suggestions);
      } else {
        setRotatingSuggestions(fallbackSuggestions);
      }
  
      return {
        reply: data.reply,
        tripId: data.tripId || null, // добавляем tripId
      };
    } catch (err) {
      console.error('Ошибка при запросе к AI:', err);
      setRotatingSuggestions(fallbackSuggestions);
      return { reply: 'Произошла ошибка. Попробуйте ещё раз.', tripId: null };
    }
  };  

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;
    setHasUserSpoken(true);
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setInput('');
    setLoading(true);
  
    const aiResponse = await sendPromptToAI(prompt);
  
    if (aiResponse.tripId) {
      setMessages((prev) => [...prev, { role: 'trip', content: aiResponse.tripId }]);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse.reply }]);
    }
  
    setLoading(false);
  };

  function TripCard({ tripId }: { tripId: string }) {
    const navigate = useNavigate();
    const [trip, setTrip] = useState<null | {
      id: string;
      title: string;
      photo_url: string;
    }>(null);
  
    useEffect(() => {
      (async () => {
        const { data } = await supabase
          .from('trips')
          .select('id, title, photo_url')
          .eq('id', tripId)
          .single();
  
        setTrip(data);
      })();
    }, [tripId]);
  
    if (!trip) return <div className="text-sm text-gray-400">Загружаем маршрут...</div>;
  
    return (
      <div
        onClick={() => navigate(`/trips/${trip.id}`)}
        className="cursor-pointer rounded-xl overflow-hidden shadow-md border bg-white max-w-xs"
      >
        {trip.photo_url && (
          <img src={trip.photo_url} alt={trip.title} className="w-full h-32 object-cover" />
        )}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-gray-800">{trip.title}</h3>
          <p className="text-xs text-gray-500">Нажмите, чтобы открыть</p>
        </div>
      </div>
    );
  }  

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-black">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Sparkles className="w-6 h-6 text-[#FA5659]" />
        <h1 className="text-xl font-bold">AI-ассистент путешествий</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="p-4 rounded-xl bg-gray-50 text-sm text-gray-700">
          Привет! Я <span className="font-bold text-[#FA5659]">Joy</span> – твой ассистент по планированию твоего отпуска!
          <br /><br />
          Я с удовольствием помогу Вам с любыми вопросами, касающимися путешествий. Могу подсказать, куда и когда лучше поехать, учту ваши пожелания и состав участников.
          <br /><br />
          Я уже в предвкушении нового приключения! <span className="font-bold text-[#FA5659]">Приступим?</span>
        </div>

        {suggestions.map((sug, index) => (
          <button
            key={index}
            onClick={() => handleSubmit(sug.prompt)}
            className="w-full flex items-center px-4 py-3 border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            {sug.icon}
            {sug.text}
          </button>
        ))}

        {messages.map((msg, idx) => {
          if (msg.role === 'trip') {
            return (
              <div key={idx} className="self-start mr-auto">
                <TripCard tripId={msg.content} />
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl text-sm whitespace-pre-line max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-[#FA5659] text-white self-end ml-auto'
                  : 'bg-gray-100 text-gray-800 self-start mr-auto'
              }`}
            >
              {msg.content}
            </div>
          );
        })}

        {loading && <div className="text-gray-500 text-sm">Joy печатает…</div>}

        <div ref={scrollRef} />
      </div>

      <div className="sticky bottom-0 px-4 py-3 border-t bg-white">
        <div className="relative">
          <textarea
            rows={2}
            placeholder={!hasUserSpoken ? placeholder : 'Введите запрос...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(input);
              }
            }}
            className="w-full resize-none px-4 pr-14 pt-3 pb-10 border border-gray-200 rounded-2xl shadow-sm placeholder-gray-400 text-[15px] outline-none leading-relaxed"
          />
          <button
            onClick={() => handleSubmit(input)}
            className="absolute top-2 right-2 w-9 h-9 bg-[#FA5659] hover:bg-[#e14b4d] text-white rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105"
          >
            ➔
          </button>

          {rotatingSuggestions.length > 0 && (
            <div className="absolute left-3 bottom-[18px] right-3 flex gap-2 overflow-x-auto no-scrollbar">
              {rotatingSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(sug.replace('+ ', ''))}
                  className="flex-shrink-0 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}