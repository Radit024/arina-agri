# Mermaid AI Icon Prompts for Arina Agri Diagrams

Use these prompts in Mermaid AI/Mermaid Chart AI to restyle the existing `.td` diagrams with clearer icons, better spacing, and proposal-ready visuals.

General note: Mermaid flowcharts support icon/image-shaped nodes in newer Mermaid versions, but icon packs may depend on the renderer environment. If Mermaid AI cannot render a specific Iconify icon, ask it to replace the icon with a simpler built-in or Font Awesome-style icon.

## Master Prompt

```text
Restyle this Mermaid diagram into a polished icon-rich diagram for Arina Agri documentation and proposal.

Keep the same meaning, entities, relationships, and flow direction, but improve visual clarity.

Use icon-based nodes where possible. Prefer simple recognizable icons:
- user/farmer/person for users or profiles
- monitor/phone/browser for client access
- cloud/server/code for Vercel, Next.js, API routes, and server modules
- database/shield/lock for Supabase, Postgres, Auth, and RLS
- cloud-rain/map-pin/chart/newspaper/sparkles for BMKG, wilayah.id, Siskaperbapo, news, and Gemini AI
- message-circle/send/bell for WhatsApp, Telegram, notification, and webhooks
- calendar/package/coins/warehouse/file-text for calendar, stock, finance, storage, and reports
- git-branch/clock/activity for GitHub Actions, cron, and smoke checks

Use a clean modern style:
- white or dark neutral background with high contrast text
- generous spacing between groups
- readable labels at normal zoom
- short connector labels
- avoid crossing lines
- group related nodes into colored containers
- keep icons decorative but not more important than labels

For Mermaid code, use flowchart-compatible icon nodes if available, for example:
nodeId@{ "shape": "icon", "icon": "lucide:user", "label": "Users", "pos": "b", "h": 48 }

If icon nodes are not supported, use normal nodes with short emoji-free labels and ask the renderer to apply icons visually.
```

## Proposal Diagrams

### 01. Problem-Solution Flow

```text
Convert this into an icon-rich problem-solution flow. Use warning/problem icons for farmer pain points, leaf/app icons for Arina Agri, and impact icons for outcomes. Keep the flow readable from top to bottom. Use three grouped sections: Problems, Arina Solution, Expected Impact. Use warm amber for problems, green for solutions, and blue for impact.
```

### 02. Ecosystem Diagram

```text
Convert this into an ecosystem architecture map. Put Arina Agri in the center with a strong app/platform icon. Place users on the left, application modules around the center, external services on the right, and operations at the bottom. Use icons for Supabase, BMKG, Gemini, WhatsApp, Telegram, Google News, Vercel, and GitHub Actions. Reduce line crossings by using grouped connectors.
```

### 03. Feature / Module Map

```text
Convert this into a feature module map with one central Arina Agri node and icon cards around it. Use dashboard, finance, stock, weather, market, calendar, AI chat, settings, and notification icons. Keep each feature card compact and readable. Use green accents for core features and amber for alerts/notifications.
```

### 04. User Flow

```text
Convert this into a proposal-ready user flow with icons. Follow the UX flow format: Start, decision diamond, process cards, connector, alt flows, and End nodes. Use farmer/user icon for login, dashboard icon, clipboard/input icon, AI/data processing icon, chart/insight icon, route/decision icon, and bell/chat icons for notifications. Keep left-to-right flow and avoid overlapping connectors.
```

### 05. User Journey

```text
Convert this into a horizontal user journey timeline. Use one icon per journey stage: scattered notes, login, data input, analysis, decision, routine monitoring. Make the stages large and readable, with short subtitles under each stage. Use a subtle progress line and keep the feedback loop visible but not dominant.
```

### 06. Value / Impact Diagram

```text
Convert this into a value-chain impact diagram. Use icons for input data, Arina processing, capabilities, user value, and business impact. Group the diagram into Inputs, Capabilities, Value for Users, and Impact. Use different colors for each group and keep connectors simple.
```

### 07. Business Model / Subscription

```text
Convert this into an icon-rich subscription funnel. Use user icon, Free/Basic/Pro tier cards, upgrade arrows, usage trigger icons, revenue icon, and impact metrics icon. Make the tier cards visually distinct but professional. Keep the upgrade path easy to follow from left to right.
```

