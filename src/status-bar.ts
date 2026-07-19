// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Status Bar Item
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function createStatusBar(
  onShowDashboard: () => void,
): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.command = 'openrouter-tracker.showDashboard';
  statusBarItem.tooltip = 'OpenRouter Tracker — click to open dashboard';
  statusBarItem.text = '$(graph) OpenRouter: —';
  statusBarItem.show();
  // Note: command registration handled in extension.ts, but click still works via command.
  return statusBarItem;
}

export function updateStatusBar(
  consumed: number | null,
  limit: number | null,
  label?: string,
): void {
  if (!statusBarItem) { return; }

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
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.errorBackground',
    );
  } else if (pct > 75) {
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.warningBackground',
    );
  } else {
    statusBarItem.backgroundColor = undefined;
  }
}
