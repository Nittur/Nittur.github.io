/**
 * REVIEWS — Loader + UI
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

let allReviews = [];

// Derived from loaded reviews — no hardcoding needed
let categoryMeta = {}; // { category: { label, icon } }

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

// ── Render ────────────────────────────────────

// Render reviews for a specific category
function renderReviews(category) {
    const container = document.getElementById('reviews-container');
    container.innerHTML = '';

    const filtered = allReviews.filter(r => r.category === category);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-reviews retro-text">no reviews yet in this category</p>';
        return;
    }

    filtered.forEach((review, index) => {
        const card = document.createElement('div');
        card.className = 'review-item';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="review-item-header">
                <span class="review-icon">${review.icon}</span>
                <div class="review-info">
                    <h3 class="review-title">${review.title}</h3>
                    ${review.date ? `<span class="review-date">${formatReviewDate(review.date)}</span>` : ''}
                </div>
                <div class="score-badge">
                    <span class="score-value">${review.score}</span>
                    <span class="score-max">/10</span>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Format review date
function formatReviewDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Build category buttons from whatever categories exist in the loaded reviews
function buildCategoryButtons() {
    // Collect unique categories in the order they first appear
    const seen = new Set();
    allReviews.forEach(r => {
        if (!seen.has(r.category)) {
            seen.add(r.category);
            // Pick the icon from the first review in that category
            categoryMeta[r.category] = {
                icon:  r.icon  || '📌',
                label: r.category.charAt(0).toUpperCase() + r.category.slice(1) + 's',
            };
        }
    });

    const bar = document.getElementById('category-bar');
    bar.innerHTML = [...seen].map(cat => {
        const { icon, label } = categoryMeta[cat];
        return `<button class="category-btn" data-category="${cat}">${icon} ${label}</button>`;
    }).join('');

    bar.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => showCategory(btn.dataset.category));
    });
}

// Show reviews for a category
function showCategory(category) {
    document.getElementById('reviews-section').style.display = 'block';
    const { icon, label } = categoryMeta[category] || { icon: '', label: category };
    document.getElementById('category-title').textContent = `${icon} ${label}`;

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    renderReviews(category);
}

// ── Init ──────────────────────────────────────

async function init() {
    // Detect local file:// — fetch won't work
    if (location.protocol === 'file:') {
        document.getElementById('category-bar').innerHTML =
            `<span class="retro-text" style="font-family:var(--font-mono);color:var(--color-text-muted);font-size:.85rem;">
             Running locally? Use a server: <code style="color:var(--color-yellow)">npx serve .</code></span>`;
        return;
    }

    try {
        allReviews = await fetchAllReviews();
        buildCategoryButtons();
    } catch (err) {
        console.error('Failed to load reviews:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);