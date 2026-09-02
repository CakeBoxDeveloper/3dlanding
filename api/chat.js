/**
 * Serverless API: /api/chat
 * Принимает POST { messages: [{role, content}] }
 * Возвращает { reply: "..." }
 *
 * Переменные окружения (Vercel):
 *   GROQ_API_KEY  — ключ от Groq (https://console.groq.com)
 *   AI_MODEL      — модель (необязательно, по умолчанию mixtral-8x7b-32768)
 */

const { COMPANY_KNOWLEDGE } = require('./knowledge');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'mixtral-8x7b-32768';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  // Ограничиваем историю — последние 10 сообщений чтобы не выходить за лимит токенов
  const recentMessages = messages.slice(-10);

  const payload = {
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: COMPANY_KNOWLEDGE
      },
      ...recentMessages
    ],
    max_tokens: 512,
    temperature: 0.5
  };

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return res.status(502).json({ error: 'AI service error', details: errText });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
