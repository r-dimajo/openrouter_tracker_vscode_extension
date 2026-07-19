// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Dashboard Webview Provider
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import type {
  ApiKey,
  DashboardState,
  MessageFromWebview,
  BudgetLimit,
  AnalyticsMeta,
} from './types';
import * as api from './api';
import { updateStatusBar } from './status-bar';

let currentPanel: vscode.WebviewPanel | undefined;

function getWebviewHtml(webview: vscode.Webview, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}';
    font-src ${webview.cspSource};">
  <title>OpenRouter Tracker</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, -apple-system, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }
    h2 { font-size: 16px; margin-bottom: 8px; color: var(--vscode-editor-foreground); }
    h3 { font-size: 14px; margin: 12px 0 6px; color: var(--vscode-editor-foreground); }
    .section {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
    label { font-size: 12px; color: var(--vscode-descriptionForeground); min-width: 70px; }
    select, input {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 6px;
    }
    th, td {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    th {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-descriptionForeground);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
    }
    tr:hover { background: var(--vscode-list-hoverBackground); }
    .bar-track {
      width: 100%;
      height: 8px;
      background: var(--vscode-progressBar-background);
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: var(--vscode-charts-green);
      border-radius: 4px;
      transition: width 0.3s;
    }
    .bar-fill.warn { background: var(--vscode-charts-orange); }
    .bar-fill.danger { background: var(--vscode-charts-red); }
    .usage-table td.money { font-family: var(--vscode-editor-font-family, monospace); text-align: right; }
    .btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn-sm { padding: 2px 8px; font-size: 11px; }
    .error { color: var(--vscode-errorForeground); background: var(--vscode-inputValidation-errorBackground); padding: 6px 10px; border-radius: 4px; margin: 6px 0; }
    .dim { color: var(--vscode-descriptionForeground); }
    input[type="checkbox"] { accent-color: var(--vscode-focusBorder); }
  </style>
</head>
<body>
  <h2>OpenRouter Tracker</h2>
  <div id="error"></div>

  <!-- Key Selection -->
  <div class="section">
    <h3>API Key</h3>
    <div class="row">
      <label for="key-select">Active key:</label>
      <select id="key-select"><option>Loading…</option></select>
    </div>
  </div>

  <!-- Usage Summary -->
  <div class="section">
    <h3>Usage Summary</h3>
    <table class="usage-table">
      <thead>
        <tr><th>Period</th><th>Amount</th></tr>
      </thead>
      <tbody id="usage-body">
        <tr><td>All time</td><td class="money">—</td></tr>
        <tr><td>This month</td><td class="money">—</td></tr>
        <tr><td>This week</td><td class="money">—</td></tr>
        <tr><td>Today</td><td class="money">—</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Budget Limits -->
  <div class="section">
    <h3>Budget Limits</h3>
    <table>
      <thead>
        <tr><th>Track</th><th>Source</th><th>Name</th><th>Limit</th><th>Used</th><th>Remaining</th><th>Progress</th></tr>
      </thead>
      <tbody id="budget-body"><tr><td colspan="7">Loading…</td></tr></tbody>
    </table>
  </div>

  <!-- Analytics -->
  <div class="section">
    <h3>Analytics</h3>
    <div class="row">
      <label for="dim-select">Dimension:</label>
      <select id="dim-select">
        <option value="user">User</option>
        <option value="model">Model</option>
        <option value="api_key_id">API Key ID</option>
      </select>
    </div>
    <div class="row">
      <label for="met-select">Metric:</label>
      <select id="met-select">
        <option value="total_usage">Total Usage</option>
        <option value="request_count">Request Count</option>
        <option value="credits_usage">Credits Usage</option>
        <option value="openrouter_usage">OpenRouter Usage</option>
      </select>
    </div>
    <div class="row">
      <label for="gran-select">Granularity:</label>
      <select id="gran-select">
        <option value="minute">Minute</option>
        <option value="hour">Hour</option>
        <option value="day" selected>Day</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
    </div>
    <div class="row" style="margin-top:8px;">
      <button class="btn" id="btn-analytics">Run Analytics</button>
      <button class="btn" id="btn-refresh">&#x21bb; Refresh</button>
    </div>
    <div id="analytics-result" style="margin-top:8px;"></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = null;

    // ── Helpers ──
    function $(id) { return document.getElementById(id); }
    function fmtMoney(v) {
      if (v == null || v === '') return '—';
      return '$' + Number(v).toFixed(4);
    }

    function renderBar(pct) {
      let cls = '';
      if (pct > 90) cls = 'danger';
      else if (pct > 75) cls = 'warn';
      return '<div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>' + pct.toFixed(1) + '%';
    }

    // ── Render functions ──
    function renderUsage(detail) {
      if (!detail) return;
      const rows = [
        ['All time', detail.usage],
        ['This month', detail.usage_monthly],
        ['This week', detail.usage_weekly],
        ['Today', detail.usage_daily],
      ];
      $('usage-body').innerHTML = rows
        .map(r => '<tr><td>' + r[0] + '</td><td class="money">' + fmtMoney(r[1]) + '</td></tr>')
        .join('');
    }

    function renderBudgets(budgets, trackedId) {
      if (!budgets?.length) {
        $('budget-body').innerHTML = '<tr><td colspan="7">No budget limits found</td></tr>';
        return;
      }
      $('budget-body').innerHTML = budgets
        .map(b => '<tr>' +
          '<td><input type="radio" name="tracked" value="' + b.id + '"' + (b.id === trackedId ? ' checked' : '') + '></td>' +
          '<td>' + b.source + '</td>' +
          '<td>' + b.name + '</td>' +
          '<td>' + fmtMoney(b.limitUsd) + '</td>' +
          '<td>' + fmtMoney(b.used) + '</td>' +
          '<td>' + fmtMoney(b.remaining) + '</td>' +
          '<td style="min-width:140px;">' + renderBar(b.pct) + '</td>' +
          '</tr>')
        .join('');

      // Listen for radio changes
      document.querySelectorAll('input[name="tracked"]').forEach(r => {
        r.addEventListener('change', () => {
          vscode.postMessage({ type: 'setTrackedLimit', limitId: r.value });
        });
      });
    }

    function renderAnalyticsResult(result) {
      const el = $('analytics-result');
      if (!result?.data?.length) { el.innerHTML = '<p class="dim">No analytics data.</p>'; return; }

      const rows = result.data;
      const keys = Object.keys(rows[0]);
      let html = '<table><thead><tr>';
      for (const k of keys) html += '<th>' + k + '</th>';
      html += '</tr></thead><tbody>';
      for (const row of rows) {
        html += '<tr>';
        for (const k of keys) {
          let v = row[k];
          if (v == null) v = '—';
          html += '<td>' + v + '</td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table><p class="dim">' + rows.length + ' rows</p>';
      el.innerHTML = html;
    }

    function renderAll(s) {
      state = s;
      if (!s) return;

      // Key selector
      const sel = $('key-select');
      sel.innerHTML = s.apiKeys
        .map(k => '<option value="' + k.hash + '"' + (k.hash === s.selectedKeyHash ? ' selected' : '') + '>' + k.name + (k.disabled ? ' [DISABLED]' : '') + '</option>')
        .join('');

      renderUsage(s.selectedKeyDetail);
      renderBudgets(s.budgetLimits, s.trackedLimitId);
    }

    // ── Events ──
    $('key-select').addEventListener('change', () => {
      vscode.postMessage({ type: 'selectKey', hash: $('key-select').value });
    });

    $('btn-analytics').addEventListener('click', () => {
      vscode.postMessage({
        type: 'runAnalytics',
        dimension: $('dim-select').value,
        metric: $('met-select').value,
        granularity: $('gran-select').value,
      });
    });

    $('btn-refresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'state') {
        renderAll(msg.state);
      } else if (msg.type === 'analyticsResult') {
        renderAnalyticsResult(msg.result);
      } else if (msg.type === 'error') {
        $('error').innerHTML = '<div class="error">' + msg.message + '</div>';
        setTimeout(() => { $('error').innerHTML = ''; }, 8000);
      }
    });

    vscode.postMessage({ type: 'refresh' });
  </script>
</body>
</html>`;
}

async function buildState(
  keys: ApiKey[],
  selectedHash: string | null,
  trackedLimitId: string | null,
): Promise<DashboardState> {
  const hash = selectedHash ?? keys[0]?.hash ?? null;
  let detail: ApiKey | null = null;
  let meta: AnalyticsMeta | null = null;
  const budgetLimits: BudgetLimit[] = [];

  if (hash) {
    detail = await api.getKeyDetail(hash);

    // Key-level limit
    if (detail.limit != null && detail.limit > 0) {
      const used = getUsageForInterval(detail, detail.limit_reset);
      const remaining = Math.max(0, detail.limit - used);
      const pct = Math.min(100, (used / detail.limit) * 100);
      budgetLimits.push({
        source: 'key-level',
        id: `key-${hash}`,
        name: detail.name + ' (key limit)',
        limitUsd: detail.limit,
        resetInterval: detail.limit_reset,
        used,
        remaining,
        pct,
      });
    }

    // Guardrails
    try {
      const guardrails = await api.listGuardrails();
      for (const g of guardrails) {
        if (g.limit_usd == null || g.limit_usd <= 0) { continue; }
        let assignments: { key_hash: string }[] = [];
        try { assignments = await api.listGuardrailKeyAssignments(g.id); } catch { /* skip */ }

        const isAssigned = assignments.some(a => a.key_hash === hash);
        const isWorkspaceGuard = g.workspace_id === detail?.workspace_id &&
          /^Workspace [0-9a-f-]+/i.test(g.name);

        if (isAssigned || isWorkspaceGuard) {
          const used = getUsageForInterval(detail!, g.reset_interval);
          const remaining = Math.max(0, g.limit_usd - used);
          const pct = Math.min(100, (used / g.limit_usd) * 100);
          budgetLimits.push({
            source: isAssigned ? 'guardrail' : 'workspace',
            id: `guardrail-${g.id}`,
            name: g.name,
            limitUsd: g.limit_usd,
            resetInterval: g.reset_interval,
            used,
            remaining,
            pct,
          });
        }
      }
    } catch { /* guardrails not available */ }

    // Meta
    try { meta = await api.fetchMeta(); } catch { /* meta not available */ }
  }

  // Persist tracked limit
  const effectiveTracked =
    trackedLimitId ?? budgetLimits[0]?.id ?? null;

  // Update status bar
  const tracked = budgetLimits.find(b => b.id === effectiveTracked);
  if (tracked) {
    updateStatusBar(tracked.used, tracked.limitUsd, tracked.name);
  } else {
    updateStatusBar(null, null);
  }

  return {
    apiKeys: keys,
    selectedKeyHash: hash,
    selectedKeyDetail: detail,
    budgetLimits,
    analyticsMeta: meta,
    trackedLimitId: effectiveTracked,
    analyticsDimension: 'user',
    analyticsMetric: 'total_usage',
    analyticsGranularity: 'day',
    analyticsCustomRange: null,
  };
}

function getUsageForInterval(
  detail: ApiKey,
  interval: string | null,
): number {
  switch (interval) {
    case 'daily': return detail.usage_daily ?? 0;
    case 'weekly': return detail.usage_weekly ?? 0;
    case 'monthly': return detail.usage_monthly ?? 0;
    default: return detail.usage ?? 0;
  }
}

export async function showDashboard(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'openrouterTrackerDashboard',
    'OpenRouter Tracker',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const nonce = getNonce();
  currentPanel.webview.html = getWebviewHtml(currentPanel.webview, nonce);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });

  // Handle messages
  let analyticsState: {
    dimension: string;
    metric: string;
    granularity: string;
    customRange: { start: string; end: string } | null;
  } = {
    dimension: 'user',
    metric: 'total_usage',
    granularity: 'day',
    customRange: null,
  };

  currentPanel.webview.onDidReceiveMessage(
    async (msg: MessageFromWebview) => {
      try {
        if (msg.type === 'refresh') {
          const keys = await api.listKeys();
          const storedHash: string | null = context.globalState.get('selectedKeyHash') ?? null;
          const state = await buildState(
            keys,
            storedHash,
            context.globalState.get('trackedLimitId') ?? null,
          );
          // Persist default key hash so runAnalytics can find it
          if (!storedHash && state.selectedKeyHash) {
            await context.globalState.update('selectedKeyHash', state.selectedKeyHash);
          }
          currentPanel?.webview.postMessage({ type: 'state', state });
        } else if (msg.type === 'selectKey') {
          await context.globalState.update('selectedKeyHash', msg.hash);
          const keys = await api.listKeys();
          const state = await buildState(
            keys,
            msg.hash,
            context.globalState.get('trackedLimitId') ?? null,
          );
          currentPanel?.webview.postMessage({ type: 'state', state });
        } else if (msg.type === 'setTrackedLimit') {
          await context.globalState.update('trackedLimitId', msg.limitId);
          const keys = await api.listKeys();
          const state = await buildState(
            keys,
            context.globalState.get('selectedKeyHash') ?? null,
            msg.limitId,
          );
          currentPanel?.webview.postMessage({ type: 'state', state });
        } else if (msg.type === 'setAnalyticsDimension') {
          analyticsState.dimension = msg.dimension;
        } else if (msg.type === 'setAnalyticsMetric') {
          analyticsState.metric = msg.metric;
        } else if (msg.type === 'setAnalyticsGranularity') {
          analyticsState.granularity = msg.granularity;
        } else if (msg.type === 'setAnalyticsCustomRange') {
          analyticsState.customRange = msg.range;
        } else if (msg.type === 'runAnalytics') {
          // Read dim/metric/gran from the webview message (sent with the click)
          analyticsState.dimension = msg.dimension ?? analyticsState.dimension;
          analyticsState.metric = msg.metric ?? analyticsState.metric;
          analyticsState.granularity = msg.granularity ?? analyticsState.granularity;

          const hash = context.globalState.get<string>('selectedKeyHash');
          if (!hash) {
            currentPanel?.webview.postMessage({
              type: 'error',
              message: 'No API key selected.',
            });
            return;
          }

          let timeRange: { start: string; end: string };
          if (analyticsState.customRange) {
            timeRange = analyticsState.customRange;
          } else {
            timeRange = defaultTimeRange(analyticsState.granularity);
          }

          const result = await api.runAnalytics({
            keyHash: hash,
            metrics: [analyticsState.metric],
            dimensions: analyticsState.dimension ? [analyticsState.dimension] : [],
            granularity: analyticsState.granularity,
            timeRange,
          });
          currentPanel?.webview.postMessage({
            type: 'analyticsResult',
            result,
          });
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : String(e);
        currentPanel?.webview.postMessage({ type: 'error', message });
      }
    },
  );
}

function defaultTimeRange(gran: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  switch (gran) {
    case 'minute':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'hour':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'day':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'week':
      start = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { start: start.toISOString(), end };
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
