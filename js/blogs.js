/**
 * BLOG ENGINE + UI — Lightweight Markdown Framework with genres
 *
 * ─────────────────────────────────────────────
 * TO ADD A NEW POST:
 *   1. Copy    content/blogs/_TEMPLATE.md  →  content/blogs/my-post.md
 *   2. Add     my-post.md   to  content/blogs/index.md
 *   That's it — no JS or HTML changes needed.
 *
 * TO ADD A NEW GENRE:
 *   Add one line to content/blogs/genres.md:
 *     - id | Label | icon | #accent | cards|list|grid | description
 * ─────────────────────────────────────────────
 *
 * URLS:
 *   blogs.html                 → all posts
 *   blogs.html?genre=tech      → one genre tab
 *   blogs.html?post=my-post.md → reader
 *
 * Full field reference: docs/BLOG_GUIDE.md
 */

// ── Config ────────────────────────────────────

const BLOG_DIR = 'content/blogs/';

const BLOG_FONTS = {
    sans:  "'Zen Maru Gothic', sans-serif",
    mono:  "'JetBrains Mono', monospace",
    serif: "'Noto Serif JP', serif",
};

const LAYOUTS        = ['cards', 'list', 'grid'];
const ALL_GENRE      = { id: 'all',   label: 'All',   icon: '✦', accent: null, layout: 'cards', description: 'everything, newest first' };
const FALLBACK_GENRE = { id: 'other', label: 'Other', icon: '❖', accent: null, layout: 'cards', description: 'posts without a genre' };

const DATE_LONG  = new Intl.DateTimeFormat('en-US', { month: 'long',  day: 'numeric', year: 'numeric' });
const DATE_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── State ─────────────────────────────────────

const rawCache  = new Map();   // filename → raw markdown (fetched once)
const htmlCache = new Map();   // filename → rendered post (rendered lazily)
const scrollPos = new Map();   // genre id → listing scrollTop

let indexFiles   = new Set();  // filenames allowed to open
let genres       = new Map();  // id → genre (insertion order = tab order)
let allPosts     = [];         // every post's meta, incl. drafts
let currentGenre = null;       // genre currently rendered in the listing

// ── DOM ───────────────────────────────────────
// The script is deferred, so the document is parsed before this runs.

const $ = id => document.getElementById(id);
const viewListing = $('view-listing');
const viewReader  = $('view-reader');
const blogListing = $('blog-listing');
const genreBar    = $('genre-bar');
const genreInfo   = $('genre-info');

// ── Small helpers ─────────────────────────────

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escHtml = value => String(value ?? '').replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

// Only accept plain CSS colours (hex / rgb() / hsl() / names) in style attributes
function safeColor(value) {
    const v = String(value || '').trim();
    return /^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d\s.,%/]+\))$/i.test(v) ? v : null;
}

// Block javascript:/data: links; everything else is passed through
function safeUrl(url) {
    const u = String(url || '').trim();
    return /^\s*(javascript|vbscript|data):/i.test(u) && !/^data:image\//i.test(u) ? '#' : u;
}

