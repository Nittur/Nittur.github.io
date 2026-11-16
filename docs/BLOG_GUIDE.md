# Blog Guide

You write posts as `.md` files in `content/blogs/`. Each post belongs to a **genre**, and each genre has its own tab and its own list layout. You never need to edit JS or HTML.

---

## Quick Start: New Post

1. Copy `content/blogs/_TEMPLATE.md` to `content/blogs/my-post.md`.
2. Add `my-post.md` on its own line in `content/blogs/index.md`.
3. Fill in the frontmatter, write the post, and set `draft: false`.

Done. The post appears under **All** and under its genre's tab, sorted newest first.

> Use lowercase-with-dashes filenames (`my-post.md`), because the filename becomes the post's URL. Only letters, numbers, `.`, `-` and `_` are accepted in `index.md`.

---

## Genres

Genres are defined once, in `content/blogs/genres.md`, with one line per genre:

```
- id         | Label      | icon | accent  | layout | description
- philosophy | Philosophy | ☯    | #6C63FF | cards  | reading notes, arguments, big questions
- thoughts   | Thoughts   | ◈    | #FF6B9D | cards  | essays on everything else
- tech       | Tech       | ⌨    | #4ECDC4 | grid   | tools, builds and experiments
- notes      | Notes      | ✎    | #FFD93D | list   | short, half-formed ideas
```

| Field         | What it does |
|---------------|--------------|
| `id`          | What you write in a post: `genre: tech` |
| `Label`       | Tab name |
| `icon`        | One emoji or symbol, shown on the tab, chips and grid tiles |
| `accent`      | Hex colour for the tab glow, titles and links (a post's own `accent` overrides it) |
| `layout`      | `cards`, `list` or `grid` (see below) |
| `description` | One line shown under the tabs |

- The line order in `genres.md` is the tab order.
- A genre with **no published posts is hidden**, so you can define genres before you write for them.
- A post whose genre is missing or misspelled appears under an **Other** tab.
- **To add a genre:** add one line. **To rename one:** change its `Label`. Keep the `id` so existing posts still match.

### The three layouts

```
cards: essays                      list: short notes
┌─────────────────────────────┐   Jan 4, 2026  Idea about X ········ 1 min
│ Apr 15 · 3 min read         │   Jan 2, 2026  Another note ········ 2 min
│ Title of the Essay          │   Dec 9, 2025  Something small ····· 1 min
│ First paragraph excerpt…    │
│ #tag #tag          Read →   │
└─────────────────────────────┘

grid: tools / projects / picks
┌──────────────┐ ┌──────────────┐
│ ⌨            │ │ ⌨            │
│ My Setup     │ │ Tiny CLI     │
│ excerpt…     │ │ excerpt…     │
│ Jan 2   3 min│ │ Dec 1   2 min│
└──────────────┘ └──────────────┘
```

The **All** tab always uses `cards` and shows a genre chip on each card.

---

## Post Frontmatter

```
---
title: My Post Title
date: 2026-01-31
genre: thoughts
tags: idea, another-tag
draft: false
font: sans
accent: #FF6B9D
banner: images/my-banner.jpg
layout: wide
excerpt: Optional custom summary for the listing.
---
```

| Field     | Values                  | Effect |
|-----------|-------------------------|--------|
| `title`   | any text                | Post title (required) |
| `date`    | `YYYY-MM-DD`            | Sort order and display date (required) |
| `genre`   | an id from `genres.md`  | Which tab the post is listed under |
| `tags`    | `tag1, tag2`            | Tag pills on the card and the post |
| `draft`   | `true` / `false`        | `true` hides the post from the listing; it still opens via its direct link (marked DRAFT) |
| `font`    | `sans` `serif` `mono`   | Body font for the post |
| `accent`  | `#hexcolor`             | Title, heading and link colour. If empty, the genre's colour is used |
| `banner`  | URL or `images/x.jpg`   | Hero image at the top of the post |
| `layout`  | `wide` `narrow`         | Reading column width (default `wide`) |
| `excerpt` | any text                | Custom listing summary. If empty, the first prose paragraph is used |

Fields you leave empty, or delete, fall back to their defaults.

---

## Markdown Reference

~~~markdown
# H1                  (accent colour)
## H2                 (accent colour, underline)
### H3
#### H4               (monospace)

**bold**  *italic*  ***both***  `inline code`
==highlighted==  ^^small caption^^

[link text](https://url.com)           opens in a new tab
![caption](images/pic.jpg)             on its own line: figure with caption

> pull-quote with accent border

- bullet
1. numbered

---                                    divider

```python
code block
```

<!-- comments are ignored, so you can use them for private notes -->
~~~

---

## Hiding and Removing Posts

| Goal | How |
|------|-----|
| Work in progress, not listed | `draft: true` |
| Preview a draft | open `blogs.html?post=my-post.md` |
| Remove from the site | delete its line from `index.md` (or wrap it in `<!-- -->`) |

---

## Links

```
blogs.html                     all posts
blogs.html?genre=tech          one genre tab
blogs.html?post=my-post.md     a single post
```

The browser Back and Forward buttons move between tabs and posts.

---

## Previewing Locally

Browsers block `fetch` on `file://`, so run a local server from the repo root:

```
npx serve .          then open http://localhost:3000/blogs.html
python -m http.server  then open http://localhost:8000/blogs.html
```

---

## File Structure

```
content/blogs/
├── index.md        list of post files (one per line)
├── genres.md       genre tabs: label, icon, accent, layout
├── _TEMPLATE.md    copy this to start a post
├── sartre.md
└── on-decay.md
js/blogs.js         markdown parser, genres, routing, rendering
css/styles.css      all styling (search for "BLOG SYSTEM")
images/             banner and post images
```
