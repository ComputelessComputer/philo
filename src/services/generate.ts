import { getApiKey } from './settings';
import { widgetCatalog } from '../components/editor/extensions/widget/catalog';
import type { Spec } from '@json-render/core';

const catalogPrompt = widgetCatalog.prompt();

const SYSTEM_PROMPT = `You are Sophia, an AI that generates UI widgets as JSON specs.

${catalogPrompt}

Rules:
- Output ONLY valid JSON. No markdown, no explanation, no code fences.
- The JSON must follow the spec format: { "root": "<id>", "elements": { "<id>": { "type": "<Component>", "props": {...}, "children": [...] } } }
- Each element needs a unique string ID (use descriptive names like "main-card", "title-text", etc.)
- children is an array of element IDs (strings), NOT inline elements.
- Use Card as the top-level container. Always wrap content in a Card.
- Use Stack for layout (vertical by default, horizontal with direction: "horizontal").
- Use Grid for multi-column layouts.
- Keep it compact and visually clean.
- Use Metric for key numbers, Badge for status, List for enumerations, Table for tabular data.
- Use ProgressBar for completion/percentage data.
- Be creative with the available components to best represent what the user asks for.`;

export async function generateWidget(prompt: string): Promise<Spec> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sophia failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text: string = data.content[0].text;

  // Parse the JSON spec — strip code fences if the model accidentally adds them
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    return JSON.parse(cleaned) as Spec;
  } catch {
    throw new Error(`Sophia returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}
