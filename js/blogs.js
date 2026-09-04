/**
 * BLOG ENGINE + UI — Lightweight Markdown Framework
 *
 * ─────────────────────────────────────────────
 * TO ADD A NEW POST:
 *   1. Create  content/blogs/my-post.md
 *   2. Add     my-post.md   to  content/blogs/index.md
 *   That's it — no JS or HTML changes needed.
 * ─────────────────────────────────────────────
 *
 * POST .md FORMAT:
 *   ---
 *   title: My Post
 *   date: 2025-01-26
 *   tags: thoughts, tech
 *   font: sans              ← sans | mono | serif
 *   accent: #FF6B9D         ← headings + link colour
 *   banner: https://...     ← hero image url
 *   layout: wide            ← wide | narrow
 *   ---
 *
 *   # Heading 1
 *   ## Heading 2
 *   **bold**  *italic*  `code`  ==highlight==  ^^small^^
 *   > blockquote
 *   - list item
 *   1. ordered item
 *   [link text](url)
 *   ![alt text](image-url)
 *   ---  (divider)
 */

// ── Fonts (used when applying per-post font) ──

const BLOG_FONTS = {
    sans:  "'Zen Maru Gothic', sans-serif",
    mono:  "'JetBrains Mono', monospace",
    serif: "'Noto Serif JP', serif",
};

// ── Caches (avoid redundant fetches + re-parsing) ──
// rawCache maps filename → raw markdown text (fetched once)
const rawCache  = new Map();
// htmlCache maps filename → rendered HTML (rendered lazily on open)
const htmlCache = new Map();

let allMeta = [];

// ── Index & frontmatter parsing ───────────────

function parseIndexMd(text) {
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.endsWith('.md'));
}

function parseFrontmatter(raw) {
    const text  = raw.replace(/\r\n/g, '\n');
    const start = text.indexOf('---\n');
    if (start !== 0) return { meta: {}, body: text };
    const close = text.indexOf('\n---', 4);
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

    const body = text.slice(close + 4).replace(/^\n/, '');
    return { meta, body };
}

// ── Markdown → HTML ───────────────────────────

