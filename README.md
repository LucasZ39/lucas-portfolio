# Lucas — Personal Portfolio

Scroll-driven cinematic personal site. Vanilla HTML + CSS + JS. No build.

## Run locally

Double-click `index.html`, or serve from this folder:

```bash
npx serve .
# then open http://localhost:3000
```

## Six scroll phases

| Scroll | Section | Flight moment |
|--------|---------|---------------|
| 0 %    | Intro          | Boarding      |
| ~15 %  | Education      | Taxi          |
| ~32 %  | Projects (×2)  | Takeoff roll  |
| ~50 %  | Internship I   | Liftoff       |
| ~70 %  | Internship II  | Climb         |
| ~92 %  | Personal life  | Cruise        |

## Where to edit

Everything meaningful lives in **`index.html`**, inside the `<div class="hero-text" data-phase="N">` blocks. Find and replace:

- `[Project One]`, `[Project Two]`  → real project names
- `[Company One]`, `[Company Two]`  → real internship companies
- `[Role title]`, `[team name]`, etc. → real details
- `href="#"` on project cards → real GitHub / demo URLs
- `href="resume.pdf"` on the top-right link → your CV file (drop it in this folder as `resume.pdf`)

## Files

- `index.html` — markup, inline plane SVG, hero text blocks
- `styles.css` — cosmic sky, ground, runway, plane, HUD, cards
- `main.js`   — scroll → t → animation timeline
- `resume.pdf` — drop your CV here

## Deploy

Static site — drop this folder on:
- **GitHub Pages** (push, enable Pages)
- **Netlify / Vercel / Cloudflare Pages** (drag-and-drop)
- Any static host

## Dev tip

Append `?t=0.5` to any URL to freeze the animation at that scroll position — handy for tweaking a single moment without scrolling.
