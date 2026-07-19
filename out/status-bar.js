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
    statusBarItem.tooltip = 'OpenRouter Tracker — click to open dashboard';
    statusBarItem.text = '$(graph) OpenRouter: —';
    statusBarItem.show();
    // Note: command registration handled in extension.ts, but click still works via command.
    return statusBarItem;
}
function updateStatusBar(consumed, limit, label) {
    if (!statusBarItem) {
        return;
    }
    if (consumed == null || limit == null || limit <= 0) {
        statusBarItem.text = '$(graph) OpenRouter: —';
        statusBarItem.tooltip = 'No budget limit tracked. Configure in dashboard.';
        return;
    }
    const pct = Math.min(100, (consumed / limit) * 100);
    const limitStr = limit >= 1 ? `$${limit.toFixed(0)}` : `$${limit.toFixed(4)}`;
    const consumedStr = consumed >= 1 ? `$${consumed.toFixed(0)}` : `$${consumed.toFixed(4)}`;
    statusBarItem.text = `$(graph) ${consumedStr} / ${limitStr} (${pct.toFixed(0)}%)`;
    statusBarItem.tooltip = label
        ? `Tracking: ${label}\nClick to open dashboard`
        : 'Click to open dashboard';
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