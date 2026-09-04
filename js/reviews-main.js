/**
 * REVIEWS MAIN — UI rendering & interactions for reviews.html
 */

let allReviews = [];

// Derived from loaded reviews — no hardcoding needed
let categoryMeta = {}; // { category: { label, icon } }

// Render reviews for a specific category
function renderReviews(category) {
    const container = document.getElementById('reviews-container');
    container.innerHTML = '';

    const filtered = allReviews.filter(r => r.category === category);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-reviews retro-text">// no reviews yet in this category</p>';
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

// Initialize
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