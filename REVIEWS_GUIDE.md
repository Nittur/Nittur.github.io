# Reviews System Guide

A lightweight review system where you provide scores directly. Reviews are loaded from `.md` files — one file per category, no calculations involved.

## Quick Start

### Adding a New Category

1. Create `/reviews/my-category.md`
2. Add `my-category.md` to `/reviews/index.md` (one line)

That's it — no JS or HTML changes needed.

---

## .md File Format

Each category gets its own file. The frontmatter defines the category, and each body line is a single review item.

```markdown
---
category: movie
icon: 🎬
---

- Inception | 10 | 2025-01-15
- Interstellar | 8.5 | 2025-02-01
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `category` | Yes | `movie`, `food`, `item`, or `game` |
| `icon` | Yes | Emoji: 🎬 🍜 📦 🎮 |

### Item Line Format

Each review is a single bullet line:

```
- <Title> | <Score> | <YYYY-MM-DD>
```

| Part | Required | Description |
|------|----------|-------------|
| `Title` | Yes | Display name |
| `Score` | Yes | Your score (0-10, decimals allowed) |
| `Date` | No | Review date (YYYY-MM-DD) |

Example cases:

```
- Elden Ring | 10 | 2024-08-01
- Interstellar | 8.5 | 2025-02-01
- No Date Thing | 7
```

### Categories & Icons

| Category | Icon |
|----------|------|
| movie | 🎬 |
| food | 🍜 |
| item | 📦 |
| game | 🎮 |

---

## File Structure

```
/
├── reviews.html          # Auto-renders from .md files
├── reviews-data.js       # Loader (fetch + parse only)
├── styles.css            # Styling + animations
└── reviews/              # One .md file per category
    ├── index.md          # Lists category files
    ├── movies.md
    ├── games.md
    └── ...
```

---

## Adding Files to Load

Category files are auto-discovered from `reviews/index.md`. Add your filename there (one per line):

```
movies.md
games.md
my-category.md
```

No additional config needed.