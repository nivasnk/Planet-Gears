# TORQLINE Precision Gears — Website

A premium industrial gear-manufacturer website. It's plain **HTML + CSS + JavaScript** with no build step, so it runs directly on **GitHub Pages**.

## Libraries (all free, loaded from CDN, version-pinned)
| Library | Used for |
|---|---|
| GSAP 3.12.5 + ScrollTrigger + Flip | Hero intro, scroll reveals, parallax, counters, process line, catalogue filter animation |
| Motion 11.11.13 | Card hover lift/tilt, gear spin on hover, magnetic buttons, modal & menu transitions |
| Swiper 11.1.14 | Product-category slider and featured-products slider |
| Lucide 0.460.0 | All UI icons |
| Google Fonts | Barlow Condensed (headings), Barlow (body) |

All gear imagery is drawn as SVG by `assets/js/gears.js`, so the site needs no image files and has no licensing issues. The hero gears mesh correctly and speed up as you scroll.

## Structure
```
index.html          Home: hero, categories, about, counters, featured, process, industries, quality, contact
products.html       Catalogue: filters (type, material, industry, search, sort), specifications, enquiry buttons
404.html            Custom not-found page (GitHub Pages uses it automatically)
admin.html          Visual text editor: click text, type, publish to GitHub (no code needed)
assets/css/style.css
assets/js/gears.js      SVG gear renderer
assets/js/main.js       Navigation, mega menu, animations, sliders, modal, forms
assets/js/catalogue.js  Catalogue filtering
sitemap.xml, robots.txt, .nojekyll
```

## Deploy to GitHub Pages
1. Create a repository (e.g. `gears-website`) and push this folder's contents to the `main` branch.
2. In the repository, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. The site goes live at `https://YOUR-USERNAME.github.io/gears-website/`.
4. Replace `YOUR-USERNAME` in `index.html`, `products.html`, `sitemap.xml` and `robots.txt` (canonical URLs and structured data).

## Editing text without code: `admin.html`
Open `https://YOUR-USERNAME.github.io/gears-website/admin.html` in your browser. It isn't linked from the site and search engines are told not to index it.

**One-time setup:** click **GitHub**, enter your username and repository name, and paste a fine-grained access token. To create the token, go to GitHub → Settings → Developer settings → Fine-grained tokens → New token. Under *Only select repositories*, pick this repo, and under *Permissions → Contents*, choose **Read and write**. The token is stored only in your own browser.

**Everyday use:**
1. Pick a page tab: Home, Products or 404.
2. Click any text in the live preview, or find it in the list or search box, then type the new text.
3. Press **Publish**. GitHub saves the change and the live site updates in about 1–2 minutes.

**Find & replace** changes a word everywhere on every page, including links. Use it for the phone number, email, company name or address.

**Without GitHub:** run the site locally (for example with VS Code's Live Server extension) and open `admin.html`. Edit the text, press **Download**, and replace the old HTML files with the downloaded ones.

The editor only changes the text you edit and leaves all other code untouched. Pages stay plain HTML, so SEO is unaffected. To make a new page editable, add it to the `PAGES` list near the top of the script in `admin.html`.

## Contact forms on a static host
GitHub Pages can't run server code, so the forms work in one of two ways:
- **Default:** submitting opens the visitor's email app with the enquiry pre-filled, addressed to `data-mailto`.
- **Recommended:** create a free form at [formspree.io](https://formspree.io), then add `data-endpoint="https://formspree.io/f/YOUR_ID"` to each `<form data-enquiry-form>` (one in the contact section and one in the enquiry modal). Submissions then arrive by email with no email app needed.

## Placeholders to replace
- Company name **TORQLINE**: search and replace across all files.
- Phone `+00 123 000 0000` / `tel:+123000000000`, email `sales@example.com`, address `Plot 00, Industrial Estate, Your City, Your Country`.
- Figures and claims: years, counters (36 / 1,200 / 850 / 9,500), certifications, plant size, equipment and product specifications. **Change these to your real data before publishing.**
- Social links in the footer (`href="#"`).

## Editing products
Each product in `products.html` is a static `<article class="product-card">`, which keeps it SEO-friendly. Its filter attributes are:
- `data-category`: one of `spur helical bevel worm rack planetary shaft sprocket`
- `data-material`: one of `alloy-steel carbon-steel bronze polymer`
- `data-industry`: a space-separated list (`automotive wind mining marine oil-gas material-handling agriculture railways steel-cement robotics food-pharma`)
- `data-size`: max diameter in mm (used for sorting)

The image comes from `data-gear` (`spur helical herringbone bevel worm rack planetary ring shaft sprocket polymer`), plus the optional `data-teeth` and `data-tone` (`steel dark orange bronze polymer`).

To use real product photos, replace the `<div data-gear …>` inside `.media` with `<img src="assets/img/your-photo.webp" alt="…" loading="lazy">`.

## Performance and accessibility
- Gear SVGs render lazily, only when near the viewport.
- The hero animation pauses when off-screen or when the tab is hidden.
- Animations use transforms and opacity only. Scroll reveals are batched.
- `prefers-reduced-motion` turns off all motion.
- If a CDN fails, the content still shows after 2.5 seconds.
- Semantic landmarks, skip link, keyboard-operable mega menu, focus-trapped modal, ARIA labels.
