/**
 * Serverless API: /api/chat
 * POST { messages: [{role, content}] } → { reply: "..." }
 * Vercel env: GROQ_API_KEY
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile'; // актуальна модель Groq (вересень 2026)

const SYSTEM = `Ти — асистент компанії TechPlast, студії 3D-друку в Києві (Україна).
Відповідай коротко, дружньо, завжди українською.
Якщо питання не про 3D-друк — переведи тему.

TechPlast: обладнання Bambu Lab, точність 0.05 мм, від 1 шт., від 1 дня.
Матеріали: PLA, PETG, ABS, ASA, PC, TPU, PA-CF, PET-CF.
Ціна: від 1 грн 15 коп/г без ПДВ. Доставка: Нова Пошта по Україні.
Замовлення: через форму на сайті або Telegram. NDA за запитом.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: 'messages required' });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM }, ...messages.slice(-8)],
        max_tokens: 400,
        temperature: 0.6
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Groq error:', r.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Groq error', status: r.status, detail: data });
    }

    return res.status(200).json({ reply: data.choices?.[0]?.message?.content ?? '' });
  } catch (e) {
    console.error('Chat error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
