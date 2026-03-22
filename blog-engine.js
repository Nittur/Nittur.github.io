/**
 * BLOG ENGINE — Lightweight Markdown Framework
 *
 * ─────────────────────────────────────────────
 * TO ADD A NEW POST:
 *   1. Create  blogs/my-post.md
 *   2. Add     my-post.md   to  blogs/index.md
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

// ── Fonts (used by blogs.html when applying per-post font) ──

const BLOG_FONTS = {
    sans:  "'Zen Maru Gothic', sans-serif",
    mono:  "'JetBrains Mono', monospace",
    serif: "'Noto Serif JP', serif",
};

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
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Fetch layer ───────────────────────────────

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
    const text = await fetchText('blogs/index.md');
    return parseIndexMd(text);
}

async function fetchAllBlogMeta() {
    const files   = await fetchBlogIndex();
    const results = await Promise.allSettled(
        files.map(async filename => {
            const raw            = await fetchText(`blogs/${filename}`);
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

async function fetchBlogPost(filename) {
    const raw            = await fetchText(`blogs/${filename}`);
    const { meta, body } = parseFrontmatter(raw);
    const words          = body.trim().split(/\s+/).length;
    return {
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
}

function formatBlogDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US',
        { month: 'long', day: 'numeric', year: 'numeric' });
}
