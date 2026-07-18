import * as vscode from 'vscode';
import { OpenRouterAPI, type AllData } from './api';
import { getWebviewContent } from './webview/content';

let statusBarItem: vscode.StatusBarItem;
let api: OpenRouterAPI | null = null;
let currentData: AllData | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let selectedKeyHash: string | null = null;

// ── Activate ───────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  console.log('[OpenRouter] Activating extension');

  // Status bar — show immediately from startup
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openrouter.openDashboard';
  statusBarItem.text = '$(graph) OpenRouter';
  statusBarItem.tooltip = 'OpenRouter: loading...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('openrouter.openDashboard', () => openDashboard(context)),
    vscode.commands.registerCommand('openrouter.refresh', () => refreshData()),
  );

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('openrouter')) {
        init();
      }
    })
  );

  init();
}

// ── Init ───────────────────────────────────────────────────────────────

async function init() {
  const config = vscode.workspace.getConfiguration('openrouter');
  const mgmtKey = config.get<string>('managementKey') || '';

  if (!mgmtKey) {
    updateStatusBar('⚠️ No API Key', 'OpenRouter: Set management key in settings');
    return;
  }

  api = new OpenRouterAPI(mgmtKey);

  // Load saved key selection
  selectedKeyHash = config.get<string>('apiKeyId') || null;

  await refreshData();

  // Auto-refresh timer
  const interval = config.get<number>('refreshInterval') || 300;
  if (refreshTimer) clearInterval(refreshTimer);
  if (interval > 0) {
    refreshTimer = setInterval(() => refreshData(), interval * 1000);
  }
}

// ── Refresh ────────────────────────────────────────────────────────────

async function refreshData() {
  if (!api) return;

  updateStatusBar('$(loading~spin) Fetching...', 'OpenRouter: Refreshing data');

  try {
    // First, get all keys
    const keys = await api.listKeys();
    if (keys.length === 0) {
      updateStatusBar('⚠️ No keys', 'OpenRouter: No API keys found');
      return;
    }

    // Determine which key to track
    let targetHash = selectedKeyHash;
    if (!targetHash) {
      // Try to find a non-disabled key, prefer the first one
      targetHash = keys.find(k => !k.disabled)?.hash ?? keys[0].hash;
    }

    // Fetch all data
    currentData = await api.getAllForKey(targetHash);
    selectedKeyHash = targetHash;

    // Save selected key to settings
    vscode.workspace.getConfiguration('openrouter').update('apiKeyId', targetHash, true);

    updateStatusBarFromData(currentData);
  } catch (err: any) {
    updateStatusBar('⚠️ Error', `OpenRouter: ${err.message}`);
    console.error('[OpenRouter] Refresh error:', err);
  }
}

// ── Status bar ─────────────────────────────────────────────────────────

function updateStatusBar(text: string, tooltip: string) {
  statusBarItem.text = `$(graph) ${text}`;
  statusBarItem.tooltip = tooltip;
  statusBarItem.show();
}

function updateStatusBarFromData(data: AllData) {
  const key = data.key;
  if (!key) {
    updateStatusBar('⚠️ No data', 'OpenRouter: No key data');
    return;
  }

  const budget = data.budget;
  let text: string;
  let tooltip: string;

  if (budget) {
    const pct = Math.round(budget.pct);
    text = `$${budget.spent.toFixed(2)} / $${budget.limit.toFixed(0)} (${pct}%)`;
    if (budget.pct > 80) {
      text = `$(warning) ${text}`;
    }

    const intervalLabel = budget.interval.charAt(0).toUpperCase() + budget.interval.slice(1);
    const resetStr = budget.resetDate
      ? new Date(budget.resetDate).toUTCString().slice(5, 22)
      : 'Never';

    // Visual bar: 20 chars wide
    const barLen = 20;
    const filled = Math.round((budget.pct / 100) * barLen);
    const barChar = budget.pct > 80 ? '█' : '■';
    const bar = barChar.repeat(Math.min(filled, barLen)) + '·'.repeat(Math.max(0, barLen - filled));

    tooltip = [
      `OpenRouter: ${key.name || key.label}`,
      ``,
      ` Budget  $${budget.spent.toFixed(2)} / $${budget.limit.toFixed(0)}`,
      ` ${bar}  ${pct}%`,
      ` Used: ${pct}%`,
      ` Remaining: $${budget.remaining.toFixed(2)}`,
      ` Interval: ${intervalLabel}`,
      ` Reset: ${resetStr} (${budget.daysUntilReset}d)`,
      ` ───────────────────────────`,
      ` This ${budget.interval}: $${budget.spent.toFixed(4)}`,
      ` All time: $${key.usage.toFixed(4)}`,
      ` Models: ${data.modelBreakdown?.rows.length ?? 0} active`,
      ``,
      `Click to open dashboard`,
    ].join('\n');
  } else {
    text = `$${(key.usage_monthly ?? 0).toFixed(2)}`;
    tooltip = [
      `OpenRouter: ${key.name || key.label}`,
      ``,
      ` Monthly: $${(key.usage_monthly ?? 0).toFixed(4)}`,
      ` Weekly:  $${(key.usage_weekly ?? 0).toFixed(4)}`,
      ` Daily:   $${(key.usage_daily ?? 0).toFixed(4)}`,
      ` All time: $${(key.usage ?? 0).toFixed(4)}`,
      ` ───────────────────────────`,
      ` No budget limit set for the current key`,
      ``,
      `Click to open dashboard`,
    ].join('\n');
  }

  updateStatusBar(text, tooltip);
}

// ── Dashboard Webview ─────────────────────────────────────────────────

async function openDashboard(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'openrouterDashboard',
    'OpenRouter Usage Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [],
    }
  );

  panel.webview.onDidReceiveMessage(async msg => {
    switch (msg.type) {
      case 'ready':
        // Send initial data
        panel.webview.postMessage({ type: 'data', data: currentData });
        break;

      case 'refresh':
        await refreshData();
        panel.webview.postMessage({ type: 'data', data: currentData });
        break;

      case 'selectKey':
        selectedKeyHash = msg.keyHash;
        await vscode.workspace.getConfiguration('openrouter').update('apiKeyId', msg.keyHash, true);
        await refreshData();
        panel.webview.postMessage({ type: 'data', data: currentData });
        break;

      case 'openSettings':
        vscode.commands.executeCommand('workbench.action.openSettings', 'openrouter');
        break;
    }
  });

  panel.webview.html = getWebviewContent();
  panel.onDidDispose(() => { /* cleanup */ });
}

// ── Deactivate ─────────────────────────────────────────────────────────

export function deactivate() {
  if (refreshTimer) clearInterval(refreshTimer);
}