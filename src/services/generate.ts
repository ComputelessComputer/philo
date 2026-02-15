import { getApiKey } from './settings';

const SYSTEM_PROMPT = `You are a widget generator. The user will describe a mini-app or widget they want.
Generate a SINGLE self-contained HTML file that implements it.

Rules:
- Output ONLY the HTML. No markdown, no explanation, no code fences.
- Everything in one file: HTML structure, CSS in <style>, JS in <script>.
- Use modern CSS (flexbox, grid, custom properties). No frameworks.
- Use vanilla JS only. No external dependencies, no CDN links.
- Make it visually polished with good typography and spacing.
- Clean, minimal design. Subtle colors. Rounded corners.
- Fully functional and interactive.
- Use 100% width, never fixed widths. Responsive within its container.
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.
- Background should be white or very light (#fafafa).
- Keep it compact — aim for 300-500px height unless the widget needs more.`;

export async function generateWidget(prompt: string): Promise<string> {
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
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
