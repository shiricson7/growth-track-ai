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

export const stripCodeFences = (text: string) =>
  text.replace(/```json/g, '').replace(/```/g, '').trim();
