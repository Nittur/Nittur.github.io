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

// ── DOM ───────────────────────────────────────
// The script is deferred, so the document is parsed before this runs.
const categoryBar    = document.getElementById('category-bar');
const reviewsSection = document.getElementById('reviews-section');
const categoryTitle  = document.getElementById('category-title');
const reviewsList    = document.getElementById('reviews-container');

// ── State ─────────────────────────────────────
// { category: { icon, label, items } } — built once after loading
let reviewsByCategory = new Map();

const REVIEW_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

const escapeHtml = value =>
    String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);

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
    const results = await Promise.allSettled(files.map(fetchCategory));
    return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}

// ── Render ────────────────────────────────────

// Group the flat review list once so category switches need no filtering
function groupByCategory(reviews) {
    const grouped = new Map();

    reviews.forEach(review => {
        const entry = grouped.get(review.category);
        if (entry) {
            entry.items.push(review);
            return;
        }
        grouped.set(review.category, {
            icon:  review.icon || '📌',
            label: review.category.charAt(0).toUpperCase() + review.category.slice(1) + 's',
            items: [review],
        });
    });

    return grouped;
}

// Render reviews for a specific category in a single DOM write
function renderReviews(category) {
    const entry = reviewsByCategory.get(category);
    const items = entry ? entry.items : [];

    if (items.length === 0) {
        reviewsList.innerHTML = '<p class="no-reviews retro-text">no reviews yet in this category</p>';
        return;
    }

    reviewsList.innerHTML = items.map((review, index) => `
        <div class="review-item" style="animation-delay:${index * 0.1}s">
            <div class="review-item-header">
                <span class="review-icon">${escapeHtml(review.icon)}</span>
                <div class="review-info">
                    <h3 class="review-title">${escapeHtml(review.title)}</h3>
                    ${review.date ? `<span class="review-date">${escapeHtml(formatReviewDate(review.date))}</span>` : ''}
                </div>
                <div class="score-badge">
                    <span class="score-value">${escapeHtml(review.score)}</span>
                    <span class="score-max">/10</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Format review date
function formatReviewDate(dateStr) {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? dateStr : REVIEW_DATE_FORMAT.format(date);
}

// Build category buttons from the categories found while loading
function buildCategoryButtons() {
    categoryBar.innerHTML = [...reviewsByCategory]
        .map(([category, { icon, label }]) => `
            <button type="button" class="category-btn" data-category="${escapeHtml(category)}" aria-pressed="false">
                ${escapeHtml(icon)} ${escapeHtml(label)}
            </button>
        `)
        .join('');
}

// Show reviews for a category
function showCategory(category) {
    const { icon = '', label = category } = reviewsByCategory.get(category) || {};

    reviewsSection.classList.add('is-visible');
    categoryTitle.textContent = `${icon} ${label}`;
    reviewsList.scrollTop = 0;

    categoryBar.querySelectorAll('.category-btn').forEach(button => {
        const isActive = button.dataset.category === category;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    renderReviews(category);
}

// ── Init ──────────────────────────────────────

// One delegated listener instead of one per button
categoryBar.addEventListener('click', event => {
    const button = event.target.closest('.category-btn');
    if (button) showCategory(button.dataset.category);
});

async function init() {
    // Detect local file:// — fetch won't work
    if (location.protocol === 'file:') {
        categoryBar.innerHTML =
            `<span class="load-note">Running locally? Use a server: <code>npx serve .</code></span>`;
        return;
    }

    try {
        reviewsByCategory = groupByCategory(await fetchAllReviews());
        buildCategoryButtons();
    } catch (err) {
        console.error('Failed to load reviews:', err);
        categoryBar.innerHTML =
            `<span class="load-note">could not load reviews — try again later</span>`;
    }
}

init();