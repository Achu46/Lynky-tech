import dns from 'node:dns';
import { GoogleGenAI, Type } from '@google/genai';
import { serviceFetch } from '@pocket-operator/shared';

dns.setDefaultResultOrder('ipv4first');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const RETRY_DELAYS_MS = [0, 450, 1100];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableLlmError(err) {
  const status = err?.status ?? err?.code;
  const msg = String(err?.message || '');
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|ECONNRESET|ETIMEDOUT|fetch failed|timeout/i.test(
      msg
    )
  );
}

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

function normalizeContents(messages) {
  const raw = messages.map((m) => {
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
      parts: [{ text: String(m.content || '') }]
    };
  });

  // Merge consecutive same-role turns so Gemini never rejects adjacent user turns.
  const merged = [];
  for (const item of raw) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === item.role) {
      prev.parts.push(...item.parts);
    } else {
      merged.push({ role: item.role, parts: [...item.parts] });
    }
  }
  return merged;
}

function extractBudgetFromText(text) {
  const m = text.match(
    /(?:^|[^a-zA-Z0-9_])(?:rs\.?|inr|₹|under|below|max|budget|upto|up to)?\s*(\d+(?:\.\d+)?)(?:\s*(?:rs|inr|rupees?))?(?:$|[^a-zA-Z0-9_])/i
  );
  return m ? Number(m[1]) : null;
}

function extractVegFromText(text) {
  if (/\b(non-veg|non veg|nonveg|non vegetarian|non-vegetarian|chicken|egg|fish|mutton|prawn|meat)\b/i.test(text)) {
    return false;
  }
  if (/\b(veg|vegetarian)\b/i.test(text)) {
    return true;
  }
  return null;
}

async function buildCatalogFallbackTurn({ catalogUrl, messages }) {
  if (!catalogUrl) {
    return null;
  }
  const userMsgs = messages.filter((m) => m.role === 'user' && typeof m.content === 'string');
  const lastUserMsg = userMsgs[userMsgs.length - 1]?.content || '';
  const combinedUserText = userMsgs.map((m) => m.content).join(' ');
  const maxPrice = extractBudgetFromText(lastUserMsg) ?? extractBudgetFromText(combinedUserText);
  const vegPref = extractVegFromText(lastUserMsg) ?? extractVegFromText(combinedUserText);
  const wantsOrder = /\b(order|buy|book|prepare|cheapest|get me|place)\b/i.test(combinedUserText);

  const res = await serviceFetch(catalogUrl, '/dishes/search?include_unavailable=true').catch(
    () => null
  );
  if (!res?.ok || !Array.isArray(res.data?.dishes)) {
    return null;
  }

  const allDishes = res.data.dishes;
  const available = allDishes.filter((d) => {
    if (!d.is_available) return false;
    if (maxPrice !== null && d.price > maxPrice) return false;
    if (vegPref !== null && Boolean(d.is_vegetarian) !== vegPref) return false;
    return true;
  });

  if (wantsOrder && maxPrice !== null && vegPref !== null && available.length > 0) {
    const chosen = available[0];
    return {
      text: '',
      rawParts: null,
      toolCalls: [
        {
          name: 'prepare_order',
          args: {
            dish_id: chosen.id,
            max_price: maxPrice,
            vegetarian: vegPref,
            wants_directions: /\b(direction|map|route|how to get|navigate|where)\b/i.test(
              lastUserMsg
            )
          }
        }
      ]
    };
  }

  if (available.length === 0) {
    const cheapestAll = allDishes.filter((d) => d.is_available);
    const listText = cheapestAll
      .map((d) => `- ${d.name} (${d.is_vegetarian ? 'Veg' : 'Non-Veg'}) at ${d.restaurant_name}: Rs ${d.price}`)
      .join('\n');
    return {
      text:
        maxPrice !== null
          ? `No available dishes matched Rs ${maxPrice}${vegPref === true ? ' (Veg)' : vegPref === false ? ' (Non-Veg)' : ''}. Available menu items:\n${listText}`
          : `Here are the available menu items:\n${listText}`,
      rawParts: null,
      toolCalls: []
    };
  }

  const lines = available.map(
    (d) =>
      `- ${d.name} (${d.is_vegetarian ? 'Veg' : 'Non-Veg'}) from ${d.restaurant_name}: Rs ${d.price}`
  );
  const heading =
    maxPrice !== null
      ? `Here are the ${available.length} available dishes under Rs ${maxPrice}:`
      : `Here are the ${available.length} available dishes on the menu:`;

  return {
    text: `${heading}\n${lines.join('\n')}\n\nTell me if you would like to prepare an order for the cheapest matching option.`,
    rawParts: null,
    toolCalls: []
  };
}

export class GeminiLlmClient {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    model = DEFAULT_MODEL,
    catalogUrl = () => process.env.CATALOG_URL || 'http://127.0.0.1:3001'
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.catalogUrl = catalogUrl;
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  getCatalogUrl() {
    return typeof this.catalogUrl === 'function' ? this.catalogUrl() : this.catalogUrl;
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

    const contents = normalizeContents(messages);
    const candidateModels = [...new Set([this.model, 'gemini-3.1-flash-lite'])];

    let response;
    let lastError = null;

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
      if (signal?.aborted) {
        break;
      }
      if (RETRY_DELAYS_MS[attempt] > 0) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
      const modelToUse = candidateModels[Math.min(attempt, candidateModels.length - 1)];
      try {
        response = await this.ai.models.generateContent({
          model: modelToUse,
          contents,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations }],
            abortSignal: signal
          }
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (!isRetryableLlmError(err) || signal?.aborted) {
          break;
        }
      }
    }

    if (lastError) {
      const fallbackTurn = await buildCatalogFallbackTurn({
        catalogUrl: this.getCatalogUrl(),
        messages
      });
      if (fallbackTurn) {
        return fallbackTurn;
      }
      throw lastError;
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
