# Dashboard Redesign Design Spec

## 1. Overview
The Arina Agri dashboard will be redesigned to adopt an **Earthy & Organic** aesthetic. The goal is to move away from a generic, flat, "corporate" look and create a warm, friendly, and nature-connected interface that feels premium and tailored for modern agriculture.

## 2. Aesthetic Direction: Earthy & Organic
* **Background:** Soft warm off-white (`#F9F9F6` or similar) to reduce eye strain and provide a natural canvas.
* **Colors:** 
  * Primary/Accents: Forest Green (`#1B4332`, `#2D6A4F`) for main actions and positive trends.
  * Secondary/Warnings: Terracotta/Earthy Orange (`#E07A5F`) and Wheat/Soft Yellow (`#F4E285`) for warnings and weather alerts.
  * Text: Deep Charcoal/Dark Earth (`#2C2A29`) instead of pure black.
* **Shapes:** Soft, rounded corners (`border-radius: 16px` to `24px`) for all cards. Avoid sharp edges.
* **Depth:** Replace hard, thin borders with soft, organic drop-shadows (slightly tinted with brown or green to look natural).

## 3. Component Updates

### 3.1. Layout & Spacing
* Increase overall padding and gap between grid items to create a more "breathable" layout.
* Enhance the Header section to make the welcome greeting feel more personal, perhaps adjusting typography weight and color.

### 3.2. KPICard
* Add a soft background color to the icon container (e.g., pale green for positive, pale red/terracotta for negative).
* Round the card corners significantly (`borderRadius: 4`).
* Refine the trend indicators to use the new earthy colors.

### 3.3. WeatherBanner
* Transform from a standard MUI Alert into a custom, rounded card.
* Background: Soft wheat/pastel yellow.
* Text: Earthy brown/dark orange for high readability and warmth.

### 3.4. QuickActions
* Refine the buttons to look more pill-shaped or softly rounded.
* Ensure the background matches the organic theme (e.g., subtle green tint).

### 3.5. DashboardCharts (Trend & Kategori)
* Update chart line and segment colors to match the palette (Forest Green for income, Terracotta for expense).
* Ensure the chart tooltip and axes use the softened text color.

### 3.6. RecentTransactionsTable & NewsWidget
* Apply the same soft border radius and shadow logic.
* Ensure table headers and borders are subtle and don't create harsh lines.

## 4. Implementation Steps (Next Phase)
1. Define the new color tokens and theme overrides (in `MuiProvider` or directly via `sx` props).
2. Update `app/dashboard/page.tsx` to apply the background color and spacing adjustments.
3. Update `KPICard.tsx`, `WeatherBanner.tsx`, `QuickActions.tsx`, `DashboardCharts.tsx`, `RecentTransactionsTable.tsx`, and `NewsWidget.tsx` to reflect the new styling rules.
4. Verify responsiveness and accessibility.
