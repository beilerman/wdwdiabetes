# WDW Diabetes Guide (Static Site)

This is a mobile-first, accessible website to help guests with Type 1 and Type 2 diabetes plan their Walt Disney World trip.

## Features
- Separate Type 1 and Type 2 strategy pages
- Food Finder powered by `data.json` with Park → Land → Restaurant navigation
- Filters (vegetarian, fried, drinks, carb max), search, sorting
- Meal cart with carb/calorie/fat totals
- Insulin Helper (educational): bolus + correction, with activity-based reductions
- Dynamic Packing Checklist personalized to T1/T2, pump, CGM, pediatric travel
- High-contrast mode, font-size controls, keyboard and screen reader friendly

## How to Run
Just host these files on any static server (e.g., `python -m http.server`) or open `index.html` directly in a modern browser.
For best results, serve via a local server so `fetch('data.json')` works across all browsers.

## Update Menu Data
Replace `data.json` with your latest export. Structure must match the provided file (parks → menuItems).

Built 2025-08-30.
