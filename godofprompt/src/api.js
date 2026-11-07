const { readCache, writeCache } = require('./cache');
const { PRIMARY_CATEGORIES, SUBCATEGORIES, SUPPORTED_TOOLS } = require('./categories');

const BASE_URL = 'https://godofprompt.ai';
const API_BASE_URL = 'https://api.godofprompt.dev';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Normalizes a slug or full URL to a clean prompt slug
 */
function normalizeSlug(slugOrUrl) {
  if (!slugOrUrl) return '';
  let str = slugOrUrl.trim();
  if (str.startsWith('http')) {
    try {
      const u = new URL(str);
      const parts = u.pathname.replace(/^\/prompt-library\/?/, '').split('/').filter(Boolean);
      return parts[0] || '';
    } catch {
      // fallback regex
      const m = str.match(/\/prompt-library\/([a-z0-9-]+)/i);
      return m ? m[1] : str;
    }
  }
  return str.replace(/^\/prompt-library\/?/, '').replace(/\/$/, '');
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/');
}

/**
 * Formats a slug into a human-readable title
 */
function slugToTitle(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Fetch and extract a single prompt's full details and template code
 */
async function getPrompt(slugOrUrl) {
  const slug = normalizeSlug(slugOrUrl);
  if (!slug) {
    throw new Error('Invalid prompt slug or URL provided.');
  }

  const targetUrl = `${BASE_URL}/prompt-library/${slug}`;
  const res = await fetch(targetUrl, { headers: DEFAULT_HEADERS });

  if (res.status === 404) {
    throw new Error(`Prompt not found at ${targetUrl} (HTTP 404). Check the slug spelling.`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch prompt: HTTP ${res.status} from ${targetUrl}`);
  }

  const html = await res.text();

  let title = '';
  let description = '';
  let keywords = [];
  let breadcrumbs = [];
  let stats = {};
  let datePublished = null;
  let dateModified = null;

  // Extract Schema.org JSON-LD metadata
  const jsonldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      if (data['@graph']) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'BreadcrumbList' && Array.isArray(item.itemListElement)) {
            breadcrumbs = item.itemListElement.map(b => b.name);
          }
          if (item['@type'] === 'Article') {
            title = item.headline || title;
            description = item.description || description;
            datePublished = item.datePublished || datePublished;
            dateModified = item.dateModified || dateModified;
            if (item.keywords) {
              keywords = item.keywords.split(',').map(k => k.trim());
            }
            if (Array.isArray(item.interactionStatistic)) {
              for (const stat of item.interactionStatistic) {
                if (stat.interactionType && stat.interactionType.includes('WatchAction')) {
                  stats.views = stat.userInteractionCount;
                }
                if (stat.interactionType && stat.interactionType.includes('LikeAction')) {
                  stats.likes = stat.userInteractionCount;
                }
              }
            }
          }
        }
      }
    } catch {}
  }

  // Fallback title from <title> if missing
  if (!title) {
    const tm = html.match(/<title>([^<]+)<\/title>/i);
    if (tm) {
      title = tm[1].replace(/\s*\|\s*God of Prompt.*$/i, '').trim();
    } else {
      title = slugToTitle(slug);
    }
  }

  // Fallback description from meta tag
  if (!description) {
    const dm = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
               html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
    if (dm) description = decodeHtmlEntities(dm[1]);
  }

  // Extract prompt text from <pre ...><code>...</code></pre>
  let promptText = '';
  const codeM = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
  if (codeM) {
    let raw = codeM[1];
    // Strip frontend variable highlight spans: <span ...>{{var}}</span> -> {{var}}
    raw = raw.replace(/<span[^>]*data-var-key="[^"]*"[^>]*>\s*(\{\{[^}]+\}\}|\[[^\]]+\])\s*<\/span>/gi, '$1');
    raw = raw.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
    // Strip any remaining html tags
    raw = raw.replace(/<\/?[a-z0-9_-]+(?:\s+[^>]*)?>/gi, '');
    promptText = decodeHtmlEntities(raw).trim();
  }

  return {
    slug,
    title,
    url: targetUrl,
    category: breadcrumbs[1] || 'Uncategorized',
    subcategory: breadcrumbs[2] || null,
    keywords,
    stats,
    datePublished,
    dateModified,
    description: description.trim(),
    prompt: promptText
  };
}

/**
 * Loads prompt sitemap index with local caching
 */
async function getPromptIndex(refresh = false) {
  const cacheKey = 'sitemap_prompts_index';
  if (!refresh) {
    const cached = readCache(cacheKey, 12 * 60 * 60 * 1000); // 12hr cache
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  const res = await fetch(`${BASE_URL}/sitemaps/prompts.xml`, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: HTTP ${res.status}`);
  }

  const xml = await res.text();
  const items = [];
  const urlRe = /<url>\s*<loc>https:\/\/godofprompt\.ai\/prompt-library\/([a-z0-9-]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/gi;
  let m;
  while ((m = urlRe.exec(xml)) !== null) {
    const slug = m[1];
    const lastmod = m[2] || null;
    items.push({
      slug,
      title: slugToTitle(slug),
      url: `${BASE_URL}/prompt-library/${slug}`,
      lastmod
    });
  }

  writeCache(cacheKey, items);
  return items;
}

/**
 * Search prompts by keyword/query
 */
async function search(query, options = {}) {
  const limit = options.limit || 10;
  const refresh = options.refresh || false;
  const index = await getPromptIndex(refresh);

  if (!query || !query.trim()) {
    return index.slice(0, limit);
  }

  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const scored = [];
  for (const item of index) {
    const slugLower = item.slug.toLowerCase();
    const titleLower = item.title.toLowerCase();

    let score = 0;
    let allMatched = true;

    for (const t of tokens) {
      if (slugLower.includes(t)) {
        score += 10;
      } else if (titleLower.includes(t)) {
        score += 5;
      } else {
        allMatched = false;
      }
    }

    if (allMatched) {
      score += 20;
    }

    // Exact phrase match bonus
    const fullQuery = query.toLowerCase().trim();
    if (slugLower.includes(fullQuery.replace(/\s+/g, '-'))) score += 50;
    if (titleLower.includes(fullQuery)) score += 40;

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.item);
}

/**
 * Fetch prompts listed on a category page
 */
async function getCategoryPrompts(categorySlug) {
  const cleanSlug = categorySlug.toLowerCase().trim().replace(/^\/prompt-library\/category\/?/, '');
  const targetUrl = `${BASE_URL}/prompt-library/category/${cleanSlug}`;

  const res = await fetch(targetUrl, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch category '${cleanSlug}': HTTP ${res.status}`);
  }

  const html = await res.text();
  const prompts = [];

  const jsonldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      if (data.mainEntity && Array.isArray(data.mainEntity.itemListElement)) {
        for (const it of data.mainEntity.itemListElement) {
          const slug = it.url ? normalizeSlug(it.url) : '';
          prompts.push({
            position: it.position,
            name: it.name,
            slug,
            url: it.url || `${BASE_URL}/prompt-library/${slug}`
          });
        }
      }
    } catch {}
  }

  return {
    category: cleanSlug,
    url: targetUrl,
    count: prompts.length,
    prompts
  };
}

/**
 * Fetch live interaction stats from api.godofprompt.dev
 */
async function getStats(ids) {
  const idArray = Array.isArray(ids) ? ids : (typeof ids === 'string' ? ids.split(',').map(s => s.trim()) : []);
  if (idArray.length === 0) {
    return { data: [] };
  }

  const targetUrl = `${API_BASE_URL}/api/library/prompts/stats?ids=${encodeURIComponent(idArray.join(','))}`;
  const res = await fetch(targetUrl, {
    headers: {
      ...DEFAULT_HEADERS,
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to query stats: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Extracts key vocabulary and domain concepts from a prompt text
 */
function extractKeyConcepts(promptText, maxTerms = 6) {
  const concepts = new Set();
  
  // 1. Extract bold phrases: **Concept Name**
  const boldMatches = promptText.match(/\*\*([A-Za-z0-9\s\-_/&]{3,40})\*\*/g) || [];
  for (const b of boldMatches) {
    const clean = b.replace(/\*\*/g, '').trim();
    if (!['role', 'task', 'context', 'standards', 'output', 'format', 'note', 'when'].includes(clean.toLowerCase())) {
      concepts.add(clean);
    }
  }

  // 2. Extract bullet items that describe key features or rules
  const lines = promptText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('● ') || trimmed.startsWith('* ')) {
      const item = trimmed.replace(/^[-●*]\s+/, '').replace(/\*\*/g, '').trim();
      const firstSentence = item.split(/[.:\n]/)[0].trim();
      if (firstSentence.length > 5 && firstSentence.length < 50) {
        concepts.add(firstSentence);
      }
    }
  }

  return Array.from(concepts).slice(0, maxTerms);
}

/**
 * Extracts role and task from prompt markdown
 */
function extractRoleAndTask(promptText) {
  let role = '';
  let task = '';
  
  const roleMatch = promptText.match(/## Role\s*\n+([\s\S]*?)(?=\n+##|\n*$)/i);
  if (roleMatch) {
    role = decodeHtmlEntities(roleMatch[1].trim().split('\n')[0].trim());
  }
  
  const taskMatch = promptText.match(/## Task\s*\n+([\s\S]*?)(?=\n+##|\n*$)/i);
  if (taskMatch) {
    task = decodeHtmlEntities(taskMatch[1].trim().split('\n')[0].trim());
  }
  
  return { role, task };
}

/**
 * Creates a "Prompt Board" (Idea & Vocabulary Moodboard) for a topic.
 * Fetches top matching prompts, extracts their roles, tasks, domain vocabulary,
 * and compiles them into a structured comparison board.
 */
async function createPromptBoard(topic, options = {}) {
  const count = options.limit || 3;
  const searchResults = await search(topic, { limit: count, refresh: options.refresh });
  
  if (searchResults.length === 0) {
    return {
      topic,
      count: 0,
      cards: [],
      message: `No prompts found matching topic "${topic}". Try broader keywords (e.g. "dashboard", "api", "auth", "design").`
    };
  }

  const cards = [];
  for (let i = 0; i < searchResults.length; i++) {
    const item = searchResults[i];
    try {
      const full = await getPrompt(item.slug);
      const { role, task } = extractRoleAndTask(full.prompt);
      const concepts = extractKeyConcepts(full.prompt, 5);

      cards.push({
        index: i + 1,
        title: full.title,
        slug: full.slug,
        category: full.category + (full.subcategory ? ` > ${full.subcategory}` : ''),
        url: full.url,
        role: role || 'Expert specialist in this domain',
        task: task || full.description.slice(0, 140) + '...',
        concepts,
        stats: full.stats,
        fullPrompt: full.prompt
      });
    } catch {
      cards.push({
        index: i + 1,
        title: item.title,
        slug: item.slug,
        category: 'General',
        url: item.url,
        role: 'Specialist',
        task: item.title,
        concepts: [],
        stats: {},
        fullPrompt: ''
      });
    }
  }

  return {
    topic,
    count: cards.length,
    cards
  };
}

/**
 * Returns available categories
 */
function listCategories() {
  return {
    categories: PRIMARY_CATEGORIES,
    subcategories: SUBCATEGORIES
  };
}

/**
 * Returns supported AI tools / models
 */
function listTools() {
  return SUPPORTED_TOOLS;
}

module.exports = {
  getPrompt,
  search,
  getCategoryPrompts,
  getPromptIndex,
  getStats,
  createPromptBoard,
  extractKeyConcepts,
  extractRoleAndTask,
  listCategories,
  listTools,
  normalizeSlug
};

