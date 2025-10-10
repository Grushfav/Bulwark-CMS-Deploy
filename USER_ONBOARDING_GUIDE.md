## Bulwark CMS — New User Onboarding Guide

This quick guide helps first‑time users get productive in minutes. It reflects the current app behavior and deployment settings (Render backend, Backblaze B2, pagination, and PWA prompts).

### 1) Sign in and basic navigation
- **URL**: your custom domain (e.g., `https://bulwarkja.ai`)
- **Sign in** with the credentials provided by your manager.
- Left sidebar: `Dashboard`, `Clients`, `Sales`, `Goals`, `Reports`, `Team View`, `Content`.

### 2) Profile & settings
- Go to your avatar → `User Profile & Settings`.
- Update: first/last name, phone, department, position.
- Optional: privacy, notifications, password change.
- Tip: The profile save is immediate and returns a success toast.

### 3) Install the app (PWA)
- You may see an install banner. Click **Install** to add Bulwark CMS to your desktop or mobile home screen.
- When a new version is available, you’ll be prompted to update. Confirm to refresh to the latest version.

### 3.1) Create a new user (Managers)
- Where to create users:
  - `Team View` → **Create User** (fastest)
  - `User Profile & Settings → Users` → **Create User** (same fields)
- Required fields:
  - **First name**, **Last name**, **Email**
  - **Role**: `agent` or `manager`
  - **Password**: minimum 6 characters
- Optional fields: Department, Position, Active status (checked = enabled login)
- What happens next: Users are created immediately; no automatic email is sent. Share credentials securely.
- Common errors and fixes:
  - “Validation failed”: ensure email is valid and password has 6+ characters
  - “User exists”: that email already exists; use a different email or reactivate the old account
  - Can’t see the new user: clear filters or switch Status to “All”

### 4) Clients
- Go to `Clients` → click **Add Client**.
- Fill in required fields, then **Save**.
- Use search, filters, and pagination (`Rows per page`) to quickly find records.
- Only records created by you are shown to agents; managers can see team data where applicable.

### 5) Sales
- Go to `Sales` → **Add Sale**.
- Attach to an existing client where possible.
- Import CSV: use the sample or the export format; the importer validates columns and shows row‑level feedback.

### 6) Goals
- Go to `Goals` → **Create Goal**.
- Pick a metric (e.g., sales amount, policies sold, new clients), target, and dates.
- Progress recalculation is optimized; heavy recalcs are queued in the background when needed.
- Pagination keeps the view responsive for large histories.

### 7) Reminders
- Go to `Reminders` → **Add Reminder** for client tasks, follow‑ups, or renewals.
- Use filters to see due and upcoming reminders.

### 8) Content (files)
- Go to `Content` → **Upload**. Files are stored in Backblaze B2.
- Previews and downloads are proxied through the backend to avoid browser CORS errors.

### 9) Team management (Managers)
- `Team View` → add, suspend/reactivate users.
- `User Profile & Settings → Users` also allows user creation. Required fields: first name, last name, email, role, and password (min 6 chars).

### 10) Reports — detailed usage
- Tabs overview:
  - **Comprehensive**: high‑level KPIs across Sales, Clients, and Goals in one view
  - **Sales**: revenue, policies sold, AOV, trend lines; filter by agent, product, date range
  - **Performance**: goal attainment (% to target), pipeline velocity, conversion ratios
  - **Team**: per‑agent breakdown, leaderboards, activity summaries
  - **Goals**: goal list with progress, due dates, and at‑risk indicators
- Workflow (best practice):
  1) Select **Date Range** and **Agent/Team** filters first
  2) Click **Generate** (or **Regenerate**) for the chosen tab
  3) Review the chart and table; use pagination for long tables
  4) Optional: **Export** (CSV/PDF) if available on that tab
- Reading the charts:
  - Hover to see exact values; legend items can be toggled on/off
  - Dots/columns represent daily/weekly/monthly aggregations (depending on filter)
- Why numbers might look “off”:
  - You’re filtered to a different agent/team than the data owner
  - Date range excludes older entries
  - Cache not refreshed yet: click **Regenerate** or wait a few minutes
- Performance tips for reports:
  - Shorter date windows generate faster
  - Avoid running multiple heavy tabs simultaneously
  - On slow networks, wait for one report to complete before switching tabs

#### Report field reference (quick)
- Sales: `totalRevenue`, `policiesSold`, `avgOrderValue`, `topProducts`
- Performance: `%toTarget`, `velocity`, `winRate`, `forecast`
- Team: `agentTotals[]`, `rank`, `activity`
- Goals: `current`, `target`, `dueInDays`, `status`

#### Example scenarios
- “Month‑to‑date agent ranking”: Team tab → set date range = This Month → Generate
- “Quarter revenue trend”: Sales tab → date range = This Quarter → Group by Week → Generate
- “At‑risk goals”: Goals tab → filter Status = At Risk → Generate

### 11) Performance tips
### Appendix A) CSV import (Sales) — sample columns
Minimum recommended columns (headers, case‑insensitive):

```
client_email, client_name, product, amount, date, notes
```

- `amount`: number (e.g., 199.99)
- `date`: ISO or recognized date (e.g., 2025-10-01)
- If a client exists by email, it will attach; otherwise, the importer may create/update as allowed by your configuration.

### Appendix B) Roles & access (summary)
- **Manager**: can see team data, create/suspend/reactivate users, run all reports
- **Agent**: sees only their own data (clients, sales, goals, reminders); reports scoped to their records

- Tables use server‑side pagination. Adjust `Rows per page` for faster loads.
- Avoid opening many report tabs at once during peak hours.

### 12) File uploads & storage notes
- Supported types include PDFs, images, and common office docs.
- If a file preview fails, try **Download**; if both fail, contact support with the file name and time.

### 13) Service worker update prompt
- “A new version is available” appears only when a real update is published.
- Click **OK** to update immediately; the app reloads after activation.

### 14) Troubleshooting
- **Can’t sign in**: confirm email/password; ask a manager to reset your password.
- **CORS/Cross‑origin errors**: managers should confirm backend `CORS_ORIGIN` includes your frontend domain.
- **Backblaze errors**: managers should verify B2 keys and bucket settings on the backend.
- **Stale pages**: hard refresh (Ctrl/Cmd+Shift+R) or clear site data.

### 15) Getting help
- For issues, provide: what page you’re on, steps to reproduce, screenshots, and the approximate time of the error.

— End —


