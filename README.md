# OpenRouter Tracker

Track your OpenRouter API usage and budget limits directly from the VS Code status bar. Requires an OpenRouter management key only.

## Features

- **Status bar** — shows tracked budget consumption: `$X / $Y (ZZ%)` with color warnings at 75% (orange) and 90% (red)
- **Rich hover tooltip** — hover the status bar to see a Markdown table of all usage and budget limits
- **Dashboard** — click the status bar to open a full dashboard with:
  - API key selector (fetched from your management key)
  - Usage summary (all-time, monthly, weekly, daily)
  - Budget limits table (key-level limits + guardrails + workspace budgets)
  - Analytics explorer (dimension, metric, granularity filters)
- **Auto-refresh** — status bar updates every 60 seconds

### Status bar

![Status Bar](https://raw.githubusercontent.com/r-dimajo/openrouter_tracker_vscode_extension/master/images/status_bar.png)

### Dashboard

![Dashboard](https://raw.githubusercontent.com/r-dimajo/openrouter_tracker_vscode_extension/master/images/dashboard.png)

## Setup

1. Install the extension
2. Open VS Code settings (`Ctrl+,`)
3. Search for `openrouterTracker.managementKey`
4. Paste your OpenRouter management key
5. Click the status bar item to open the dashboard and configure tracking

## Requirements

- An OpenRouter account with a [management key](https://openrouter.ai/keys)
- VS Code 1.86+

## Extension Settings

| Setting | Description |
| --- | --- |
| `openrouterTracker.managementKey` | OpenRouter Management Key (required) |