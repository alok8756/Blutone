# Blutone

React implementation of the Blutone **Home** screen, built 1:1 from Figma
([design file](https://www.figma.com/design/V2WLi5jomYMXhbLgX4rqSd/Blutone?node-id=173-2071&m=dev)).

Every colour, font, size, text string and image is taken directly from the Figma
file — no invented values.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Pages & routing

Client-side routing via `react-router-dom` (`src/App.jsx`):

| Route | Page |
|-------|------|
| `/` | Home (Figma node `173-2071`) |
| `/product` | Product detail (Figma node `77:574`) |
| `/bag` | Shopping bag / cart (Figma node `134:2520`) |

Product cards on the Home page link to `/product`; the **Cart** icon (Home &
PDP bottom nav, desktop header) links to `/bag`; back arrows and the bottom-nav
Home icon return to the previous page / `/`. Each route renders the mobile or
desktop variant depending on viewport width (same 768px switch as Home).

The PDP gallery image, colour swatches and "Similar Products" are rendered as
the grey placeholders exactly as they appear in the Figma file — drop real
images in when available.

## How it works

`src/App.jsx` chooses the layout by viewport width:

- **`< 768px` — pixel-perfect mobile.** The exact **393 × 4319** Figma frame,
  reproduced with absolute positioning at the precise Figma coordinates
  (`src/Home.jsx`). `src/components/Frame.jsx` locks that 393 px canvas and
  scales it proportionally to fit the phone width (capped/centered on larger
  phones). This is the screen that matches Figma 1:1.
- **`≥ 768px` — reflowing desktop / tablet** (`src/desktop/DesktopHome.jsx`,
  `desktop.css`). A real responsive layout built from the **same** Figma colours,
  fonts, images and content: sticky top header, full-width hero, centered
  category row, product rails, 4-up stat grid, centered reviews and a dark
  multi-column footer. Internal breakpoints: 2-column stats + hidden decorative
  side images below 1024px.

All 54 Figma assets were downloaded locally into `src/assets/`
(`scripts/download-assets.mjs`) and resolved via `src/assets/manifest.json`.

## Structure

| Path | Purpose |
|------|---------|
| `src/tokens.js` | Exact Figma colours + font definitions |
| `src/data.js` | Product / category / stats / footer content (verbatim from Figma) |
| `src/App.jsx` | Routes + picks mobile vs desktop layout by viewport width |
| `src/Home.jsx` / `src/ProductPage.jsx` / `src/BagPage.jsx` | Mobile pages — every section at its Figma coordinates |
| `src/desktop/` | `DesktopHome`, `DesktopProduct`, `DesktopBag`, shared `DesktopHeader`/`DesktopFooter` + `desktop.css` |
| `src/components/` | `Frame` (scaler), `StatusBar`, `ProductCard`, `Icon`, `bits` |
| `src/pdp/passet.js`, `src/bag/basset.js` | Resolvers for the page-specific assets (`src/assets/pdp/`, `src/assets/bag/`) |
| `src/hooks/useMediaQuery.js` | Breakpoint hook used by `App.jsx` |
| `scripts/` | Asset download + screenshot tooling |

## Notes

- The mobile/desktop switch happens at **768px**. Mobile + desktop share the
  same tokens (`tokens.js`), content (`data.js`) and assets, so editing content
  updates both.
- Next pages can follow the same pattern: one mobile component (Figma-exact) +
  one responsive desktop component, both driven by the shared tokens/data.
