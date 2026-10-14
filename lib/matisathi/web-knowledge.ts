/**
 * MatiSathi Live Internet Knowledge Fetcher
 * Connects the agent directly to the internet (Wikipedia REST API, DuckDuckGo Instant Answer)
 * to retrieve real, live, factual knowledge for ANY query asked by the learner.
 */

export interface WebKnowledgeResult {
  query: string;
  topicTitle: string;
  extract: string;
  sourceUrl: string;
  sourceName: string;
  keyTerms: string[];
  success: boolean;
  durationMs: number;
}

/**
 * Clean and normalize a query for knowledge search
 */
function cleanSearchQuery(query: string): string {
  const stopWords = new Set([
    'what', 'who', 'how', 'why', 'when', 'where', 'which', 'is', 'are', 'was', 'were',
    'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to',
    'for', 'with', 'from', 'by', 'about', 'explain', 'tell', 'me', 'difference', 'between',
    'can', 'could', 'should', 'would', 'make', 'convert', 'into', 'help',
    'କ’ଣ', 'କଣ', 'କାହିଁକି', 'କିପରି', 'ବୁଝାଅ', 'କଣ ପାଇଁ', 'ଏବଂ', 'ଓ', 'କିମ୍ବା'
  ]);

  const cleaned = query
    .replace(/[?।!.,;:()\[\]"']/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));

  return cleaned.slice(0, 4).join(' ') || query.slice(0, 30);
}

/**
 * Fetch knowledge from Wikipedia REST API
 */
async function fetchWikipediaKnowledge(searchTerm: string, signal: AbortSignal): Promise<Partial<WebKnowledgeResult> | null> {
  try {
    // 1. Search Wikipedia for matching pages
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const hits: Array<{ title: string; snippet: string }> = searchData?.query?.search || [];
    if (hits.length === 0) return null;

    // Pick hit whose title has the highest token overlap with search tokens
    const searchTokens = searchTerm.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    let bestHit = hits[0];
    let maxOverlap = -1;

    for (const hit of hits) {
      const hitLower = hit.title.toLowerCase();
      let overlap = 0;
      for (const token of searchTokens) {
        if (hitLower.includes(token)) overlap += 2;
        if (hitLower.split(/\W+/).includes(token)) overlap += 3;
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestHit = hit;
      }
    }

    const pageTitle = bestHit.title;

    // 2. Fetch page summary extract
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;
    const summaryRes = await fetch(summaryUrl, { signal });
    if (!summaryRes.ok) return null;

    const summaryData = await summaryRes.json();
    if (!summaryData.extract) return null;

    return {
      topicTitle: summaryData.title || pageTitle,
      extract: summaryData.extract,
      sourceUrl: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      sourceName: 'Wikipedia Internet Knowledge',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch knowledge from DuckDuckGo Instant Answer API
 */
async function fetchDuckDuckGoKnowledge(searchTerm: string, signal: AbortSignal): Promise<Partial<WebKnowledgeResult> | null> {
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchTerm)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, { signal });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.AbstractText && data.AbstractText.length > 20) {
      return {
        topicTitle: data.Heading || searchTerm,
        extract: data.AbstractText,
        sourceUrl: data.AbstractURL || 'https://duckduckgo.com/?q=' + encodeURIComponent(searchTerm),
        sourceName: 'DuckDuckGo Instant Answer',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Primary function: Fetch live factual internet knowledge for any student doubt.
 * Timeouts safely after 3.5 seconds so rural / 3G connections are never blocked.
 */
export async function fetchLiveInternetKnowledge(query: string): Promise<WebKnowledgeResult> {
  const startTime = Date.now();
  const searchTerms = cleanSearchQuery(query) || query.slice(0, 30);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    // Attempt Wikipedia first, fallback to DuckDuckGo in parallel
    const [wikiResult, ddgResult] = await Promise.all([
      fetchWikipediaKnowledge(searchTerms, controller.signal),
      fetchDuckDuckGoKnowledge(searchTerms, controller.signal),
    ]);

    clearTimeout(timeoutId);

    const hit = wikiResult?.extract ? wikiResult : ddgResult?.extract ? ddgResult : null;

    if (hit && hit.extract) {
      // Extract top keywords from extract
      const words = hit.extract
        .split(/\W+/)
        .filter((w) => w.length > 4 && !/^(about|which|their|there|these|those|where|could|would|should)$/i.test(w))
        .slice(0, 5);

      return {
        query,
        topicTitle: hit.topicTitle || searchTerms,
        extract: hit.extract,
        sourceUrl: hit.sourceUrl || 'https://en.wikipedia.org',
        sourceName: hit.sourceName || 'Live Internet Knowledge',
        keyTerms: Array.from(new Set(words)),
        success: true,
        durationMs: Date.now() - startTime,
      };
    }

    // Fallback if APIs returned empty (e.g. unique dialect or phrasing)
    return {
      query,
      topicTitle: searchTerms,
      extract: `Universal educational concept: ${query}. Focuses on fundamental principles, definitions, and real-world mechanisms.`,
      sourceUrl: 'https://en.wikipedia.org',
      sourceName: 'Internet General Knowledge Engine',
      keyTerms: searchTerms.split(/\s+/).filter((w) => w.length > 3),
      success: false,
      durationMs: Date.now() - startTime,
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      query,
      topicTitle: searchTerms,
      extract: `Universal knowledge synthesis for: ${query}.`,
      sourceUrl: 'https://en.wikipedia.org',
      sourceName: 'Local Educational Cache',
      keyTerms: searchTerms.split(/\s+/).filter((w) => w.length > 3),
      success: false,
      durationMs: Date.now() - startTime,
    };
  }
}
