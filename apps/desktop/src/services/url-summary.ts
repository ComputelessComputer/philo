import { generateObject, } from "ai";
import { z, } from "zod";
import type { PageNote, } from "../types/note";
import { getAiSdkModel, tauriStreamFetch, } from "./ai-sdk";
import { getPagePath, sanitizePageTitle, } from "./paths";
import { loadSettings, resolveActiveAiConfig, } from "./settings";
import { loadPage, savePage, } from "./storage";

const URL_SUMMARY_SCHEMA = z.object({
  title: z.string().trim().min(1,),
  summary: z.string().trim().min(1,),
  followUpQuestions: z.array(z.string().trim().min(1,),).min(3,).max(3,),
},);

const MAX_SOURCE_TEXT_LENGTH = 12000;
const MAX_TITLE_LENGTH = 120;
const MAX_FOLLOW_UP_QUESTIONS = 3;
const URL_SUMMARY_SYSTEM_PROMPT = `You turn webpage content into concise Philo summary pages.

Rules:
- Use only the provided page content.
- title should be short and human-readable.
- summary should be 2-4 tight paragraphs in plain prose.
- followUpQuestions should be exactly 3 short, concrete prompts the user might ask next.
- Do not mention missing context or speculate beyond the source.
- Keep the tone direct and useful.`;

function fnv1a(value: string,) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index,);
    hash = Math.imul(hash, 0x01000193,);
  }
  return (hash >>> 0).toString(36,).padStart(7, "0",).slice(0, 7,);
}

function cleanText(value: string,) {
  return value.replace(/\s+/g, " ",).trim();
}

