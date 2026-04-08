import { GoogleGenAI } from '@google/genai'

export async function callGemini(
  apiKey: string,
  imageBase64: string,
  columnNames: string[],
  customPrompt?: string
): Promise<{ rows: Record<string, string>[] }> {
  const ai = new GoogleGenAI({ apiKey })

  // 열 이름 기반 동적 JSON 스키마
  const responseJsonSchema = {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: Object.fromEntries(
            columnNames.map(name => [name, { type: 'string' }])
          ),
          required: columnNames
        }
      }
    },
    required: ['rows']
  }

  let prompt = `이 이미지에서 데이터를 추출하세요. 다음 열에 맞게 구조화된 데이터로 반환하세요: ${columnNames.join(', ')}

각 행의 데이터를 정확히 추출하고, 이미지에서 찾을 수 있는 모든 행을 포함하세요.
값이 없는 경우 빈 문자열("")을 사용하세요.`

  if (customPrompt) {
    prompt += `\n\n추가 지시사항:\n${customPrompt}`
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema
    }
  })

  const text = response.text ?? ''
  return JSON.parse(text)
}
