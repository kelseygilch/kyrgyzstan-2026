# Kyrgyzstan 2026 · Trip Planner

A small, self-contained web app for planning our 2026 Scotland → Kyrgyzstan trip.
No build step, no server, no dependencies — just open `index.html` in a browser.

## Features

### Itinerary
- Switch between two groups: **Trevor & Kelsey** and **Todd & Luci**.
- Trevor & Kelsey's 25-day itinerary is pre-loaded from the planning spreadsheet
  (Skye → wedding → Bishkek → the 9-day Jyrgalan → Jeti-Oguz traverse → home).
- Each day shows quick chips (hiking distance/time, elevation, driving, accommodation).
  Click a day to expand and edit every field inline.
- **Todd & Luci** starts empty — hit **“Copy Trevor & Kelsey's plan across”** to clone
  it, then edit only the days that differ. Add/delete days with the buttons.

### Flights
- All flight legs grouped by journey (Outbound, Edinburgh→Bishkek, Return), each card
  showing flight number, airline, departure/arrival times, duration, aircraft and a
  "+1 day" badge for overnight legs.
- Times/places/notes are editable inline; add or delete flights as plans change.
- Seeded from published timetables — confirm against your actual booking.

### Food
- **Per-person** meal plans (Trevor / Kelsey / Todd / Luci), switchable like Packing.
- The **9 trek days** as rows, with **Breakfast / Lunch / Dinner** columns. Each meal holds
  a list of **food items** (name + quantity) you can add/edit/remove.
- Sensible defaults: every breakfast = **2 Oatmeal + 1 Coffee**, every dinner =
  **1 Dehydrated meal**, no default lunch.
- **Yurt/hotel logic:** nights at a yurt (or the Bishkek hotel) automatically skip that
  night's dinner and the next morning's breakfast — those cells show "🛖 Provided" instead,
  since the camp feeds you.
- A **summary** at the bottom sums up like foods across all days for that person
  (e.g. *12 Oatmeal · 6 Coffee · 5 Dehydrated meal*) so you know what to buy and pack.

### Packing
- Four people: **Trevor, Kelsey, Todd, Luci**, each with their own personal checklist
  (seeded from past trips — NZ, Peru, Larapinta), grouped into **collapsible categories**
  (click a category header to fold it; your collapsed/expanded choices are remembered).
- Tick items as packed; per-person progress bar at the top, plus a packed count per category.
- **Shared gear** lives in its own section. Each shared item has:
  - a **quantity** the group needs (e.g. 2 tents, 1 jet boil), and
  - a **carrier dropdown per unit** so you can record *who* carries each one
    (e.g. Tent #1 → Todd, Tent #2 → Trevor), with its own packed checkbox.
- Move a personal item into shared gear with the **“→ Shared”** button, or add new
  shared items directly.

### Saving your work
- Everything you type is saved automatically in **your browser** (localStorage).
- **Export** downloads the whole trip as a `.json` file. **Import** loads one back.
  Use this to move data between devices or share a snapshot with the others.
- **Reset** restores the original spreadsheet defaults (export first if unsure).

> Note: localStorage is per-browser/per-device. It is *not* a live shared database —
> if Todd edits on his laptop, export the JSON and send it over (or we add a backend later).

## Running it

Just double-click `index.html`, or serve the folder:

```bash
# from this folder
python -m http.server 8000
# then open http://localhost:8000
```

## Publishing to GitHub Pages

1. Create a repo on GitHub and push this folder (the source `.xlsx` files are git-ignored).
   ```bash
   git remote add origin https://github.com/<you>/kyrgyzstan-2026.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   pick `main` / `/ (root)`, save.
3. Your live link will be `https://<you>.github.io/kyrgyzstan-2026/`.

## Project structure

```
index.html      app shell (two tabs)
css/styles.css  styling
js/data.js      seed data extracted from the spreadsheets (itinerary + meals + packing master list)
js/app.js       all app logic (state, rendering, localStorage, export/import)
```

## Updating the seed data

`js/data.js` is generated from `Scotland_Kyrgyzstan 2026.xlsx` and the packing lists.
The defaults only apply on first load / after a Reset; your live edits live in the browser.
