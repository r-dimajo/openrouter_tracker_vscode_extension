import * as vscode from 'vscode';
import { OpenRouterAPI, type AllData, type KeyInfo } from './api';
import { getWebviewContent } from './webview/content';

let statusBarItem: vscode.StatusBarItem;
let api: OpenRouterAPI | null = null;
let currentData: AllData | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let selectedKeyHash: string | null = null;
let selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'monthly';

// ── Activate ───────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  console.log('[OpenRouter] Activating extension');

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openrouter.openDashboard';
  statusBarItem.tooltip = 'Click to open OpenRouter Dashboard';
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
  selectedPeriod = (config.get<string>('defaultPeriod') as any) || 'monthly';

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
    currentData = await api.getAllForKey(targetHash, selectedPeriod);
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

  // Show: monthly usage / guardrail limit
  const usage = key.usage_monthly ?? 0;
  let text = `$${usage.toFixed(2)}`;

  if (data.budget) {
    const pct = data.budget.pct;
    text += ` / $${data.budget.limit.toFixed(0)}`;
    if (pct > 80) {
      text = `$(warning) ${text}`;
    }
  }

  updateStatusBar(text, `OpenRouter: ${key.name || key.label}\n$${usage.toFixed(4)} used this month`);
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
        panel.webview.postMessage({ type: 'data', data: currentData, period: selectedPeriod });
        break;

      case 'refresh':
        await refreshData();
        panel.webview.postMessage({ type: 'data', data: currentData, period: selectedPeriod });
        break;

      case 'selectKey':
        selectedKeyHash = msg.keyHash;
        await vscode.workspace.getConfiguration('openrouter').update('apiKeyId', msg.keyHash, true);
        await refreshData();
        panel.webview.postMessage({ type: 'data', data: currentData, period: selectedPeriod });
        break;

      case 'changePeriod':
        selectedPeriod = msg.period;
        await vscode.workspace.getConfiguration('openrouter').update('defaultPeriod', msg.period, true);
        await refreshData();
        panel.webview.postMessage({ type: 'data', data: currentData, period: selectedPeriod });
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