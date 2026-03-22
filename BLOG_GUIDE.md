# Blog Guide

Write posts as `.md` files in `/blogs/`, then add the filename to `/blogs/index.md`. No JS or HTML edits needed.

---

## Creating a Post

1. Create `/blogs/my-post-title.md`
2. Add `my-post-title.md` to `/blogs/index.md` (one line)

Done — no JS or HTML changes needed.

---

## .md File Format

```
---
title: My Post Title
date: 2025-01-26
tags: thoughts, tech
font: sans
accent: #FF6B9D
banner: https://example.com/image.jpg
layout: wide
---

Your content here...
```

### Frontmatter Fields

| Field    | Values                        | Effect |
|----------|-------------------------------|--------|
| `title`  | any text                      | Post title (required) |
| `date`   | `YYYY-MM-DD`                  | Sort order + display (required) |
| `tags`   | `tag1, tag2`                  | Tag pills on card and post |
| `font`   | `sans` `mono` `serif`         | Body font for the post |
| `accent` | `#hexcolor`                   | Color for headings, links, card title bar |
| `banner` | URL or `blogs/image.jpg`      | Full-width hero image at top |
| `layout` | `wide` `narrow`               | Content width (default: `wide`) |
| `excerpt`| any text                      | Custom listing excerpt (else uses first paragraph) |

---

## Markdown Reference

### Text

```markdown
**bold**
*italic*
***bold and italic***
`inline code`
==highlighted text==
^^small caption text^^
```

### Headings

```markdown
# H1 - uses accent color
## H2 - uses accent color, underline
### H3
#### H4 - monospace
```

### Links & Images

```markdown
[link text](https://url.com)

![caption text](https://image-url.com)

<!-- Standalone images become <figure> with caption -->
<!-- Inline images stay inline -->
```

### Code

````markdown
```python
def hello():
    print("world")
```
````

Inline: `` `some code` ``

### Blockquote

```markdown
> This becomes a styled pull-quote with an accent-colored left border.
```

### Lists

```markdown
- item one
- item two

1. first
2. second
```

### Divider

```markdown
---
```

---

## Examples

### Minimal Post

```markdown
---
title: Hello World
date: 2025-01-26
tags: meta
---

First paragraph becomes the listing excerpt automatically.

## A Section

Content goes here.
```

### Styled Post with Banner

```markdown
---
title: My Setup
date: 2025-01-26
tags: tools, setup
font: mono
accent: #4ECDC4
banner: https://images.unsplash.com/photo-xxx?w=1200
layout: wide
---

# My Setup

Everything I use to get things done.
```

### Personal / Essay

```markdown
---
title: Thoughts on Silence
date: 2025-01-26
tags: personal
font: serif
accent: #6C63FF
---

> A quote to open with.

Three paragraphs of actual content...
```

---

## Register in blog-engine.js

```javascript
const BLOG_FILES = [
    'on-decay.md',
    'tools-i-use.md',
    'my-new-post.md',  // ← add here
];
```

Posts are sorted by `date` (newest first).

---

## File Structure

```
/
├── blogs.html           # Listing + reader (single page)
├── blog-engine.js       # MD parser, fetch layer, file list
└── blogs/
    ├── on-decay.md
    ├── tools-i-use.md
    └── your-post.md
```

---

## Deep Linking

Every post is linkable:

```
https://yoursite.com/blogs.html?post=on-decay.md
```
