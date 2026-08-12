# Lucas Zhang — Personal Portfolio

Live site: [lucaszhang.me](https://lucaszhang.me)

A scroll-driven cinematic portfolio built with vanilla HTML, CSS, and JavaScript. The site follows an airplane from boarding through cruise while presenting education, projects, internships, and personal interests.

There is no framework, package installation, database, or build step.

## Project structure

- `index.html` — page content, navigation, project cards, photos, and inline plane SVG
- `styles.css` — layout, typography, responsive design, animation visuals, cards, and gallery
- `main.js` — scroll timeline, phase transitions, canvas effects, gallery preparation, and plane movement
- `resume.pdf` — résumé opened by the fixed Résumé button
- `images/` — optimized public photos used by the Personal section
- `images/_original/` — private source photos; do not deploy or commit these files

## Current scroll phases

The site currently has seven phases:

1. Intro — boarding
2. Education — taxi
3. Projects — takeoff roll
4. JPMorganChase — liftoff
5. Kearney — climb
6. Kaizenvest — high-altitude climb
7. Personal — cruise

The phase labels and boundaries are defined in `main.js` as `PHASE_LABELS` and `PHASE_EDGES`. Matching content blocks use `data-phase="0"` through `data-phase="6"` in `index.html`.

## Run locally

From this folder:

```bash
npx serve .
```

Then open the local URL shown in Terminal, normally `http://localhost:3000`.

For timeline debugging, append a fixed progress value to the URL:

```text
http://localhost:3000/?t=0.5
```

Values range from `0` to `1`. Remove `?t=...` to restore normal scrolling.

## Publishing workflow

GitHub is the source Netlify uses to update the live site. Edit only this main project folder; a separate deployment folder is not required.

Before starting work:

```bash
cd "/Users/lucaszhang/Desktop/Lucas_website"
git pull
```

After making and testing a change:

```bash
git status
git add path/to/changed-file
git commit -m "Describe the update"
git push
```

For example:

```bash
git add index.html styles.css
git commit -m "Update internship content"
git push
```

Netlify watches the `main` branch of `LucasZ39/lucas-portfolio`. A successful push triggers a production deployment to `lucaszhang.me`.

After pushing:

1. Open Netlify and check that the latest deploy says **Published**.
2. Open `https://lucaszhang.me` in a private window.
3. Test the changed area on desktop and mobile.
4. Confirm the LinkedIn, email, and résumé links still work.

## Common updates

### Change text, dates, tags, or captions

Find the relevant `.hero-text` block in `index.html`, edit the content, test locally, and publish `index.html` through Git.

### Update the résumé

1. Export the new résumé as a PDF.
2. Replace `resume.pdf` while keeping that exact filename.
3. Open the Résumé button locally and confirm the correct PDF appears.
4. Publish it:

```bash
git add resume.pdf
git commit -m "Update resume"
git push
```

Review the PDF for personal information before publishing. The current site makes this file publicly downloadable.

### Add another project

1. In the Projects phase of `index.html`, duplicate one `.project-card` block.
2. Replace its name, description, and tags.
3. Add a real link only if there is a public repository, demo, or case study.
4. Check that all cards fit on desktop and mobile.

Adding a project inside the existing Projects phase does not require changing the main scroll timeline.

### Add or replace a photograph

1. Create an optimized JPEG close to the dimensions of the existing public images.
2. Strip GPS, camera, device, and capture-time metadata.
3. Place the public copy in `images/`.
4. Add or update its `<figure class="photo">` block in `index.html`.
5. Include explicit `width` and `height` attributes on the `<img>` element.
6. Check the five-column desktop gallery and swipeable mobile strip.

Never publish the `_original` folder. Public image metadata can be inspected with:

```bash
sips -g creation -g make -g model -g software images/IMAGE_NAME.jpeg
```

Those fields should return `<nil>`.

### Add another internship phase

Adding a new phase affects both content and animation timing:

1. Duplicate an internship `.hero-text` block in `index.html`.
2. Give it the next unique `data-phase` number.
3. Add a matching `.phase-tick` to the phase rail.
4. Add its label to `PHASE_LABELS` in `main.js`.
5. Add another boundary to `PHASE_EDGES` and redistribute the values from `0` to `1`.
6. Increase `.track` height in `styles.css` if the new phase feels too short.
7. Renumber later eyebrow labels in `index.html`.
8. Test every transition in both directions on desktop and mobile.

The number of hero blocks, phase ticks, phase labels, and phase intervals must remain synchronized.

### Add another page

1. Create a new HTML file such as `projects.html` or `about.html`.
2. Link it from `index.html` with a normal `<a href="projects.html">` link.
3. Reuse the existing fonts, colors, and shared styles where appropriate.
4. Ensure all file and image paths work from both pages.
5. Open the new page directly and navigate back to the portfolio.

A conventional content page is easier to maintain than extending the cinematic timeline for long-form material.

### Change the browser-tab title

Edit the `<title>` element inside the `<head>` of `index.html`, then publish `index.html`.

## Responsive and interaction notes

- Desktop section transitions use a shorter crossfade to prevent prolonged text overlap with a trackpad.
- Touch screens keep a softer phase transition.
- The Personal gallery becomes a horizontally swipeable strip below `720px`.
- Fully faded phases are hidden from hit testing so invisible cards cannot block active links.
- Visible portfolio text is selectable and copyable.
- Gallery images are prepared before the Personal phase and use explicit dimensions.

## Maintenance checklist

Once a month:

- Scroll through the live site on Safari and Chrome.
- Test one phone-sized viewport or a physical phone.
- Open LinkedIn, email, and résumé links.
- Confirm all gallery images load without hovering.
- Check Netlify **Deploys** for failures.
- Review Netlify **Logs & Metrics → Analytics**.
- Check Netlify **Usage & billing** for remaining credits.
- Confirm automatic renewal remains enabled for `lucaszhang.me` at the registrar.
- Keep two-factor authentication enabled on GitHub, Netlify, and the domain registrar.

Netlify manages and automatically renews the Let's Encrypt HTTPS certificate. Do not install a custom certificate unless the hosting setup changes.

## Privacy and repository hygiene

The repository should contain a `.gitignore` with at least:

```gitignore
.DS_Store
.Rhistory
.claude/
images/_original/
```

Adding a file to `.gitignore` does not remove it if Git already tracks it. To stop tracking private files while preserving local copies, use `git rm --cached` and commit the change. If sensitive files were pushed to a public repository, removing them from the latest commit does not remove earlier Git history; clean the history separately.

Never commit passwords, API keys, authentication tokens, private documents, or unprocessed personal photos.

## Recovery

If a deployment breaks the site:

1. In Netlify, open **Deploys**.
2. Select the most recent known-good production deployment.
3. Restore or publish that deployment.
4. Fix the source locally and push a new commit.

To reverse a committed change safely with Git:

```bash
git log --oneline
git revert COMMIT_ID
git push
```

Prefer `git revert` over destructive history commands for ordinary website fixes.
