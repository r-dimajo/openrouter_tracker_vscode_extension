"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const api_1 = require("./api");
const content_1 = require("./webview/content");
let statusBarItem;
let api = null;
let currentData = null;
let refreshTimer = null;
let selectedKeyHash = null;
let selectedPeriod = 'monthly';
// ── Activate ───────────────────────────────────────────────────────────
function activate(context) {
    console.log('[OpenRouter] Activating extension');
    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'openrouter.openDashboard';
    statusBarItem.tooltip = 'Click to open OpenRouter Dashboard';
    context.subscriptions.push(statusBarItem);
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('openrouter.openDashboard', () => openDashboard(context)), vscode.commands.registerCommand('openrouter.refresh', () => refreshData()));
    // Listen for config changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('openrouter')) {
            init();
        }
    }));
    init();
}
// ── Init ───────────────────────────────────────────────────────────────
async function init() {
    const config = vscode.workspace.getConfiguration('openrouter');
    const mgmtKey = config.get('managementKey') || '';
    if (!mgmtKey) {
        updateStatusBar('⚠️ No API Key', 'OpenRouter: Set management key in settings');
        return;
    }
    api = new api_1.OpenRouterAPI(mgmtKey);
    // Load saved key selection
    selectedKeyHash = config.get('apiKeyId') || null;
    selectedPeriod = config.get('defaultPeriod') || 'monthly';
    await refreshData();
    // Auto-refresh timer
    const interval = config.get('refreshInterval') || 300;
    if (refreshTimer)
        clearInterval(refreshTimer);
    if (interval > 0) {
        refreshTimer = setInterval(() => refreshData(), interval * 1000);
    }
}
// ── Refresh ────────────────────────────────────────────────────────────
async function refreshData() {
    if (!api)
        return;
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
    }
    catch (err) {
        updateStatusBar('⚠️ Error', `OpenRouter: ${err.message}`);
        console.error('[OpenRouter] Refresh error:', err);
    }
}
// ── Status bar ─────────────────────────────────────────────────────────
function updateStatusBar(text, tooltip) {
    statusBarItem.text = `$(graph) ${text}`;
    statusBarItem.tooltip = tooltip;
    statusBarItem.show();
}
function updateStatusBarFromData(data) {
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
async function openDashboard(context) {
    const panel = vscode.window.createWebviewPanel('openrouterDashboard', 'OpenRouter Usage Dashboard', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
    });
    panel.webview.onDidReceiveMessage(async (msg) => {
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
    panel.webview.html = (0, content_1.getWebviewContent)();
    panel.onDidDispose(() => { });
}
// ── Deactivate ─────────────────────────────────────────────────────────
function deactivate() {
    if (refreshTimer)
        clearInterval(refreshTimer);
}
//# sourceMappingURL=extension.js.map