function trimToLength(value: string, maxLength: number,) {
  const normalized = cleanText(value,);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3,).trim()}...`;
}

function sortSearchParams(url: URL,) {
  const entries = Array.from(url.searchParams.entries(),).sort(([leftKey, leftValue,], [rightKey, rightValue,],) => {
    if (leftKey !== rightKey) return leftKey.localeCompare(rightKey,);
    return leftValue.localeCompare(rightValue,);
  },);
  url.search = "";
  for (const [key, value,] of entries) {
    url.searchParams.append(key, value,);
  }
}

export function normalizeUrlForSummary(raw: string,) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed,);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.username = "";
    url.password = "";
    url.hash = "";

    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }

    sortSearchParams(url,);

    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "",) || "/";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getUrlHostname(url: string,) {
  try {
    return new URL(url,).hostname.replace(/^www\./, "",);
  } catch {
    return url;
  }
}

export function buildUrlSummaryPageTitle(rawUrl: string,) {
  const normalized = normalizeUrlForSummary(rawUrl,);
  if (!normalized) {
    throw new Error("URL must be a valid http(s) address.",);
  }

  const hostname = sanitizePageTitle(getUrlHostname(normalized,).replace(/\./g, " ",),) || "Link";
  return sanitizePageTitle(`Link ${hostname} ${fnv1a(normalized,)}`,) || `Link ${fnv1a(normalized,)}`;
}

function getFallbackLabel(url: string,) {
  return trimToLength(getUrlHostname(url,), MAX_TITLE_LENGTH,);
}

function createSummaryContent(summary: string,) {
  const paragraphs = summary
    .split(/\n{2,}/,)
    .map((paragraph,) => cleanText(paragraph,))
    .filter(Boolean,)
    .map((paragraph,) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph, },],
    }));

  return JSON.stringify({
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph", },],
  },);
}

function normalizeFollowUpQuestions(questions: string[],) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const question of questions) {
    const normalized = trimToLength(question, 120,);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key,)) continue;
    seen.add(key,);
    cleaned.push(normalized,);
    if (cleaned.length >= MAX_FOLLOW_UP_QUESTIONS) break;
  }

  return cleaned;
}

function isHtmlResponse(contentType: string,) {
  return contentType.includes("text/html",) || contentType.includes("application/xhtml+xml",);
}

function extractMetaContent(doc: Document, selector: string,) {
  const value = doc.querySelector(selector,)?.getAttribute("content",);
  return value ? cleanText(value,) : "";
}

function stripIrrelevantElements(root: ParentNode,) {
  root.querySelectorAll("script, style, noscript, svg, canvas, iframe, nav, footer, header, form, aside",).forEach(
    (element,) => element.remove(),
  );
}

function extractReadableTextFromHtml(html: string,) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html",);
  stripIrrelevantElements(doc,);

  const title = trimToLength(
    extractMetaContent(doc, 'meta[property="og:title"]',)
      || extractMetaContent(doc, 'meta[name="twitter:title"]',)
      || cleanText(doc.title,),
    MAX_TITLE_LENGTH,
  );
  const description = trimToLength(
    extractMetaContent(doc, 'meta[name="description"]',)
      || extractMetaContent(doc, 'meta[property="og:description"]',)
      || extractMetaContent(doc, 'meta[name="twitter:description"]',),
    280,
  );

  const preferredRoot = doc.querySelector("article, main, [role='main']",) ?? doc.body;
  stripIrrelevantElements(preferredRoot,);
  const text = cleanText(preferredRoot.textContent ?? "",).slice(0, MAX_SOURCE_TEXT_LENGTH,);

  return {
    title,
    description,
    text,
  };
}

async function fetchUrlContent(url: string,) {
  const response = await tauriStreamFetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
    },
  },);

  if (!response.ok) {
    throw new Error(`Could not read URL (${response.status}).`,);
  }

  const contentType = response.headers.get("content-type",)?.toLowerCase() ?? "";
  const body = await response.text();

  if (!body.trim()) {
    throw new Error("URL content was empty.",);
  }

  if (typeof DOMParser !== "undefined" && isHtmlResponse(contentType,)) {
    return extractReadableTextFromHtml(body,);
  }

  return {
    title: "",
    description: "",
    text: cleanText(body,).slice(0, MAX_SOURCE_TEXT_LENGTH,),
  };
}

async function summarizeUrlContent(input: {
  normalizedUrl: string;
  title: string;
  description: string;
  text: string;
},) {
  const settings = await loadSettings();
  const config = resolveActiveAiConfig(settings,);
  if (!config) {
    throw new Error("AI is not configured.",);
  }

  const result = await generateObject({
    model: getAiSdkModel(config, "assistant",),
    schema: URL_SUMMARY_SCHEMA,
    system: URL_SUMMARY_SYSTEM_PROMPT,
    prompt: JSON.stringify(
      {
        page: {
          url: input.normalizedUrl,
          extractedTitle: input.title || null,
          description: input.description || null,
        },
        content: input.text,
      },
      null,
      2,
    ),
  },);

  return {
    title: trimToLength(result.object.title, MAX_TITLE_LENGTH,) || getFallbackLabel(input.normalizedUrl,),
    summary: result.object.summary.trim(),
    followUpQuestions: normalizeFollowUpQuestions(result.object.followUpQuestions,),
  };
}

export function isUrlSummaryPage(
  page: Pick<PageNote, "source" | "linkTitle" | "summaryUpdatedAt" | "followUpQuestions">,
) {
  const normalized = page.source ? normalizeUrlForSummary(page.source,) : null;
  return !!normalized && (!!page.linkTitle || !!page.summaryUpdatedAt || page.followUpQuestions.length > 0);
}

function hasUrlSummaryContent(page: PageNote,) {
  return !!page.linkTitle && !!page.summaryUpdatedAt && page.followUpQuestions.length > 0;
}

export function getUrlSummaryPageChipLabel(page: Pick<PageNote, "source" | "linkTitle">,) {
  const normalized = page.source ? normalizeUrlForSummary(page.source,) : null;
  if (!normalized) return page.linkTitle ?? "";
  return trimToLength(page.linkTitle ?? getFallbackLabel(normalized,), MAX_TITLE_LENGTH,);
}

export async function ensureUrlSummaryPage(rawUrl: string,) {
  const normalizedUrl = normalizeUrlForSummary(rawUrl,);
  if (!normalizedUrl) {
    throw new Error("Only bare http(s) URLs can be summarized.",);
  }

  const pageTitle = buildUrlSummaryPageTitle(normalizedUrl,);
  const existing = await loadPage(pageTitle,);
  if (existing) {
    if (!isUrlSummaryPage(existing,)) {
      throw new Error(`Page title conflict for ${pageTitle}.`,);
    }

    if (hasUrlSummaryContent(existing,)) {
      return {
        page: existing,
        pageTitle,
        normalizedUrl,
        chipLabel: getUrlSummaryPageChipLabel(existing,),
      };
    }
  }

  const extracted = await fetchUrlContent(normalizedUrl,);
  if (!extracted.text) {
    throw new Error("Could not extract readable content from the URL.",);
  }

  const summarized = await summarizeUrlContent({
    normalizedUrl,
    title: extracted.title,
    description: extracted.description,
    text: extracted.text,
  },);

  const now = new Date().toISOString();
  const nextPage: PageNote = existing
    ? {
      ...existing,
      content: createSummaryContent(summarized.summary,),
      source: normalizedUrl,
      linkTitle: summarized.title,
      summaryUpdatedAt: now,
      followUpQuestions: summarized.followUpQuestions,
    }
    : {
      title: pageTitle,
      path: await getPagePath(pageTitle,),
      content: createSummaryContent(summarized.summary,),
      type: "page",
      attachedTo: null,
      eventId: null,
      startedAt: null,
      endedAt: null,
      participants: [],
      location: null,
      executiveSummary: null,
      sessionKind: null,
      agenda: [],
      actionItems: [],
      source: normalizedUrl,
      linkTitle: summarized.title,
      summaryUpdatedAt: now,
      followUpQuestions: summarized.followUpQuestions,
      frontmatter: {},
      hasFrontmatter: true,
    };

  await savePage(nextPage,);

  return {
    page: nextPage,
    pageTitle,
    normalizedUrl,
    chipLabel: getUrlSummaryPageChipLabel(nextPage,),
  };
}
