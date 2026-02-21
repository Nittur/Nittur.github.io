# Reviews System Guide

A time-decay based review system where scores naturally decrease over time. Reviews are loaded directly from `.md` files.

## Quick Start

### Adding a New Review

1. Create a new `.md` file in `/reviews/` folder (e.g., `my-movie.md`)
2. Add the filename to `REVIEW_FILES` array in `reviews-data.js`

That's it! The review will appear automatically.

---

## .md File Format

```markdown
---
title: Movie Title
category: movie
icon: 🎬
tags: Tag1, Tag2, Tag3
initialScore: 9
initialDate: 2025-01-15
---

## History
2025-01-20 | +1
2025-01-25 | -1
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Display name |
| `category` | Yes | `movie`, `food`, `item`, or `game` |
| `icon` | Yes | Emoji: 🎬 🍜 📦 🎮 |
| `tags` | Yes | Comma-separated tags |
| `initialScore` | Yes | Starting score (0-10) |
| `initialDate` | Yes | YYYY-MM-DD format |

### Categories & Icons

| Category | Icon |
|----------|------|
| movie | 🎬 |
| food | 🍜 |
| item | 📦 |
| game | 🎮 |

---

## Adjusting Scores (+1 / -1)

When your opinion changes, add a line under `## History`:

```
2025-01-26 | +1
```

or

```
2025-01-26 | -1
```

- Each adjustment modifies the base score before decay applies
- Total score is capped at 10

---

## Decay Formula

```
currentScore = (baseScore + adjustments) × 0.5^(daysElapsed / 90)
```

- Score halves every 90 days
- The ribbon animates from 100% to the decayed width
- Colors indicate score tier:
  - Green (8-10): Excellent
  - Lime (6-8): Good  
  - Yellow (4-6): Average
  - Orange (2-4): Below Average
  - Red (0-2): Poor

### Customize Decay Speed

In `reviews-data.js`, change `halfLife`:

```javascript
const DECAY_CONFIG = {
    halfLife: 90,  // Change this (30 = fast, 365 = slow)
    maxScore: 10,
    minDisplayWidth: 5
};
```

---

## File Structure

```
/
├── reviews.html          # Auto-renders from .md files
├── reviews-data.js       # Config + file list + functions
├── styles.css            # Styling + animations
└── reviews/              # Your review .md files
    ├── inception.md
    ├── elden-ring.md
    └── ...
```

---

## Adding Files to Load

In `reviews-data.js`, add your filename:

```javascript
const REVIEW_FILES = [
    'inception.md',
    'my-new-review.md',  // Add here
    // ...
];
```
