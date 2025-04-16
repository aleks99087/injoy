import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sparkles, Plane, PartyPopper, MapPinned, ArrowLeft } from 'lucide-react';

const suggestions = [
  { icon: <Plane className="w-4 h-4 mr-2" />, text: 'Создать новое летнее путешествие', prompt: 'летнее путешествие по России' },
  { icon: <MapPinned className="w-4 h-4 mr-2" />, text: 'Поездка на юг Сочи', prompt: 'поездка на юг Сочи' },
  { icon: <PartyPopper className="w-4 h-4 mr-2" />, text: 'День рождения на Алтае', prompt: 'день рождения на Алтае' },
];

const rotatingPlaceholders = [
  'Путешествие по Золотому кольцу',
  '7 дней в Карелии',
  'Тур в Сочи с детьми',
  'Романтический маршрут по Казани',
  'Поездка на Алтай на 7 дней',
];

export function AiAssistant() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
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
  }, []);

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

  const sendPromptToAI = async (prompt: string) => {
    try {
      const user_id = getUserId();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt, user_id }),
      });

      const data = await res.json();
      return data.reply;
    } catch (err) {
      console.error('Ошибка при запросе к AI:', err);
      return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  };

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;
    setLoading(true);
    const aiReply = await sendPromptToAI(prompt);
    setReply(aiReply);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-black">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Sparkles className="w-6 h-6 text-[#FA5659]" />
          <h1 className="text-xl font-bold">AI-ассистент путешествий</h1>
        </div>
      </div>

      <div className="relative mb-6">
        <textarea
          rows={3}
          placeholder={placeholder || 'Напишите запрос...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(input);
            }
          }}
          className="w-full resize-none px-4 pr-14 py-4 border border-gray-200 rounded-2xl shadow-sm placeholder-gray-400 text-[15px] outline-none leading-relaxed"
          style={{ minHeight: '76px' }}
        />
        <button
          onClick={() => handleSubmit(input)}
          className="absolute bottom-3 right-2 w-9 h-9 bg-[#FA5659] hover:bg-[#e14b4d] text-white rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105"
        >
          ➔
        </button>
      </div>

      <div className="space-y-3">
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
      </div>

      {loading && (
        <div className="text-center text-gray-500 mt-10">Генерируем маршрут…</div>
      )}

      {reply && !loading && (
        <div className="mt-8 p-4 border rounded-xl bg-gray-50 text-sm text-gray-700 whitespace-pre-line">
          {reply}
        </div>
      )}
    </div>
  );
}