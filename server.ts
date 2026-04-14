import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.GEMINI_API_KEY || '';
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey });

app.use(express.json({ limit: '25mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, model });
});

app.post('/api/analyze', async (req, res) => {
  try {
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const { images, description, medicalHistory } = req.body ?? {};

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'At least one image is required.' });
      return;
    }

    const prompt = `
You are a specialized medical AI assistant. A user has provided multiple photos of a health concern (e.g., a rash, tooth issue, or wound) and a description.

User Description: ${String(description || '')}
User Medical History: ${String(medicalHistory || 'None provided.')}

Please analyze the images and the provided context.
1. Provide a preliminary assessment of what the issue might be.
2. Suggest immediate self-care steps if applicable.
3. Advise on when to seek urgent medical attention.
4. Note that this is an AI assessment and they should wait for a doctor's review.

Keep the response professional, empathetic, and clear. Use Markdown for formatting.
`;

    const imageParts = images.map((image: string) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: image.split(',')[1] || image,
      },
    }));

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [...imageParts, { text: prompt }] },
    });

    res.json({ text: response.text || '' });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'AI analysis failed. Please try again later.' });
  }
});

app.listen(port, () => {
  console.log(`Gemini API server running on http://localhost:${port}`);
});