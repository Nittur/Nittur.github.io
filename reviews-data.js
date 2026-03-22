/**
 * REVIEWS ENGINE
 *
 * ─────────────────────────────────────────────
 * TO ADD A NEW REVIEW:
 *   1. Create  reviews/your-thing.md
 *   2. Add     your-thing.md   to  reviews/index.md
 *   That's it — no JS or HTML changes needed.
 * ─────────────────────────────────────────────
 *
 * REVIEW .md FORMAT:
 *   ---
 *   title: Elden Ring
 *   category: game          ← movie | food | item | game
 *   icon: 🎮
 *   tags: RPG, Open World
 *   initialScore: 10
 *   initialDate: 2024-08-01
 *   ---
 *
 *   ## History
 *   2024-09-01 | +1
 *   2025-01-10 | -1
 *
 * DECAY FORMULA:
 *   score = (base + adjustments) × 0.5^(daysElapsed / halfLife)
 */

// ── Decay configuration ───────────────────────
// Edit halfLife here to change how fast scores decay (days).
const DECAY_CONFIG = {
    halfLife:        90,
    maxScore:        10,
    minDisplayWidth: 5,
};

// ── Parse helpers ─────────────────────────────

function parseIndexMd(text) {
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.endsWith('.md'));
}

function parseReviewFrontmatter(raw) {
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
        if (key === 'initialScore') data[key] = parseFloat(value);
        else if (key === 'tags')    data[key] = value.split(',').map(t => t.trim()).filter(Boolean);
        else                        data[key] = value;
    });
    return data;
}

function parseReviewHistory(raw) {
    const history = [];
    const section = raw.replace(/\r\n/g, '\n').split('## History')[1];
    if (!section) return history;
    const re = /^(\d{4}-\d{2}-\d{2})\s*\|\s*([+-]?\d+)/m;
    section.split('\n').forEach(line => {
        const m = line.trim().match(re);
        if (m) history.push({ date: m[1], change: parseInt(m[2]) });
    });
    return history;
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
    const text = await fetchText('reviews/index.md');
    return parseIndexMd(text);
}

async function fetchReview(filename) {
    const raw  = await fetchText(`reviews/${filename}`);
    const data = parseReviewFrontmatter(raw);
    if (!data) throw new Error(`Bad frontmatter in ${filename}`);
    data.id      = filename.replace('.md', '');
    data.history = parseReviewHistory(raw);
    return data;
}

async function fetchAllReviews() {
    const files   = await fetchReviewIndex();
    const results = await Promise.allSettled(files.map(f => fetchReview(f)));
    return results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => new Date(b.initialDate) - new Date(a.initialDate));
}

// ── Decay calculations ────────────────────────

function calculateDecayedScore(review) {
    const now         = new Date();
    const initial     = new Date(review.initialDate);
    const daysElapsed = Math.max(0, Math.floor((now - initial) / 86400000));

    const adjustments = (review.history || []).reduce((s, e) => s + e.change, 0);
    const baseScore   = Math.min(review.initialScore + adjustments, DECAY_CONFIG.maxScore);
    const decayFactor = Math.pow(0.5, daysElapsed / DECAY_CONFIG.halfLife);
    const current     = baseScore * decayFactor;

    return {
        currentScore:    Math.round(current * 10) / 10,
        baseScore,
        decayPercentage: Math.round(((baseScore - current) / baseScore) * 100),
        ribbonWidth:     Math.max(Math.round((current / DECAY_CONFIG.maxScore) * 100), DECAY_CONFIG.minDisplayWidth),
        daysElapsed,
    };
}

function getScoreColor(score) {
    if (score >= 8) return '#22c55e';
    if (score >= 6) return '#84cc16';
    if (score >= 4) return '#eab308';
    if (score >= 2) return '#f97316';
    return '#ef4444';
}
