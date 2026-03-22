---
title: On Decay
date: 2025-01-20
tags: thoughts, design
font: serif
accent: #FF6B9D
---

# On Decay

Everything decays. Ratings. Memories. Enthusiasm.

I built a review system that encodes this idea mathematically — a score that shrinks each day using an exponential decay function. What felt like a **10** fades to a **5** in three months if I never revisit it.

## Why Decay is Honest

Most rating systems pretend opinions are permanent. A five-star review from 2012 sits next to one from yesterday, weighted equally. But the person who wrote that review in 2012 is not the same person today. Their tastes shifted. The thing they reviewed has aged.

> A static score is a lie. A decaying score is at least trying to be true.

The decay function I use is:

```
score = base × 0.5^(days / 90)
```

Simple. Exponential. Every 90 days, the score halves. After a year, even a perfect 10 becomes a 1.6.

## What This Forces

When you know a score will decay, you're nudged to *revisit* things. Did Elden Ring hold up after six months? Does that ramen spot still deserve an 8? You can adjust — add a `+1` or `-1` — and the clock partially resets through the new base.

It creates a living record instead of a frozen one.

## The Bigger Idea

I think most things should decay. To-do lists. Old code. Goals.

Not because they're worthless, but because decay forces a reckoning. Either you renew your commitment — actively, consciously — or you let it fade. Both are honest outcomes.

The only dishonest thing is pretending something is still relevant just because you never explicitly retired it.

---

Anyway. That's why my reviews page has animated bars that shrink over time.
