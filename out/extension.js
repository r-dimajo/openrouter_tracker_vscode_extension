"use strict";
// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Extension Entry Point
// ═══════════════════════════════════════════════════════════════════════
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
const status_bar_1 = require("./status-bar");
const dashboard_1 = require("./dashboard");
const api = __importStar(require("./api"));
async function activate(context) {
    // ── Status Bar ──
    (0, status_bar_1.createStatusBar)(() => {
        (0, dashboard_1.showDashboard)(context);
    });
    // ── Commands ──
    context.subscriptions.push(vscode.commands.registerCommand('openrouter-tracker.showDashboard', () => (0, dashboard_1.showDashboard)(context)));
    context.subscriptions.push(vscode.commands.registerCommand('openrouter-tracker.refreshStatus', async () => {
        try {
            const hash = context.globalState.get('selectedKeyHash');
            const trackedId = context.globalState.get('trackedLimitId');
            if (!hash) {
                (0, status_bar_1.updateStatusBar)({ usage: [], budgets: [], tracked: null });
                return;
            }
            const detail = await api.getKeyDetail(hash);
            const guardrails = await api.listGuardrails();
            // Usage summary
            const usage = [
                { period: 'All time', amount: detail.usage },
                { period: 'This month', amount: detail.usage_monthly },
                { period: 'This week', amount: detail.usage_weekly },
                { period: 'Today', amount: detail.usage_daily },
            ];
            // Budgets
            const budgets = [];
            if (detail.limit != null && detail.limit > 0) {
                const used = getUsageForInterval(detail, detail.limit_reset);
                const remaining = Math.max(0, detail.limit - used);
                const pct = Math.min(100, (used / detail.limit) * 100);
                budgets.push({
                    name: detail.name + ' (key limit)',
                    source: 'key-level',
                    interval: detail.limit_reset ?? 'lifetime',
                    limitUsd: detail.limit,
                    used,
                    remaining,
                    pct,
                    isTracked: trackedId === `key-${hash}`,
                });
            }
            for (const g of guardrails) {
                if (g.limit_usd == null || g.limit_usd <= 0) {
                    continue;
                }
                let assignments = [];
                try {
                    assignments = await api.listGuardrailKeyAssignments(g.id);
                }
                catch { /* skip */ }
                const isAssigned = assignments.some(a => a.key_hash === hash);
                const isWorkspaceGuard = g.workspace_id === detail.workspace_id &&
                    /^Workspace [0-9a-f-]+/i.test(g.name);
                if (isAssigned || isWorkspaceGuard) {
                    const used = getUsageForInterval(detail, g.reset_interval);
                    const remaining = Math.max(0, g.limit_usd - used);
                    const pct = Math.min(100, (used / g.limit_usd) * 100);
                    budgets.push({
                        name: g.name,
                        source: isAssigned ? 'guardrail' : 'workspace',
                        interval: g.reset_interval ?? 'lifetime',
                        limitUsd: g.limit_usd,
                        used,
                        remaining,
                        pct,
                        isTracked: trackedId === `guardrail-${g.id}`,
                    });
                }
            }
            const tracked = budgets.find(b => b.isTracked) ?? null;
            (0, status_bar_1.updateStatusBar)({
                usage,
                budgets,
                tracked: tracked
                    ? { name: tracked.name, used: tracked.used, limitUsd: tracked.limitUsd, pct: tracked.pct }
                    : null,
            });
        }
        catch {
            (0, status_bar_1.updateStatusBar)({ usage: [], budgets: [], tracked: null });
        }
    }));
    // ── Auto-refresh on activation ──
    try {
        await vscode.commands.executeCommand('openrouter-tracker.refreshStatus');
    }
    catch {
        // silent
    }
    // ── Periodic refresh (every 60s) ──
    const interval = setInterval(() => {
        vscode.commands.executeCommand('openrouter-tracker.refreshStatus');
    }, 60_000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
}
function getUsageForInterval(detail, interval) {
    switch (interval) {
        case 'daily': return detail.usage_daily ?? 0;
        case 'weekly': return detail.usage_weekly ?? 0;
        case 'monthly': return detail.usage_monthly ?? 0;
        default: return detail.usage ?? 0;
    }
}
function deactivate() {
    // Cleanup is handled by subscriptions
}
//# sourceMappingURL=extension.js.map