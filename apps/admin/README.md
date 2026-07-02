# VOK2Z Seller Dashboard - React Atomic Architecture

Welcome to the **VOK2Z Seller Dashboard**, a stateful, interactive, and highly polished React + TypeScript administration portal designed with a premium, glass-refracted, liquid gooey aesthetic. This workspace has been refactored from static assets into a modular, production-ready full-stack layout adhering strictly to **Atomic Design Patterns** and robust **TypeScript type safety**.

---

## 🎨 Design Theme & Liquid Interactions

The application implements a unique **"Liquid Glass"** visual system that transitions smoothly between **Dark**, **Light**, and **Dim (Cosmic)** themes:
* **Organic Gooey Transitions**: Custom inline SVG filter definitions (`#tgl-goo`, `#tgl-remove-black`, and `#ts-filter`) are injected into the DOM body to drive physical fluid merge effects in toggle switches and segment controllers.
* **Refracted Specular Glass**: Specular highlight curves, glass backdrops, blur vectors (`--glass-blur`), and variable opacity overlays are balanced dynamically across state updates.

---

## 🧬 Atomic Design Breakdown

The project directory uses a structured atomic pattern to separate basic styling cells from full-view page wrappers:

### 1. Atoms (Basic Visual Blocks)
* **`Badge`**: Display pills rendering count numbers or indicator states.
* **`Button`**: Highly responsive action controllers with primary, secondary, and danger styles.
* **`Checkbox`**: Bespoke glass-refracted selection checkmark boxes.
* **`StatusDot`**: Active glows and system status dots.

### 2. Molecules (Accented Groups)
* **`Breadcrumbs`**: Location path trackers reflecting dynamic navigation.
* **`UserPill`**: User avatar header triggers linking click triggers to account dropdowns.
* **`ToggleSwitch`**: Jhey Tompkins-style gooey liquid sliding toggles driven statefully by RequestAnimationFrame animations on CSS Custom Properties.
* **`ThemeSwitcher`**: Displacement-filtered segmented controllers that glide and squeeze when switching theme properties.
* **`SearchField`**: Labelled input structures.
* **`TabItem`**: Dynamic page tabs with indicator status dots and slide closing controllers.
* **`NotificationItem`**: Individual message cards with color-coded classification markers.

### 3. Organisms (Layout Components)
* **`Sidebar`**: Left-side menu supporting expanded/collapsed widths, child submenus, and mouse-hover fixed flyout panels and tooltips when collapsed.
* **`Topbar`**: Custom actions block housing breadcrumbs, theme toggles, notification indicators, and account configurations.
* **`Tabbar`**: Chrome-like workspace list supporting active switching, closing, and new workspace instantiation ("+").
* **`SearchCard`**: Stateful grid inputs collapsing into a clean inline single row.
* **`DataTable`**: Core information ledger tracking list checking, bulk operations (Enable, Disable, Delete, CSV Export), CSV Imports, dynamic column configurations, pagination, and full-screen modes.
* **`SettingsDrawer`**: Sliding multi-tab configurations panel (General, Account, Security, Notifications, API Keys, Billing).
* **`NotificationOverlay`**: Sliding alerts feed sorting messages into "Today/Yesterday" timelines and supporting segmented tab filtering and nested detail cards.

### 4. Templates (Structure Shells)
* **`DashboardLayout`**: Shell tying sidebars, headers, and tabs together inside a unified grid.

### 5. Pages (Workspace Views)
* **`DashboardPage`**: Displays summary cards with SVG-based vector metrics.
* **`RolesPage`**: The main Access Control cockpit linking Search filters to DataTables.
* **`OrdersPage`**: Tracks fulfillment items and order logging.
* **`WalletPage`**: Financial dashboards requesting ABA Bank transfers.

---

## 💾 Centralized State Management

State in VOK2Z is shared cleanly across pages using individual Context Managers to prevent prop-drilling:
* **`ThemeContext`**: Syncs `'dark' | 'light' | 'dim'` states, writing themes into `localStorage` and compiling them onto `document.documentElement` (`data-theme`).
* **`TabContext`**: Maintains the open page list. Clicking menu items adds/focuses tabs.
* **`NotificationContext`**: Syncs unread feeds, tracking item read toggles and detail selections.
* **`SettingsContext`**: Holds general configurations, forwarding theme shifts back to the Theme Manager.

---

## 📂 Project Directory Structure

```text
/
├── index.html                  # Root template housing SVG filter layers
├── metadata.json               # Manifest declaring name, permissions & capabilities
├── package.json                # Project dependencies and script endpoints
├── vite.config.ts              # Bundler parameters with Tailwind v4 integrations
├── jest.config.cjs             # Unit test environments
├── src/
│   ├── main.tsx                # Entry loader
│   ├── App.tsx                 # Core parent routing layout
│   ├── index.css               # Global tailwind rules and custom Jhey animation classes
│   ├── setupTests.ts           # Extended DOM matcher loaders for Jest
│   ├── types/
│   │   └── index.ts            # Centralized TypeScript interface models
│   ├── context/
│   │   ├── ThemeContext.tsx    # Theme manager
│   │   ├── TabContext.tsx      # Page tabs manager
│   │   ├── NotificationContext.tsx # Notifications feed manager
│   │   └── SettingsContext.tsx # User settings manager
│   ├── components/
│   │   ├── atoms/              # Badge, Button, Checkbox, StatusDot
│   │   ├── molecules/          # Breadcrumbs, UserPill, ToggleSwitch, ThemeSwitcher, TabItem...
│   │   ├── organisms/          # Sidebar, Topbar, Tabbar, SearchCard, DataTable, SettingsDrawer...
│   │   ├── templates/          # DashboardLayout shell
│   │   └── pages/              # DashboardPage, RolesPage, OrdersPage, WalletPage
```

---

## 🧪 Testing and Quality Control

Automated testing is integrated using **Jest** and **React Testing Library** to guarantee the stability of key atomic units.

### Test Coverage includes:
1. **Atoms (`Badge`, `Button`)**: Render triggers, color variables, and click callbacks.
2. **Molecules (`ToggleSwitch`)**: checked/unchecked styles and `onChange` hooks.
3. **Organisms (`SearchCard`)**: value modification inputs and submit emissions.

### How to Run Tests:
To compile and test the dashboard components:
```bash
npm run test
```

To verify syntactic type safety:
```bash
npm run lint
```
