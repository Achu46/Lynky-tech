import dns from 'node:dns';
import { GoogleGenAI, Type } from '@google/genai';

dns.setDefaultResultOrder('ipv4first');

function toGeminiSchema(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== 'object') return { type: Type.OBJECT };
  const mapType = {
    object: Type.OBJECT,
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY
  };

  const out = {
    type: mapType[jsonSchema.type] || Type.STRING
  };
  if (jsonSchema.description) out.description = jsonSchema.description;
  if (jsonSchema.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(jsonSchema.properties)) {
      out.properties[k] = toGeminiSchema(v);
    }
  }
  if (jsonSchema.required) {
    out.required = jsonSchema.required;
  }
  return out;
}

export class GeminiLlmClient {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async generateTurn({ systemPrompt, messages, tools, signal }) {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: toGeminiSchema(t.parameters)
    }));

    const contents = messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: m.toolName,
                response: { result: m.content }
              }
            }
          ]
        };
      }
      if (m.role === 'model_tool_calls') {
        return {
          role: 'model',
          parts:
            m.rawParts && m.rawParts.length > 0
              ? m.rawParts
              : m.toolCalls.map((tc) => ({
                  functionCall: {
                    name: tc.name,
                    args: tc.args
                  }
                }))
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      };
    });

    let response;
    try {
      response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations }],
          abortSignal: signal
        }
      });
    } catch (err) {
      const msg = String(err?.message || '');
      const isTransient = err?.status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE');
      if (isTransient && this.model !== 'gemini-3.1-flash-lite') {
        response = await this.ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations }],
            abortSignal: signal
          }
        });
      } else {
        throw err;
      }
    }

    const functionCalls = response.functionCalls || [];
    const text = response.text || '';
    const rawParts = response.candidates?.[0]?.content?.parts || null;

    return {
      text,
      rawParts,
      toolCalls: functionCalls.map((fc) => ({
        name: fc.name,
        args: fc.args || {}
      }))
    };
  }
}
