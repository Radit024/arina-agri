const { GoogleGenerativeAI } = require('@google/generative-ai');

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

async function generateGeminiReply({ prompt, context }) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY belum diisi di env backend.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const instruction = [
    'Anda adalah Arina AI Assistant untuk petani cabai di Indonesia.',
    'Jawab dalam Bahasa Indonesia dengan gaya ringkas, praktis, dan aplikatif.',
    'Berikan langkah terstruktur jika diminta penanganan penyakit/hama.',
    'Jika data kurang, tanyakan pertanyaan klarifikasi singkat.',
  ].join(' ');

  const mergedPrompt = `${instruction}\n\nKonteks percakapan:\n${context || '-'}\n\nPertanyaan pengguna:\n${prompt}`;
  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    throw new Error('Gemini tidak mengembalikan respons teks.');
  }

  return text.trim();
}

module.exports = {
  generateGeminiReply,
};
