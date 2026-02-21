/**
 * REVIEWS SYSTEM - Decay-Based Scoring
 * 
 * Reviews are fetched from .md files in /reviews folder.
 * Just add the filename to REVIEW_FILES array below.
 * 
 * DECAY FORMULA:
 * currentScore = (baseScore + adjustments) × (0.5)^(daysElapsed / halfLife)
 */

// ============================================
// CONFIGURATION
// ============================================

const DECAY_CONFIG = {
    halfLife: 90,        // Days for score to halve
    maxScore: 10,        // Maximum possible score
    minDisplayWidth: 5   // Minimum ribbon width percentage
};

// List of review .md files to load (just add filename here!)
const REVIEW_FILES = [
    'inception.md',
    'ichiran-ramen.md',
    'sony-wh1000xm5.md',
    'elden-ring.md',
    'spiderverse.md',
    'butter-chicken.md'
];

// ============================================
// MARKDOWN PARSER
// ============================================

/**
 * Parse YAML-like frontmatter from .md file content
 */
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return null;
    
    const frontmatter = match[1];
    const data = {};
    
    frontmatter.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            
            // Parse numbers
            if (key === 'initialScore') {
                value = parseFloat(value);
            }
            // Parse tags as array
            else if (key === 'tags') {
                value = value.split(',').map(t => t.trim());
            }
            
            data[key] = value;
        }
    });
    
    return data;
}

/**
 * Parse history entries from .md file content
 * Format: YYYY-MM-DD | +1 or -1
 */
function parseHistory(content) {
    const history = [];
    const historySection = content.split('## History')[1];
    
    if (!historySection) return history;
    
    const lines = historySection.split('\n');
    const historyRegex = /^(\d{4}-\d{2}-\d{2})\s*\|\s*([+-]?\d+)/;
    
    lines.forEach(line => {
        const match = line.trim().match(historyRegex);
        if (match) {
            history.push({
                date: match[1],
                change: parseInt(match[2])
            });
        }
    });
    
    return history;
}

/**
 * Fetch and parse a single review .md file
 */
async function fetchReview(filename) {
    try {
        const response = await fetch(`reviews/${filename}`);
        if (!response.ok) throw new Error(`Failed to load ${filename}`);
        
        const content = await response.text();
        const data = parseFrontmatter(content);
        
        if (!data) throw new Error(`Invalid frontmatter in ${filename}`);
        
        data.id = filename.replace('.md', '');
        data.history = parseHistory(content);
        
        return data;
    } catch (error) {
        console.error(`Error loading review ${filename}:`, error);
        return null;
    }
}

/**
 * Fetch all reviews from .md files
 */
async function fetchAllReviews() {
    const promises = REVIEW_FILES.map(file => fetchReview(file));
    const reviews = await Promise.all(promises);
    return reviews.filter(r => r !== null);
}

// ============================================
// DECAY CALCULATIONS
// ============================================

/**
 * Calculate the current decayed score for a review
 */
function calculateDecayedScore(review) {
    const now = new Date();
    const initialDate = new Date(review.initialDate);
    const daysElapsed = Math.floor((now - initialDate) / (1000 * 60 * 60 * 24));
    
    // Calculate total adjustments from history
    let adjustments = 0;
    if (review.history) {
        review.history.forEach(entry => {
            adjustments += entry.change;
        });
    }
    
    // Base score with adjustments (capped at maxScore)
    const baseScore = Math.min(review.initialScore + adjustments, DECAY_CONFIG.maxScore);
    
    // Apply exponential decay: score × (0.5)^(days / halfLife)
    const decayFactor = Math.pow(0.5, daysElapsed / DECAY_CONFIG.halfLife);
    const currentScore = baseScore * decayFactor;
    
    // Calculate ribbon width (percentage of max score)
    const ribbonWidth = Math.max(
        (currentScore / DECAY_CONFIG.maxScore) * 100,
        DECAY_CONFIG.minDisplayWidth
    );
    
    // Decay percentage (how much has decayed)
    const decayPercentage = ((baseScore - currentScore) / baseScore) * 100;
    
    return {
        currentScore: Math.round(currentScore * 10) / 10,
        baseScore: baseScore,
        decayPercentage: Math.round(decayPercentage),
        ribbonWidth: Math.round(ribbonWidth),
        daysElapsed: daysElapsed
    };
}

/**
 * Get color based on current score
 */
function getScoreColor(score) {
    if (score >= 8) return '#22c55e';      // Green - Excellent
    if (score >= 6) return '#84cc16';      // Lime - Good
    if (score >= 4) return '#eab308';      // Yellow - Average
    if (score >= 2) return '#f97316';      // Orange - Below Average
    return '#ef4444';                       // Red - Poor
}
