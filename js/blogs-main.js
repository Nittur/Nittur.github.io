/**
 * BLOGS MAIN — UI rendering & routing for blogs.html
 */

let allMeta = [];

// ── Routing ───────────────────────────
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

// ── Listing renderer ──────────────────
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

// ── Post renderer ─────────────────────
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

// ── Back buttons ──────────────────────
document.getElementById('back-btn').addEventListener('click', showListing);
document.getElementById('back-btn-footer').addEventListener('click', showListing);

// ── Init ──────────────────────────────
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