# Blog Genres
# ─────────────────────────────────────────────
# One genre per line, fields separated by |
#
#   - id | Label | icon | accent | layout | description
#
#   id          → what you write in a post's frontmatter:  genre: id
#   Label       → tab name shown on the blog page
#   icon        → one emoji / symbol
#   accent      → hex colour used for the tab glow, titles and links
#   layout      → how this genre's list looks:
#                   cards  big cards with excerpt + tags  (essays)
#                   list   compact one-line rows          (short notes, logs)
#                   grid   2-column tiles                 (tools, projects, picks)
#   description → one short line shown under the tabs
#
# Order here = tab order. Genres with no published posts are hidden
# automatically, so it's fine to define genres before writing for them.
# A post with an unknown / missing genre shows under "Other".
# ─────────────────────────────────────────────

- philosophy | Philosophy | ☯ | #6C63FF | cards | reading notes, arguments, big questions
- coding   | Coding   | ◈ | #FF6B9D | cards | Algorithms and Language
- tech       | Tech       | ⌨ | #4ECDC4 | grid  | tools, builds and experiments
- notes      | Notes      | ✎ | #FFD93D | list  | short, half-formed ideas