### 08. Roadmap

```text
Convert this into a roadmap timeline with icon cards for each phase. Use MVP/dashboard, chat input, subscription, analytics, and ecosystem/partner icons. Make the current phase visually highlighted, next phases medium emphasis, and future phases lighter.
```

## Technical Diagrams

### 01. System Architecture

```text
Convert this into a wide icon-based system architecture diagram. Use large colored containers: Client Access, Vercel Edge & Hosting, Next.js Monolith, API & Server Modules, Supabase Data & Auth, External Data & AI, Messaging & Webhooks, Operations, Legacy / Reference. Use icons for every major node. Add one Integration Layer to reduce connector clutter. Use left-to-right runtime flow and top-lane operations flow. Keep labels readable at normal zoom.
```

### 02. Data Flow Diagram

```text
Convert this into a DFD-style diagram with icons. External entities should use user/provider icons, processes should use circular icon nodes, and data stores should use database/file icons. Keep the DFD convention visible: data flow arrows, process nodes, file/data stores, external entities, and legend. Use short labels and avoid crossing arrows.
```

### 03. Database ERD

```text
Convert this ERD into a readable Crow's Foot entity relationship diagram. Use table/database icons in entity headers. Keep PK/FK markers visible. Group entities by domain: User/Profile, Finance, Stock, Supply, Notification/Chat, Market Content. Keep commodity_prices and news_articles as global/shared data. Make relationships readable with clear cardinality.
```

### 04. UI-Controller Separation

```text
Convert this into an icon-rich layered architecture diagram. Use page/file icon for page.tsx, gear/controller icon for controllers, eye/layout icon for views, component icon for shared UI, server/API icon for API calls, and shield/check icon for validation. Emphasize the rule: page connects, controller owns logic, view renders only.
```

### 05. API Route Map

```text
Convert this into an API route map with grouped endpoint cards. Use icons for AI, weather/location, dashboard, market/news/prices, calendar, notification, webhook, and health/ops. Keep method labels visible using small GET/POST/PATCH badges. Avoid drawing too many internal arrows; group by route domain.
```

### 06. Weather & Location Flow

```text
Convert this into a weather-location workflow with icons. Use location pin, GPS, search, map code, cloud-rain, warning, cache, UI dashboard, and notification icons. Highlight BMKG adm4 mapping as the key bridge. Use a clean left-to-right flow.
```

### 07. Notification Sequence

```text
Convert this sequence diagram into an icon-enhanced sequence flow. Use actor icons for Petani/UI/API/Weather/Decision/Gemini/Channel/Recipient. Keep lifelines readable. Highlight the decision branch: shouldSend true versus false. Use bell/chat icons for notification delivery.
```

### 08. AI Assistant Flow

```text
Convert this into an AI assistant pipeline diagram. Use chat bubble, controller, local history, weather context, market context, API, validator, Gemini sparkle, response, and UI icons. Keep the context aggregation visually clear before the Gemini call.
```

### 09. Stock-Finance Integration

```text
Convert this into a stock-finance integration flow. Use harvest box, warehouse, mutation arrows, sale tag, transaction/coin, finance summary chart, dashboard, weather risk, and action icons. Highlight how stock-out can create financial impact and dashboard summary updates.
```

### 10. News / Price Cron Flow

```text
Convert this into a two-lane cron integration diagram. Top lane: News Flow with clock, RSS, parser, normalization, news_articles, UI. Bottom lane: Price Flow with clock, Siskaperbapo, scraper, normalization, commodity_prices, chart/map UI. Use consistent icons and show cron as the trigger.
```

### 11. CI/CD Deployment

```text
Convert this into a CI/CD pipeline diagram with icons. Use developer, GitHub, actions runner, npm install, lint, typecheck, test, i18n, build, bundle, Vercel preview, Vercel production, smoke check, and production app icons. Keep a clear left-to-right pipeline with pass/fail emphasis.
```

### 12. Auth / Security / RLS Flow

```text
Convert this into a security architecture flow. Use user, Supabase Auth, session token, client, anon key, RLS shield, filtered rows, API route, service role key, cron secret, webhook signature, and admin operations icons. Visually separate client-side access from server-side privileged access. Emphasize that secrets stay server-side.
```

