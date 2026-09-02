/**
 * Serverless API: /api/chat
 * POST { messages: [{role, content}] } → { reply: "..." }
 *
 * Vercel Environment Variables:
 *   GROQ_API_KEY  — ключ с https://console.groq.com
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192'; // актуальная бесплатная модель Groq

const SYSTEM_PROMPT = `Ти — онлайн-асистент компанії ТехПласт, студії промислового 3D-друку в Миколаєві, Україна.
Відповідай лаконічно, привітно і по суті. Завжди пиши українською мовою.
Якщо питання не стосується 3D-друку або компанії — ввічливо переведи тему.

=== ПРО КОМПАНІЮ ===
Назва: ТехПласт (TechPlast) | Місто: Миколаїв | Принтерів: 220 | Точність: ±0.02 мм | Запуск: від 15 хв
Виробництво: до 1 000 виробів на добу

=== НАПРЯМКИ ===
1. MILTECH/DEFTECH — корпуси БПЛА, адаптери Picatinny/M-LOK, лоадери, скиди. Матеріали: PETG-CF, PA12, PC, ASA. Темп: −40..+95°C
2. ДЕТАЛІ ТА ЗАПЧАСТИНИ — прес-форми, корпуси, адаптери. Прототип за 24 год, малі/середні серії
3. ДЕКОР HoReCa — світильники, підставки, меню-тримачі, номерки, колекційні фігурки
4. БРЕНДИНГ — логотипи об'ємні, бейджи, таблички, корпоративні подарунки
5. ІНДИВІДУАЛЬНИЙ ДРУК — будь-яка геометрія за файлами STL/STEP/OBJ/3MF, від 1 шт

=== МАТЕРІАЛИ ===
PLA, PETG, PETG-CF, ASA, Nylon PA12, PC, TPU, Resin (SLA)

=== ЦІНИ ТА ТЕРМІНИ ===
Розрахунок індивідуальний за файлом. Мінімум від 1 шт. Знижки від 50+ шт.
Прототип: 24 год | Серія: від 3 діб | Оплата: 50% передоплата | Доставка: Нова Пошта

=== ГАРАНТІЇ ===
Безкоштовне повторне виготовлення при дефекті. Фото/відео звіт. NDA за запитом.

=== FAQ ===
Мінімальне замовлення: від 1 шт.
Формати файлів: STL, STEP, OBJ, 3MF. Не приймаємо запаролені архіви.
Вартість: надішліть файл — розрахуємо за 2 години.
Знижки: від 50 шт.
NDA: підписуємо.
Військові замовлення: так, БПЛА, дрони, тактичне спорядження.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel Environment Variables' });
  }

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10)
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

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq error:', groqRes.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Groq API error', status: groqRes.status, detail: data });
    }

    const reply = data.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat function error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
