# Pavan's Digital Garden

A personal site blending optimistic futurism with Japanese zen aesthetics. Home, Reviews, and Blog — all served as static files.

## Structure

```
├── index.html            # Home (bento grid)
├── reviews.html          # Reviews (category → cards)
├── blogs.html            # Blog (listing + reader)
├── css/
│   └── styles.css
├── js/
│   ├── reviews.js        # Review loader + UI
│   └── blogs.js          # Markdown engine + fetch + UI
├── images/
│   └── cogito_ergo_sum.png
├── content/
│   ├── blogs/            # Blog posts (.md)
│   └── reviews/          # One .md file per review category
└── docs/
    ├── BLOG_GUIDE.md
    └── REVIEWS_GUIDE.md
```

## Running locally

The site uses `fetch()` to load markdown content, which browsers block on `file://` URLs. Serve it locally:

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Adding content

- **Blog post**: create `content/blogs/my-post.md`, then add the filename to `content/blogs/index.md`. See `docs/BLOG_GUIDE.md`.
- **Review category**: create `content/reviews/my-category.md`, then add the filename to `content/reviews/index.md`. See `docs/REVIEWS_GUIDE.md`.