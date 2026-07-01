# Testing System UI Style Guide

This file captures the visual language expected for the SQL module so future agent prompts can keep it consistent with the parent testing system.

Use the concept and interaction patterns, not any external frontend code as a hard dependency. The parent system currently has a Bootstrap-like product feel, while this project uses Mantine. Recreate the same feel with Mantine components and local CSS when needed.

## Overall Direction

- Build a quiet educational/work tool, not a marketing page.
- Keep screens compact, readable, and task-first.
- Prefer standard UI kit components over custom decorative layouts.
- Use simple page structure: dark top navigation, breadcrumb/context row, then full-width working content.
- Preserve the old system's conservative Bootstrap-like feel: clear borders, light surfaces, blue primary actions, grey secondary actions, red destructive actions.

## Visual Tokens

- Page background: light neutral, close to `#f6f8fb` or Bootstrap `#f8f9fa`.
- Main surface: white, with subtle border `#dee2e6`/`#dce3ee`.
- Primary color: Bootstrap-like blue, close to `#0d6efd`; for darker header accents use `#212529`.
- Text: dark neutral `#212529`; secondary text `#6c757d`.
- Danger: Bootstrap-like red `#dc3545`.
- Success: Bootstrap-like green `#198754`.
- Radius: small and utilitarian, usually `4px` to `8px`.
- Shadows: only light `shadow-sm` style shadows for cards, selectors, and small panels.
- Spacing: Bootstrap rhythm. Typical gaps are `8px`, `16px`, `24px`, `32px`.

## App Shell

The parent app uses a dark top bar:

- Full-width dark header, similar to Bootstrap `Navbar bg="dark" variant="dark"`.
- Brand text on the left. In SQL module use a name like `SQL Module` or the parent system name plus current module.
- Show current user name or role near the brand when available.
- Put logout and secondary navigation on the right.
- Below the header, use a fluid content container with small top margin.
- Show breadcrumbs for nested pages, especially teacher/admin flows.

Mantine translation:

- Use `AppShell`, `Group`, `Container`, `Breadcrumbs`, `Anchor`, `Button`, `Text`.
- Style header background as `#212529`, header text as white.
- Use `Container fluid` behavior through full width content with horizontal padding.

## Login Screen

Reference concept:

- Centered login card, max width around `400px`.
- Top margin rather than a full hero screen.
- Optional small help button/link aligned above the card on the right.
- Card title centered. In Russian UI this is equivalent to "Sign in to the system".
- Form has two fields: login/email and password.
- Error appears as a centered danger alert inside the card.
- Submit button is full width and primary.

Mantine translation:

- Use `Paper` or a light card with `radius="sm"`, subtle border, and restrained shadow.
- Use `TextInput`, `PasswordInput`, `Alert`, `Button fullWidth`.
- Keep Russian labels unless the screen is explicitly technical: login/email, password, sign in.
- Avoid large branding blocks inside the login form. The parent system form is compact.

## Page Layout Patterns

- Use headings directly in content, usually `h3`/medium title, not oversized hero text.
- Primary action button appears above the list/table, often with bottom margin.
- Lists of educational entities use wrapping cards with consistent width around `350px`.
- Tables use striped/bordered/hover-like visual density for admin data.
- Empty states are plain text, not large illustrated sections.
- Long editing pages can use left vertical pills/tabs and a wide right content area.

Mantine translation:

- Cards: `Card withBorder shadow="sm" radius="sm"`.
- Buttons: primary blue for create/save, outline/secondary for cancel, red for delete.
- Lists: `SimpleGrid` or flex wrap with fixed card widths.
- Tables: `Table striped highlightOnHover withTableBorder withColumnBorders`.
- Tabs: `Tabs` with vertical orientation for complex teacher/editor screens.

## Cards

Reference cards:

- Course cards are about `350px` wide and at least `200px` high.
- Module/test/task/theory cards are about `350px` wide and `150px` high.
- Cards use `shadow-sm`, subtle border, pointer cursor when clickable.
- Card header contains the title and optional three-dots action menu.
- Descriptions are muted and truncated/wrapped.
- Footer can contain secondary metadata such as due date or status.

Mantine translation:

- Use `Card.Section` or top `Group` for the header.
- Use `Menu` with a three-dots icon for actions.
- Hide menu decorations that do not match the compact action style.
- Keep destructive action text red.

## Forms And Modals

- Prefer modal dialogs for creation/edit/delete confirmation.
- Modal header is plain or light grey.
- Confirm delete modal uses secondary cancel and danger delete.
- Creation forms use stacked fields with clear labels.
- Floating-label style from Bootstrap can be translated to regular Mantine labels.
- For password fields, an eye icon toggle is acceptable.
- For validation, show inline field errors plus a top-level alert only for request-level errors.

Mantine translation:

- Use `Modal`, `TextInput`, `Textarea`, `Select`, `PasswordInput`, `NumberInput`, `Group`, `Button`.
- Use `LoadingOverlay` or loading state on submit buttons for async saves.
- Keep modal widths moderate; do not turn simple forms into full pages.

## Search And Selection

Reference multi-select search:

- Small card with light header.
- Search input in header.
- Toggle/select-all button on the right.
- Selected count shown as a small badge.
- Body is a flush list with compact rows, checkbox, and truncated text.

Mantine translation:

- Use `Paper`/`Card`, `TextInput`, `Badge`, `Checkbox`, `ScrollArea`, `Stack`.
- Keep max height and scrolling inside the selector.

## Tables And Pagination

- Admin pages use compact tables with visible borders, striped rows, and hover feedback.
- Pagination controls can appear above and below large lists.
- Page-size selector is small and close to the pagination controls.
- Loading state is a centered spinner row.

Mantine translation:

- Use `Table`, `Pagination`, `Select`, `Loader`, `Center`.
- Keep table actions icon-first, with text only when needed.

## Icons

- Prefer the selected UI kit and existing icon choice. If adding icons, use one consistent library.
- Typical icons: three vertical dots for card menu, trash for delete, plus/person-plus for create, search for filtering, eye/eye-slash for password visibility.

## What Not To Copy

- Do not copy external routing or service layers into this project.
- Do not import Bootstrap just to mimic the style if Mantine is already the chosen kit.
- Do not copy inconsistent inline styles without converting them into reusable components or local CSS.
- Do not overuse cards for whole pages. Cards are for repeated items, forms, selectors, and modals.
- Do not add marketing hero sections, decorative gradients, or large illustrative blocks.

## Agent Prompt Snippet

Use this snippet in future prompts:

```text
Follow docs/testing-system-ui-style.md. The SQL module is embedded into an existing educational testing system. Recreate the parent system's Bootstrap-like concept using our current UI kit: dark top navigation, light neutral workspace, breadcrumbs, compact forms, blue primary actions, bordered tables, subtle cards, modal-based create/edit/delete flows, and plain empty states. Do not copy external frontend code directly and do not add Bootstrap unless explicitly requested.
```
