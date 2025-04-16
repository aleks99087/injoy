import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, message } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ error: 'Missing user_id or message' });
  }

  try {
    // 1. Сохраняем сообщение пользователя
    await supabase.from('chat_history').insert({ user_id, role: 'user', message });

    // 2. Получаем последние сообщения
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, message')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true })
      .limit(10);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: 'Ты ассистент по путешествиям. Помогай планировать маршруты.',
      },
      ...(history || []).map((h) => ({
        role: h.role as 'user' | 'assistant' | 'system',
        content: h.message,
      })),
    ];

    // 3. Запрос к OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.8,
    });

    const assistantMessage = completion.choices[0].message.content || 'Ошибка генерации';

    // 4. Сохраняем ответ ассистента
    await supabase.from('chat_history').insert({
      user_id,
      role: 'assistant',
      message: assistantMessage,
    });

    return res.status(200).json({ reply: assistantMessage });
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({ error: 'Ошибка генерации' });
  }
}