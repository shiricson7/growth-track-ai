import { NextResponse } from 'next/server';
import { callOpenAI, extractOutputText, OPENAI_MODEL, safeJsonParse } from '../shared';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI 기능이 비활성화되어 있습니다.' }, { status: 503 });
    }

    const body = await request.json();
    const { base64, mimeType } = body || {};

    if (!base64 || !mimeType) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const prompt = `
Analyze this medical lab report image and extract the following:
1) Sample collection date (검체채취일/ 검체채혈일 / 채혈일 / 채취일 / Sample Collection Date).
   - It is located immediately next to the label text.
   - If multiple dates exist, prefer the one next to those labels (not the report/print date).
   - Return in ISO format YYYY-MM-DD if possible; otherwise null.

2) The following lab values if they exist:
   - IGFBP-3
   - Free T4
   - TSH
   - LH
   - FSH
   - Estradiol (E2)
   - Somatomedin-C (IGF-1)
   - Testosterone

Return ONLY valid JSON with this structure:
{
  "collectionDate": "YYYY-MM-DD" | null,
  "results": [
    {
      "parameter": "Name of the test (e.g., TSH)",
      "value": number (numeric value only),
      "unit": "unit string (e.g., uIU/mL)",
      "referenceRange": "reference range string",
      "status": "normal" | "high" | "low" (infer based on reference range)
    }
  ]
}

Do not include markdown formatting or extra text.
`;

    const imageUrl = `data:${mimeType};base64,${base64}`;

    const payload = {
      model: OPENAI_MODEL,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: imageUrl },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'lab_ocr',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              collectionDate: { type: ['string', 'null'] },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    parameter: { type: 'string' },
                    value: { type: 'number' },
                    unit: { type: 'string' },
                    referenceRange: { type: 'string' },
                    status: { type: 'string' },
                  },
                  required: ['parameter', 'value', 'unit', 'referenceRange', 'status'],
                },
              },
            },
            required: ['collectionDate', 'results'],
          },
        },
      },
      temperature: 0.1,
      max_output_tokens: 1200,
    };

    const result = await callOpenAI(payload);
    const text = extractOutputText(result);
    const data = safeJsonParse(text);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI OCR error', error);
    return NextResponse.json({ error: error?.message || 'AI OCR 실패' }, { status: 500 });
  }
}
