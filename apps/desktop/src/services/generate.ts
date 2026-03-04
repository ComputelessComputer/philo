import type { Spec, } from "@json-render/core";
import { getApiKey, } from "./settings";

const SYSTEM_PROMPT = `You are Sophia, an AI that generates UI widgets as JSON specs.

OUTPUT FORMAT:
Return ONLY a JSON object with this exact shape (no markdown, no explanation, no code fences):
{
  "root": "<root-element-id>",
  "elements": {
    "<element-id>": {
      "type": "<ComponentName>",
      "props": { ... },
      "children": ["<child-id-1>", "<child-id-2>"]
    }
  }
}

- Every element needs a unique string ID (e.g. "main-card", "title-text", "stats-grid").
- "children" is an array of element ID strings. Use [] for leaf nodes.
- "root" is the ID of the top-level element.

AVAILABLE COMPONENTS:

Layout:
- Card { title?: string, padding?: "none"|"sm"|"md"|"lg" } — Top-level container. Always use as root.
- Stack { direction?: "vertical"|"horizontal", gap?: "none"|"xs"|"sm"|"md"|"lg", align?: "start"|"center"|"end"|"stretch", justify?: "start"|"center"|"end"|"between"|"around", wrap?: boolean } — Flex layout.
- Grid { columns?: number, gap?: "none"|"xs"|"sm"|"md"|"lg" } — Grid layout.
- Divider {} — Horizontal line.
- Spacer { size?: "xs"|"sm"|"md"|"lg"|"xl" } — Vertical spacing.

Content:
- Text { content: string, size?: "xs"|"sm"|"md"|"lg"|"xl", weight?: "normal"|"medium"|"semibold"|"bold", color?: "default"|"muted"|"accent"|"success"|"warning"|"error", align?: "left"|"center"|"right" }
- Heading { content: string, level?: "h1"|"h2"|"h3" }
- Metric { label: string, value: string, unit?: string, trend?: "up"|"down"|"flat" } — Key number display.
- Badge { text: string, variant?: "default"|"success"|"warning"|"error"|"info" }
- Image { src: string, alt?: string, rounded?: boolean }

Data:
- List { items: [{ label: string, description?: string, trailing?: string }], variant?: "plain"|"bordered"|"striped" }
- Table { headers: string[], rows: string[][] }
- ProgressBar { value: number, max?: number, color?: "default"|"success"|"warning"|"error"|"accent", showLabel?: boolean }

Interactive:
- Button { label: string, variant?: "primary"|"secondary"|"ghost", size?: "sm"|"md"|"lg" }
- TextInput { placeholder?: string, label?: string }
- Checkbox { label: string }

RULES:
- Always use Card as the root element.
- Use Stack for vertical/horizontal layout, Grid for columns.
- Use Metric for key numbers, Badge for status labels, List for enumerations, Table for tabular data.
- Be creative and make it visually clean.`;

export async function generateWidget(prompt: string,): Promise<Spec> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING",);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt, },],
    },),
  },);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sophia failed (${response.status}): ${error}`,);
  }

  const data = await response.json();
  const text: string = data.content[0].text;

  // Parse the JSON spec — strip code fences if the model accidentally adds them
  const cleaned = text.replace(/^```(?:json)?\n?/m, "",).replace(/\n?```$/m, "",).trim();
  try {
    return JSON.parse(cleaned,) as Spec;
  } catch {
    throw new Error(`Sophia returned invalid JSON: ${cleaned.slice(0, 200,)}`,);
  }
}
