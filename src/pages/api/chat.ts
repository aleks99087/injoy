import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // нужен именно service role key
);

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, message } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ error: 'Missing user_id or message' });
  }

  try {
    // 1. Сохраняем сообщение пользователя
    await supabase.from('chat_history').insert({
      user_id,
      role: 'user',
      message
    });

    // 2. Получаем последние 10 сообщений
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, message')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true })
      .limit(10);

    const messages = [
      { role: 'system', content: 'Ты ассистент по путешествиям. Помогай планировать маршруты.' },
      ...(history || []).map((h) => ({ role: h.role, content: h.message })),
    ];

    // 3. Запрос к OpenAI
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages,
      temperature: 0.8,
    });

    const assistantMessage = completion.data.choices[0].message?.content || 'Ошибка генерации';

    // 4. Сохраняем ответ ассистента
    await supabase.from('chat_history').insert({
      user_id,
      role: 'assistant',
      message: assistantMessage
    });

    return res.status(200).json({ reply: assistantMessage });
  } catch (error: any) {
    console.error('AI error:', error);
    return res.status(500).json({ error: 'Ошибка обработки запроса' });
  }
}