// "2026-04-15" → local-time Date (new Date('2026-04-15') is UTC and
// shows the previous day for anyone west of Greenwich)
function parseDate(str) {
    const m = String(str || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(str, fmt = DATE_LONG) {
    const d = parseDate(str);
    return d ? fmt.format(d) : (str || '');
}

const isTrue = v => /^(true|yes|1)$/i.test(String(v || '').trim());

// ── Index, genres & frontmatter parsing ───────

function parseIndexMd(text) {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/<!--[\s\S]*?-->/g, '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && /^[\w.-]+\.md$/.test(l));
}

// "- id | Label | icon | accent | layout | description"
function parseGenresMd(text) {
    const map = new Map();
    text.replace(/\r\n/g, '\n').split('\n').forEach(line => {
        const m = line.trim().match(/^-\s+(.+)$/);
        if (!m) return;
        const [id, label, icon, accent, layout, ...rest] = m[1].split('|').map(p => p.trim());
        if (!id) return;
        const key = id.toLowerCase();
        map.set(key, {
            id:          key,
            label:       label || id,
            icon:        icon || '❖',
            accent:      safeColor(accent),
            layout:      LAYOUTS.includes(layout) ? layout : 'cards',
            description: rest.join('|'),
        });
    });
    return map;
}

function parseFrontmatter(raw) {
    const text = raw.replace(/\r\n/g, '\n').replace(/^﻿/, '');
    if (!text.startsWith('---\n')) return { meta: {}, body: text };
    const close = text.indexOf('\n---', 3);
    if (close === -1) return { meta: {}, body: text };

    const meta = {};
    text.slice(4, close).split('\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon < 1) return;
        const key   = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        meta[key] = key === 'tags'
            ? value.split(',').map(t => t.trim()).filter(Boolean)
            : value;
    });

    const body = text.slice(close + 4).replace(/^[^\n]*\n/, '');
    return { meta, body };
}

// Plain-text version of inline markdown (for excerpts)
function stripInline(t) {
    return t
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*\*|\*\*|\*|==|\^\^|`)/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// First prose paragraph → excerpt. Skips code, headings, quotes, lists,
// images and dividers. Falls back to the first sub-heading.
function deriveExcerpt(body, max = 170) {
    const lines = body.replace(/<!--[\s\S]*?-->/g, '').split('\n');
    let inCode = false, heading = '';
    const para = [];

    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('```')) { inCode = !inCode; if (para.length) break; continue; }
        if (inCode) continue;
        if (!t) { if (para.length) break; continue; }

        const h = t.match(/^#{1,4}\s+(.+)$/);
        if (h) { if (para.length) break; if (!heading) heading = h[1]; continue; }
        if (/^(>|[*-] |\d+\. |-{3,}$|!\[)/.test(t)) { if (para.length) break; continue; }
        para.push(t);
    }

    const text = stripInline(para.join(' ')) || stripInline(heading);
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

const countWords = body => (body.replace(/<!--[\s\S]*?-->/g, '').match(/\S+/g) || []).length;
const readTimeOf = body => Math.max(1, Math.round(countWords(body) / 200));

// ── Markdown → HTML ───────────────────────────

const HEADING   = /^(#{1,4})\s+(.+)$/;
const UL_ITEM   = /^[*-] /;
const OL_ITEM   = /^\d+\. /;
const HR        = /^-{3,}$/;
const IMG_BLOCK = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function slugify(text) {
    return stripInline(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

function parseMarkdown(md) {
    const lines  = md.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '').split('\n');
    const blocks = [];
    const slugs  = new Map();
    let i = 0;

    while (i < lines.length) {
        const trim = lines[i].trim();

        // Fenced code block
        if (trim.startsWith('```')) {
            const lang = (trim.slice(3).trim() || 'text').replace(/[^\w-]/g, '');
            const code = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
            i++; // consume closing ```
            // Drop leading/trailing blank lines inside the fence
            const src = code.join('\n').replace(/^\s*\n|\n\s*$/g, '');
            blocks.push(`<pre class="code-block"><code class="lang-${lang}">${escHtml(src)}</code></pre>`);
            continue;
        }

        if (trim === '') { i++; continue; }

        if (HR.test(trim)) {
            blocks.push('<hr class="blog-divider">');
            i++;
            continue;
        }

        const hm = trim.match(HEADING);
        if (hm) {
            const level = hm[1].length;
            let slug    = slugify(hm[2]);
            const n     = slugs.get(slug) || 0;
            slugs.set(slug, n + 1);
            if (n) slug += `-${n}`;
            blocks.push(`<h${level} id="${slug}" class="blog-h${level}">${inlineFormat(hm[2])}</h${level}>`);
            i++;
            continue;
        }

        if (trim.startsWith('>')) {
            const rows = [];
            while (i < lines.length && lines[i].trimStart().startsWith('>')) {
                rows.push(lines[i].replace(/^[ \t]*>[ \t]?/, ''));
                i++;
            }
            blocks.push(`<blockquote class="blog-quote">${inlineFormat(rows.join(' '))}</blockquote>`);
            continue;
        }

        if (UL_ITEM.test(trim)) {
            const items = [];
            while (i < lines.length && UL_ITEM.test(lines[i].trimStart())) {
                items.push(`<li>${inlineFormat(lines[i].trimStart().replace(UL_ITEM, ''))}</li>`);
                i++;
            }
            blocks.push(`<ul class="blog-list">${items.join('')}</ul>`);
            continue;
        }

        if (OL_ITEM.test(trim)) {
            const items = [];
            while (i < lines.length && OL_ITEM.test(lines[i].trimStart())) {
                items.push(`<li>${inlineFormat(lines[i].trimStart().replace(OL_ITEM, ''))}</li>`);
                i++;
            }
            blocks.push(`<ol class="blog-list blog-list-ol">${items.join('')}</ol>`);
            continue;
        }

        const imgm = trim.match(IMG_BLOCK);
        if (imgm) {
            blocks.push(
                `<figure class="blog-figure">` +
                `<img src="${escHtml(safeUrl(imgm[2]))}" alt="${escHtml(imgm[1])}" class="blog-img" loading="lazy">` +
                (imgm[1] ? `<figcaption class="blog-caption">${escHtml(imgm[1])}</figcaption>` : '') +
                `</figure>`
            );
            i++;
            continue;
        }

        // Paragraph — the first line is always consumed (guarantees progress),
        // then collect until a blank line or the start of another block.
        const para = [lines[i++]];
        while (i < lines.length) {
            const t = lines[i].trim();
            if (!t || HEADING.test(t) || t.startsWith('>') || t.startsWith('```') ||
                UL_ITEM.test(t) || OL_ITEM.test(t) || HR.test(t) || IMG_BLOCK.test(t)) break;
            para.push(lines[i++]);
        }
        blocks.push(`<p class="blog-p">${inlineFormat(para.join(' '))}</p>`);
    }

    return blocks.join('\n');
}

// Inline formatting (protects code spans first)
function inlineFormat(text) {
    const parts = [];
    const CODE  = /`([^`]+)`/g;
    let last = 0, m;
    while ((m = CODE.exec(text)) !== null) {
        if (m.index > last) parts.push(fmtSpans(text.slice(last, m.index)));
        parts.push(`<code class="inline-code">${escHtml(m[1])}</code>`);
        last = m.index + m[0].length;
    }
    parts.push(fmtSpans(text.slice(last)));
    return parts.join('');
}

function fmtSpans(t) {
    return t
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
            `<img src="${escHtml(safeUrl(src))}" alt="${escHtml(alt)}" class="blog-img-inline" loading="lazy">`)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
            `<a href="${escHtml(safeUrl(href))}" class="blog-link" target="_blank" rel="noopener">${label}</a>`)
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([^*]+)\*\*/g,     '<strong>$1</strong>')
        .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, '<em>$1</em>')
        .replace(/==([^=]+)==/g,          '<mark class="blog-highlight">$1</mark>')
        .replace(/\^\^([^^]+)\^\^/g,      '<small class="blog-small">$1</small>');
}

// ── Fetch layer (cached) ──────────────────────

async function fetchText(url) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchRawPost(filename) {
    if (rawCache.has(filename)) return rawCache.get(filename);
    const raw = await fetchText(BLOG_DIR + filename);
    rawCache.set(filename, raw);
    return raw;
}

async function fetchGenres() {
    try {
        return parseGenresMd(await fetchText(BLOG_DIR + 'genres.md'));
    } catch (err) {
        console.warn('No genres.md — all posts will show under "Other".', err);
        return new Map();
    }
}

function genreOf(id) {
    const key = String(id || '').trim().toLowerCase();
    return genres.get(key) || FALLBACK_GENRE;
}

// Listing: frontmatter + excerpt only; markdown is rendered lazily on open
async function fetchAllBlogMeta(files) {
    const results = await Promise.allSettled(files.map(async filename => {
        const { meta, body } = parseFrontmatter(await fetchRawPost(filename));
        const genre = genreOf(meta.genre);
        return {
            filename,
            title:    meta.title || filename.replace(/\.md$/, ''),
            date:     meta.date  || '',
            tags:     meta.tags  || [],
            genre:    genre.id,
            draft:    isTrue(meta.draft),
            accent:   safeColor(meta.accent) || genre.accent,
            excerpt:  meta.excerpt ? stripInline(meta.excerpt) : deriveExcerpt(body),
            readTime: readTimeOf(body),
        };
    }));

    results
        .filter(r => r.status === 'rejected')
        .forEach(r => console.warn('Skipped a post:', r.reason));

    return results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));
}

async function fetchBlogPost(filename) {
    if (htmlCache.has(filename)) return htmlCache.get(filename);

    const { meta, body } = parseFrontmatter(await fetchRawPost(filename));
    const genre = genreOf(meta.genre);
    const post  = {
        filename,
        title:    meta.title  || filename.replace(/\.md$/, ''),
        date:     meta.date   || '',
        tags:     meta.tags   || [],
        genre:    genre.id,
        draft:    isTrue(meta.draft),
        font:     meta.font   || 'sans',
        accent:   safeColor(meta.accent) || genre.accent,
        banner:   meta.banner ? safeUrl(meta.banner) : null,
        layout:   meta.layout === 'narrow' ? 'narrow' : 'wide',
        readTime: readTimeOf(body),
        html:     parseMarkdown(body),
    };

    htmlCache.set(filename, post);
    return post;
}

// ── Routing ───────────────────────────────────
// Every view change goes through navigate() → pushState → route(),
// so the browser Back / Forward buttons work between listing, genres and posts.

const publishedPosts = () => allPosts.filter(p => !p.draft);

function urlFor({ post, genre } = {}) {
    if (post) return `blogs.html?post=${encodeURIComponent(post)}`;
    if (genre && genre !== 'all') return `blogs.html?genre=${encodeURIComponent(genre)}`;
    return 'blogs.html';
}

function navigate(url) {
    if (viewListing.style.display !== 'none' && currentGenre) {
        scrollPos.set(currentGenre, blogListing.scrollTop);
    }
    history.pushState({ blog: true }, '', url);
    route();
}

function route() {
    const params = new URLSearchParams(location.search);
    const post   = params.get('post');
    if (post) showReader(post);
    else      showListing(params.get('genre') || 'all');
}

function showListing(genreId) {
    const visible = visibleGenres();
    const id      = visible.some(g => g.id === genreId) ? genreId : 'all';

    viewReader.style.display  = 'none';
    viewListing.style.display = '';
    document.documentElement.style.removeProperty('--blog-accent');
    document.title = id === 'all' ? 'Blog | SINGULARITY' : `${genreLabel(id)} · Blog | SINGULARITY`;

    renderGenreBar(visible, id);
    renderListing(id);
    blogListing.scrollTop = scrollPos.get(id) || 0;
}

function showReader(filename) {
    viewListing.style.display = 'none';
    viewReader.style.display  = '';
    viewReader.scrollTop      = 0;
    loadPost(filename);
}

const genreLabel = id => (id === 'all' ? ALL_GENRE : genreOf(id)).label;

// Intercept plain left-clicks on in-app links; let ctrl/cmd/middle-click
// open a new tab as normal.
function handleAppLink(event) {
    const link = event.target.closest('a[data-nav]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.getAttribute('href'));
}

// ── Genre bar ─────────────────────────────────

// Genres (in genres.md order) that have at least one published post,
// plus "Other" if any post has an unknown genre.
function visibleGenres() {
    const counts = new Map();
    publishedPosts().forEach(p => counts.set(p.genre, (counts.get(p.genre) || 0) + 1));

    const list = [...genres.values()].filter(g => counts.has(g.id));
    if (counts.has(FALLBACK_GENRE.id)) list.push(FALLBACK_GENRE);
    return list.map(g => ({ ...g, count: counts.get(g.id) }));
}

function renderGenreBar(visible, activeId) {
    const total = publishedPosts().length;
    const tabs  = [{ ...ALL_GENRE, count: total }, ...visible];

    genreBar.hidden    = total === 0;
    genreBar.innerHTML = tabs.map(g => {
        const active = g.id === activeId;
        const accent = g.accent ? ` style="--genre-accent:${g.accent}"` : '';
        return `
            <a href="${urlFor({ genre: g.id })}" data-nav
               class="category-btn genre-btn${active ? ' active' : ''}"${accent}
               ${active ? 'aria-current="page"' : ''}>
                <span class="genre-btn-icon" aria-hidden="true">${escHtml(g.icon)}</span>
                <span>${escHtml(g.label)}</span>
                <span class="genre-count">${g.count}</span>
            </a>`;
    }).join('');

    const current = tabs.find(g => g.id === activeId) || tabs[0];
    genreInfo.hidden = total === 0;
    genreInfo.style.setProperty('--genre-accent', current.accent || 'var(--color-cyan)');
    genreInfo.innerHTML = `
        <span class="genre-info-desc">${escHtml(current.description || '')}</span>
        <span class="genre-info-count">${current.count} ${current.count === 1 ? 'post' : 'posts'}</span>`;

    // Keep the active tab in view on narrow screens (horizontal scroller).
    // Set scrollLeft directly: scrollIntoView would also nudge the
    // overflow-hidden page containers.
    const active = genreBar.querySelector('.active');
    if (active && genreBar.scrollWidth > genreBar.clientWidth) {
        genreBar.scrollLeft = active.offsetLeft - (genreBar.clientWidth - active.offsetWidth) / 2;
    }
}

// ── Listing renderers ─────────────────────────

function renderListing(genreId) {
    currentGenre = genreId;
    const posts  = genreId === 'all'
        ? publishedPosts()
        : publishedPosts().filter(p => p.genre === genreId);
    const layout = genreId === 'all' ? ALL_GENRE.layout : genreOf(genreId).layout;
    const showGenre = genreId === 'all';

    blogListing.dataset.layout = layout;

    if (!posts.length) {
        blogListing.innerHTML = '<p class="retro-text blog-empty">no posts yet — check back soon</p>';
        return;
    }

    const render = { cards: renderCard, list: renderRow, grid: renderTile }[layout] || renderCard;
    blogListing.innerHTML = posts.map((p, i) => render(p, i, showGenre)).join('');
}

const accentStyle = (post, i) =>
    `style="animation-delay:${Math.min(i, 12) * 0.06}s${post.accent ? `;--post-accent:${post.accent}` : ''}"`;

function genreChip(post, asLink = false) {
    const g     = genreOf(post.genre);
    const inner = `<span aria-hidden="true">${escHtml(g.icon)}</span> ${escHtml(g.label)}`;
    const style = g.accent ? ` style="--genre-accent:${g.accent}"` : '';
    return asLink
        ? `<a href="${urlFor({ genre: g.id })}" data-nav class="genre-chip"${style}>${inner}</a>`
        : `<span class="genre-chip"${style}>${inner}</span>`;
}

const tagList = tags => tags.map(t => `<span class="blog-tag">${escHtml(t)}</span>`).join('');

// cards — essays: date, title, excerpt, tags
function renderCard(post, i, showGenre) {
    return `
        <a class="blog-card" href="${urlFor({ post: post.filename })}" data-nav ${accentStyle(post, i)}>
            <span class="blog-card-accent-bar" aria-hidden="true"></span>
            <div class="blog-card-body">
                <div class="blog-card-meta">
                    <time class="blog-card-date" datetime="${escHtml(post.date)}">${escHtml(formatDate(post.date))}</time>
                    <span class="blog-card-readtime">${post.readTime} min read</span>
                    ${showGenre ? genreChip(post) : ''}
                </div>
                <h2 class="blog-card-title">${escHtml(post.title)}</h2>
                ${post.excerpt ? `<p class="blog-card-excerpt">${escHtml(post.excerpt)}</p>` : ''}
                <div class="blog-card-footer">
                    <div class="blog-card-tags">${tagList(post.tags)}</div>
                    <span class="blog-read-link">Read →</span>
                </div>
            </div>
        </a>`;
}

// list — short notes: one compact row each
function renderRow(post, i) {
    return `
        <a class="blog-row" href="${urlFor({ post: post.filename })}" data-nav ${accentStyle(post, i)}>
            <time class="blog-row-date" datetime="${escHtml(post.date)}">${escHtml(formatDate(post.date, DATE_SHORT))}</time>
            <span class="blog-row-title">${escHtml(post.title)}</span>
            <span class="blog-row-leader" aria-hidden="true"></span>
            <span class="blog-row-time">${post.readTime} min</span>
        </a>`;
}

// grid — tools / projects: 2-column tiles
function renderTile(post, i) {
    const g = genreOf(post.genre);
    return `
        <a class="blog-tile" href="${urlFor({ post: post.filename })}" data-nav ${accentStyle(post, i)}>
            <span class="blog-tile-icon" aria-hidden="true">${escHtml(g.icon)}</span>
            <h2 class="blog-tile-title">${escHtml(post.title)}</h2>
            ${post.excerpt ? `<p class="blog-tile-excerpt">${escHtml(post.excerpt)}</p>` : ''}
            <div class="blog-tile-meta">
                <time datetime="${escHtml(post.date)}">${escHtml(formatDate(post.date, DATE_SHORT))}</time>
                <span>${post.readTime} min</span>
            </div>
        </a>`;
}

// ── Post renderer ─────────────────────────────

// Not-found / error state: only the message's own back link is shown
function renderReaderMessage(html) {
    setReaderChrome(false);
    $('blog-banner').hidden = true;
    $('post-title').textContent = '';
    $('blog-content').innerHTML = `
        <div class="blog-message">${html}
            <a href="blogs.html" data-nav class="blog-back-btn">← All Posts</a>
        </div>`;
}

function setReaderChrome(visible) {
    ['back-btn', 'post-meta'].forEach(id => { $(id).hidden = !visible; });
    $('blog-post').querySelector('.blog-post-footer').hidden = !visible;
}

async function loadPost(filename) {
    const content = $('blog-content');

    if (!indexFiles.has(filename)) {
        document.title = 'Post not found | SINGULARITY';
        renderReaderMessage(`
            <p class="retro-text">404 — post not found</p>
            <p>This post doesn't exist or was moved.</p>`);
        return;
    }

    setReaderChrome(true);
    content.innerHTML = '<span class="retro-text blog-loading-text">loading...</span>';

    try {
        const post = await fetchBlogPost(filename);
        // Ignore a stale response if the reader moved on meanwhile
        if (new URLSearchParams(location.search).get('post') !== filename) return;
        applyPost(post);
    } catch (err) {
        console.error('Failed to load post:', err);
        renderReaderMessage(`
            <p class="retro-text">could not load post</p>
            <p>Check your connection and try again.</p>`);
    }
}

function applyPost(post) {
    const article = $('blog-post');

    if (post.accent) document.documentElement.style.setProperty('--blog-accent', post.accent);
    else             document.documentElement.style.removeProperty('--blog-accent');

    article.style.fontFamily = BLOG_FONTS[post.font] || BLOG_FONTS.sans;
    article.dataset.layout   = post.layout;
    document.title = `${post.title} | SINGULARITY`;

    const bannerEl  = $('blog-banner');
    const bannerImg = $('blog-banner-img');
    bannerEl.hidden = !post.banner;
    if (post.banner) {
        bannerImg.src = post.banner;
        bannerImg.alt = post.title;
    }

    $('post-title').textContent    = post.title;
    $('post-date').textContent     = formatDate(post.date);
    $('post-date').dateTime        = post.date;
    $('post-readtime').textContent = `${post.readTime} min read`;
    $('post-genre').innerHTML      = genreChip(post, true) +
        (post.draft ? '<span class="draft-badge">draft</span>' : '');
    $('post-tags').innerHTML       = tagList(post.tags);
    $('post-tags-dot').hidden      = !post.tags.length;

    $('blog-content').innerHTML = post.html;
}

// ── Back buttons ──────────────────────────────
// Return to wherever the reader came from (keeps scroll + genre);
// on a direct deep link, fall back to the post's genre tab.

function goBack() {
    if (history.state?.blog) { history.back(); return; }
    const post = allPosts.find(p => p.filename === new URLSearchParams(location.search).get('post'));
    navigate(urlFor({ genre: post && !post.draft ? post.genre : 'all' }));
}

// ── Init ──────────────────────────────────────

async function init() {
    // Detect local file:// — fetch can't work
    if (location.protocol === 'file:') {
        blogListing.innerHTML = `
            <div class="zen-card small blog-message">
                <p>local file preview — the browser blocks fetch here</p>
                <p>Start a local server to see your posts:<br>
                   <code>npx serve .</code> then open <code>http://localhost:3000/blogs.html</code></p>
            </div>`;
        return;
    }

    try {
        const [files, genreMap] = await Promise.all([
            fetchText(BLOG_DIR + 'index.md').then(parseIndexMd),
            fetchGenres(),
        ]);
        indexFiles = new Set(files);
        genres     = genreMap;
        allPosts   = await fetchAllBlogMeta(files);
    } catch (err) {
        console.error('Failed to load blog index:', err);
        blogListing.innerHTML = '<p class="retro-text blog-empty">could not load posts — try again later</p>';
        return;
    }

    document.addEventListener('click', handleAppLink);
    $('back-btn').addEventListener('click', goBack);
    $('back-btn-footer').addEventListener('click', goBack);
    window.addEventListener('popstate', route);

    route();
}

init();
