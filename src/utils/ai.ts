const API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '').trim();

// Tried in order. If one is busy, the app moves to the next.
const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.5-flash-lite'];

const PROMPT = `You are a nutrition assistant. Look at this photo of a meal and estimate the nutrition of the whole portion shown.
Reply with ONLY a JSON object in this exact shape:
{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number}
"name" is a short meal name. "calories" is kcal. "protein", "carbs" and "fat" are grams.
If there is no food in the photo, reply {"error": "no food"}.`;

export type MealEstimate = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BUSY_STATUSES = [
  'UNAVAILABLE',
  'RESOURCE_EXHAUSTED',
  'INTERNAL',
  'DEADLINE_EXCEEDED',
];
const BUSY_CODES = [429, 500, 503, 504];

async function callGemini(body: object) {
  if (!API_KEY) {
    throw new Error(
      'Missing API key. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file and restart with: npx expo start -c',
    );
  }

  let lastMessage = 'The AI request failed.';

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY,
          },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!data.error) return data;

      lastMessage = data.error.message || lastMessage;

      // This model name doesn't exist for your key: try the next one.
      if (data.error.code === 404) break;

      const retryable =
        BUSY_CODES.includes(res.status) ||
        BUSY_CODES.includes(Number(data.error.code)) ||
        BUSY_STATUSES.includes(data.error.status) ||
        /high demand|overloaded|try again/i.test(lastMessage);

      // Any other error (bad key, bad request) won't fix itself: stop now.
      if (!retryable) throw new Error(lastMessage);

      await sleep(1000 * 2 ** attempt); // wait 1s, 2s, 4s then retry
    }
  }

  throw new Error(
    'The AI is busy right now. Please wait a minute and try again.',
  );
}

export async function analyzeMealImage(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<MealEstimate> {
  const data = await callGemini({
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('The AI did not return a result. Try another photo.');

  let parsed: any;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Could not read the AI response. Please try again.');
  }

  if (parsed.error) throw new Error('No food detected in that photo.');

  const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
  return {
    name: String(parsed.name ?? '').trim() || 'Meal',
    calories: num(parsed.calories),
    protein: num(parsed.protein),
    carbs: num(parsed.carbs),
    fat: num(parsed.fat),
  };
}