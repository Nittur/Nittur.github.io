/**
 * REVIEWS LOADER — Minimal, no calculations
 *
 * ─────────────────────────────────────────────
 * TO ADD A NEW CATEGORY:
 *   1. Create  content/reviews/your-category.md
 *   2. Add     your-category.md   to  content/reviews/index.md
 *   That's it — no JS or HTML changes needed.
 * ─────────────────────────────────────────────
 *
 * CATEGORY .md FORMAT:
 *   ---
 *   category: movie          ← movie | food | item | game
 *   icon: 🎬
 *   ---
 *
 *   - Inception | 10 | 2025-01-15
 *   - Interstellar | 8.5 | 2025-02-01
 *
 * Each body line is one review:  - <title> | <score> | <YYYY-MM-DD>
 */

// ── Parse helpers ─────────────────────────────

function parseIndexMd(text) {
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.endsWith('.md'));
}

function parseCategoryFrontmatter(raw) {
    const text  = raw.replace(/\r\n/g, '\n');
    const start = text.indexOf('---\n');
    if (start !== 0) return null;
    const close = text.indexOf('\n---', 4);
    if (close === -1) return null;

    const data = {};
    text.slice(4, close).split('\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon < 1) return;
        const key   = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        data[key] = value;
    });
    // Body is everything after the closing ---
    data.body = text.slice(close + 4);
    return data;
}

// Parse review lines: "- Title | score | YYYY-MM-DD"
function parseCategoryItems(raw, category, icon) {
    const items = [];
    raw.replace(/\r\n/g, '\n').split('\n').forEach(line => {
        const m = line.trim().match(/^-\s*(.+)$/);
        if (!m) return;

        const parts = m[1].split('|').map(p => p.trim());
        if (parts.length < 2) return;

        const title = parts[0];
        const score = parseFloat(parts[1]);
        const date  = parts[2] || '';

        if (title && !isNaN(score)) {
            items.push({ title, score, date, category, icon });
        }
    });
    return items;
}

// ── Fetch layer ───────────────────────────────

async function fetchText(url) {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 6000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchReviewIndex() {
    const text = await fetchText('content/reviews/index.md');
    return parseIndexMd(text);
}

async function fetchCategory(filename) {
    const raw  = await fetchText(`content/reviews/${filename}`);
    const data = parseCategoryFrontmatter(raw);
    if (!data) throw new Error(`Bad frontmatter in ${filename}`);

    const category = data.category || filename.replace('.md', '');
    const icon     = data.icon     || '📌';
    return parseCategoryItems(data.body, category, icon);
}

async function fetchAllReviews() {
    const files   = await fetchReviewIndex();
    const results = await Promise.allSettled(files.map(f => fetchCategory(f)));
    const items   = [];
    results
        .filter(r => r.status === 'fulfilled')
        .forEach(r => items.push(...r.value));
    return items;
}