function parseMarkdown(md) {
    const lines  = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const blocks = [];
    let i        = 0;
    let guard    = 0;
    const MAX    = lines.length * 3;

    while (i < lines.length && guard++ < MAX) {
        const line = lines[i];
        const trim = line.trim();

        // Fenced code block
        if (trim.startsWith('```')) {
            const lang = trim.slice(3).trim() || 'text';
            const code = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                code.push(lines[i]);
                i++;
            }
            i++; // consume closing ```
            blocks.push(
                `<pre class="code-block"><code class="lang-${lang}">${escHtml(code.join('\n'))}</code></pre>`
            );
            continue;
        }

        // Horizontal rule
        if (/^-{3,}$/.test(trim)) {
            blocks.push('<hr class="blog-divider">');
            i++;
            continue;
        }

        // Heading
        const hm = trim.match(/^(#{1,4})\s+(.+)$/);
        if (hm) {
            const level = hm[1].length;
            const slug  = hm[2].toLowerCase().replace(/[^a-z0-9]+/g, '-');
            blocks.push(
                `<h${level} id="${slug}" class="blog-h${level}">${inlineFormat(hm[2])}</h${level}>`
            );
            i++;
            continue;
        }

        // Blockquote
        if (trim.startsWith('>')) {
            const rows = [];
            while (i < lines.length && lines[i].trimStart().startsWith('>')) {
                rows.push(lines[i].replace(/^[ \t]*>[ \t]?/, ''));
                i++;
            }
            blocks.push(`<blockquote class="blog-quote">${inlineFormat(rows.join(' '))}</blockquote>`);
            continue;
        }

        // Unordered list
        if (/^[*-] /.test(trim)) {
            const items = [];
            while (i < lines.length && /^[*-] /.test(lines[i].trimStart())) {
                items.push(`<li>${inlineFormat(lines[i].replace(/^[ \t]*[*-] /, ''))}</li>`);
                i++;
            }
            blocks.push(`<ul class="blog-list">${items.join('')}</ul>`);
            continue;
        }

        // Ordered list
        if (/^\d+\. /.test(trim)) {
            const items = [];
            while (i < lines.length && /^\d+\. /.test(lines[i].trimStart())) {
                items.push(`<li>${inlineFormat(lines[i].replace(/^\d+\. /, ''))}</li>`);
                i++;
            }
            blocks.push(`<ol class="blog-list blog-list-ol">${items.join('')}</ol>`);
            continue;
        }

        // Standalone image
        const imgm = trim.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgm) {
            blocks.push(
                `<figure class="blog-figure">` +
                `<img src="${imgm[2]}" alt="${imgm[1]}" class="blog-img" loading="lazy">` +
                (imgm[1] ? `<figcaption class="blog-caption">${imgm[1]}</figcaption>` : '') +
                `</figure>`
            );
            i++;
            continue;
        }

        // Empty line
        if (trim === '') {
            i++;
            continue;
        }

        // Paragraph — collect until blank line or block element
        const para = [];
        while (i < lines.length) {
            const t = lines[i].trim();
            if (!t || t.startsWith('#') || t.startsWith('>') || t.startsWith('```') ||
                /^[*-] /.test(t) || /^\d+\. /.test(t) || /^-{3,}$/.test(t)) break;
            para.push(lines[i]);
            i++;
        }
        if (para.length) {
            blocks.push(`<p class="blog-p">${inlineFormat(para.join(' '))}</p>`);
        } else {
            i++; // safety — should never reach here, but guarantees progress
        }
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
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([^*]+)\*\*/g,     '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        .replace(/==([^=]+)==/g,          '<mark class="blog-highlight">$1</mark>')
        .replace(/\^\^([^^]+)\^\^/g,      '<small class="blog-small">$1</small>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
            '<img src="$2" alt="$1" class="blog-img-inline" loading="lazy">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" class="blog-link" target="_blank" rel="noopener">$1</a>');
}

function escHtml(s) {
    return s
        .replace(/&/g, '&' + 'amp;')
        .replace(/</g, '&' + 'lt;')
        .replace(/>/g, '&' + 'gt;');
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

async function fetchBlogIndex() {
    const text = await fetchText('content/blogs/index.md');
    return parseIndexMd(text);
}

// Fetch raw post text exactly once; reuse the cache after that.
async function fetchRawPost(filename) {
    if (rawCache.has(filename)) return rawCache.get(filename);
    const raw = await fetchText(`content/blogs/${filename}`);
    rawCache.set(filename, raw);
    return raw;
}

// Listing: fetch + parse frontmatter + derive excerpt/read-time,
// but DO NOT render markdown → HTML (lazy; done when a post is opened).
async function fetchAllBlogMeta() {
    const files   = await fetchBlogIndex();
    const results = await Promise.allSettled(
        files.map(async filename => {
            const raw            = await fetchRawPost(filename);
            const { meta, body } = parseFrontmatter(raw);
            const words          = body.trim().split(/\s+/).length;
            const readTime       = Math.max(1, Math.round(words / 200));
            const firstLine      = body.split('\n').find(
                l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('>')
            ) || '';
            const excerpt = (meta.excerpt || firstLine).replace(/[*_`#>]/g, '').slice(0, 160);
            return {
                filename,
                title:    meta.title  || filename.replace('.md', ''),
                date:     meta.date   || '',
                tags:     meta.tags   || [],
                accent:   meta.accent || null,
                banner:   meta.banner || null,
                excerpt,
                readTime,
            };
        })
    );

    return results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Reader: reuse cached raw text (no re-fetch), render HTML lazily,
// and cache the rendered HTML for repeat opens.
async function fetchBlogPost(filename) {
    const raw = await fetchRawPost(filename);

    if (htmlCache.has(filename)) {
        return htmlCache.get(filename);
    }

    const { meta, body } = parseFrontmatter(raw);
    const words          = body.trim().split(/\s+/).length;

    const post = {
        filename,
        title:    meta.title    || filename.replace('.md', ''),
        date:     meta.date     || '',
        tags:     meta.tags     || [],
        font:     meta.font     || 'sans',
        accent:   meta.accent   || null,
        banner:   meta.banner   || null,
        layout:   meta.layout   || 'wide',
        readTime: Math.max(1, Math.round(words / 200)),
        html:     parseMarkdown(body),
    };

    htmlCache.set(filename, post);
    return post;
}

function formatBlogDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US',
        { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Routing ───────────────────────────────────

function showListing() {
    document.getElementById('view-listing').style.display = '';
    document.getElementById('view-reader').style.display  = 'none';
    // Reset any post-level CSS variables
    document.documentElement.style.removeProperty('--blog-accent');
    document.body.style.fontFamily = '';
    history.replaceState(null, '', 'blogs.html');
    window.scrollTo(0, 0);
}

function showReader(filename) {
    document.getElementById('view-listing').style.display = 'none';
    document.getElementById('view-reader').style.display  = '';
    history.replaceState(null, '', `blogs.html?post=${filename}`);
    loadPost(filename);
    window.scrollTo(0, 0);
}

// ── Listing renderer ──────────────────────────

function renderListing(posts) {
    const el = document.getElementById('blog-listing');
    if (!posts.length) {
        el.innerHTML = '<p class="retro-text blog-empty">// no posts yet</p>';
        return;
    }

    el.innerHTML = posts.map((post, i) => `
        <article class="blog-card" 
                 style="animation-delay: ${i * 0.08}s"
                 data-file="${post.filename}">
            <div class="blog-card-body">
                <div class="blog-card-meta">
                    <time class="blog-card-date">${formatBlogDate(post.date)}</time>
                    <span class="blog-card-readtime">${post.readTime} min read</span>
                </div>
                <h2 class="blog-card-title"
                    ${post.accent ? `style="color: ${post.accent};"` : ''}>
                    ${post.title}
                </h2>
                <p class="blog-card-excerpt">${post.excerpt}…</p>
                <div class="blog-card-footer">
                    <div class="blog-card-tags">
                        ${post.tags.map(t => `<span class="blog-tag">${t}</span>`).join('')}
                    </div>
                    <span class="blog-read-link">Read →</span>
                </div>
            </div>
            ${post.accent ? `<div class="blog-card-accent-bar" style="background: ${post.accent};"></div>` : ''}
        </article>
    `).join('');

    // Click to open
    el.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => showReader(card.dataset.file));
    });
}

// ── Post renderer ─────────────────────────────

async function loadPost(filename) {
    const content = document.getElementById('blog-content');
    content.innerHTML = '<span class="retro-text blog-loading-text">// loading...</span>';

    try {
        const post = await fetchBlogPost(filename);
        applyPost(post);
    } catch (err) {
        content.innerHTML = `
            <p style="color:var(--color-text-muted);font-family:var(--font-mono);font-size:.9rem;line-height:1.8">
                // could not load post.<br>
                If you're previewing locally, run a server first:<br>
                <code style="color:var(--color-yellow)">npx serve .</code>
                &nbsp;then open <code style="color:var(--color-cyan)">http://localhost:3000</code>
            </p>`;
    }
}

function applyPost(post) {
    const content = document.getElementById('blog-content');

    // Per-post accent colour
    const accent = post.accent || null;
    if (accent) {
        document.documentElement.style.setProperty('--blog-accent', accent);
    } else {
        document.documentElement.style.removeProperty('--blog-accent');
    }

    // Per-post font
    const fontStack = BLOG_FONTS[post.font] || BLOG_FONTS.sans;
    document.getElementById('blog-post').style.fontFamily = fontStack;

    // Banner
    const bannerEl  = document.getElementById('blog-banner');
    const bannerImg = document.getElementById('blog-banner-img');
    if (post.banner) {
        bannerImg.src = post.banner;
        bannerImg.alt = post.title;
        bannerEl.style.display = '';
    } else {
        bannerEl.style.display = 'none';
    }

    // Header fields
    document.getElementById('post-title').textContent   = post.title;
    document.getElementById('post-date').textContent    = formatBlogDate(post.date);
    document.getElementById('post-readtime').textContent = `${post.readTime} min read`;
    document.getElementById('post-tags').innerHTML =
        (post.tags || []).map(t => `<span class="blog-tag">${t}</span>`).join('');

    // Layout
    document.getElementById('blog-post').dataset.layout = post.layout || 'wide';

    // Rendered content
    content.innerHTML = post.html;
}

// ── Back buttons ──────────────────────────────

document.getElementById('back-btn').addEventListener('click', showListing);
document.getElementById('back-btn-footer').addEventListener('click', showListing);

// ── Init ──────────────────────────────────────

async function init() {
    const listing = document.getElementById('blog-listing');

    // Detect local file:// — fetch can't work
    if (location.protocol === 'file:') {
        listing.innerHTML = `
            <div class="zen-card small" style="text-align:center;padding:var(--space-xl)">
                <p style="font-family:var(--font-mono);color:var(--color-text-muted);line-height:2">
                    // local file preview — fetch is blocked by the browser<br>
                    Start a local server to see your posts:<br>
                    <code style="color:var(--color-yellow)">npx serve .</code>
                    &nbsp;then open&nbsp;
                    <code style="color:var(--color-cyan)">http://localhost:3000/blogs.html</code>
                </p>
            </div>`;
        return;
    }

    try {
        allMeta = await fetchAllBlogMeta();
        renderListing(allMeta);
    } catch (err) {
        console.error('Failed to load blog index:', err);
        listing.innerHTML =
            '<p class="retro-text blog-empty">// could not load posts — check console</p>';
    }

    // Deep-link: ?post=filename.md
    const postFile = new URLSearchParams(location.search).get('post');
    if (postFile) showReader(postFile);
}

document.addEventListener('DOMContentLoaded', init);