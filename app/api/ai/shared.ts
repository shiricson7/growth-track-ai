const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
export const OPENAI_MODEL = 'gpt-5.2-2025-12-11';

export const callOpenAI = async (payload: Record<string, unknown>) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || 'OpenAI request failed';
    throw new Error(message);
  }
  return data;
};

export const extractOutputText = (data: any) => {
  if (!data) return '';
  if (typeof data.output_text === 'string') return data.output_text;
  if (Array.isArray(data.output)) {
    const text = data.output
      .map((item: any) =>
        Array.isArray(item.content)
          ? item.content.map((c: any) => (typeof c.text === 'string' ? c.text : '')).join('')
          : ''
      )
      .join('');
    if (text) return text;
  }
  return '';
};

export const extractOutputJson = (data: any) => {
  if (!data || !Array.isArray(data.output)) return null;
  for (const item of data.output) {
    if (!Array.isArray(item.content)) continue;
    const jsonPart = item.content.find((c: any) => c.type === 'output_json');
    if (jsonPart) return jsonPart.json ?? jsonPart;
  }
  return null;
};

export const stripCodeFences = (text: string) =>
  text.replace(/```json/g, '').replace(/```/g, '').trim();

export const safeJsonParse = (text: string) => {
  const cleaned = stripCodeFences(text || '');
  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(cleaned);
  if (parsed) return parsed;

  const match = cleaned.match(/[\{\[][\\s\\S]*[\}\]]/);
  if (match) {
    parsed = tryParse(match[0]);
    if (parsed) return parsed;
  }

  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    const unescaped = tryParse(cleaned);
    if (typeof unescaped === 'string') {
      parsed = tryParse(unescaped);
      if (parsed) return parsed;
    }
  }

  return null;
};
