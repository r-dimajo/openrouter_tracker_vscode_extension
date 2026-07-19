"use strict";
// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Status Bar Item
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
exports.createStatusBar = createStatusBar;
exports.updateStatusBar = updateStatusBar;
const vscode = __importStar(require("vscode"));
let statusBarItem;
function createStatusBar(onShowDashboard) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'openrouter-tracker.showDashboard';
    statusBarItem.text = '$(graph) OpenRouter: —';
    statusBarItem.tooltip = new vscode.MarkdownString('*(no data)*');
    statusBarItem.show();
    return statusBarItem;
}
function updateStatusBar(data) {
    if (!statusBarItem) {
        return;
    }
    if (!data.tracked) {
        statusBarItem.text = '$(graph) OpenRouter: —';
        statusBarItem.tooltip = new vscode.MarkdownString('*No budget limit tracked. Open the dashboard to configure.*');
        return;
    }
    const { used, limitUsd, pct, name } = data.tracked;
    const limitStr = limitUsd >= 1 ? `$${limitUsd.toFixed(0)}` : `$${limitUsd.toFixed(4)}`;
    const consumedStr = used >= 1 ? `$${used.toFixed(0)}` : `$${used.toFixed(4)}`;
    statusBarItem.text = `$(graph) ${consumedStr} / ${limitStr} (${pct.toFixed(0)}%)`;
    // ── Build rich Markdown hover tooltip ──
    const md = new vscode.MarkdownString('', true);
    md.isTrusted = true;
    md.supportHtml = true;
    // Usage Summary table
    md.appendMarkdown('### Usage Summary\n\n');
    md.appendMarkdown('| Period | Amount |\n| --- | --- |\n');
    for (const u of data.usage) {
        const amt = u.amount >= 1
            ? `$${u.amount.toFixed(2)}`
            : `$${u.amount.toFixed(6)}`;
        md.appendMarkdown(`| ${u.period} | ${amt} |\n`);
    }
    // Budget Limits table
    md.appendMarkdown('\n### Budget Limits\n\n');
    md.appendMarkdown('| Tracked | Name | Source | Interval | Limit | Used | Remaining |\n');
    md.appendMarkdown('| --- | --- | --- | --- | --- | --- | --- |\n');
    for (const b of data.budgets) {
        const tracked = b.isTracked ? '✓' : '';
        const lim = `$${b.limitUsd.toFixed(2)}`;
        const u = `$${b.used.toFixed(2)}`;
        const rem = `$${b.remaining.toFixed(2)}`;
        md.appendMarkdown(`| ${tracked} | ${b.name} | ${b.source} | ${b.interval} | ${lim} | ${u} | ${rem} |\n`);
    }
    md.appendMarkdown(`\n*Tracking: ${name} — ${consumedStr} / ${limitStr} (${pct.toFixed(0)}%)*`);
    statusBarItem.tooltip = md;
    // Colour coding
    if (pct > 90) {
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
    else if (pct > 75) {
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    else {
        statusBarItem.backgroundColor = undefined;
    }
}
//# sourceMappingURL=status-bar.js.map