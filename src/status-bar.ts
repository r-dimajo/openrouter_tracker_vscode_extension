// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Status Bar Item
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';

export interface StatusBarData {
  /** Usage summary rows */
  usage: { period: string; amount: number }[];
  /** All budget limits */
  budgets: {
    name: string;
    source: string;
    interval: string;
    limitUsd: number;
    used: number;
    remaining: number;
    pct: number;
    isTracked: boolean;
  }[];
  /** The tracked limit details (for the label text) */
  tracked: { name: string; used: number; limitUsd: number; pct: number } | null;
}

let statusBarItem: vscode.StatusBarItem;

export function createStatusBar(
  onShowDashboard: () => void,
): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.command = 'openrouter-tracker.showDashboard';
  statusBarItem.text = '$(graph) OpenRouter: —';
  statusBarItem.tooltip = new vscode.MarkdownString('*(no data)*');
  statusBarItem.show();
  return statusBarItem;
}

export function updateStatusBar(data: StatusBarData): void {
  if (!statusBarItem) { return; }

  if (!data.tracked) {
    statusBarItem.text = '$(graph) OpenRouter: —';
    statusBarItem.tooltip = new vscode.MarkdownString(
      '*No budget limit tracked. Open the dashboard to configure.*',
    );
    return;
  }

  const { used, limitUsd, pct, name } = data.tracked;
  const limitStr = limitUsd >= 1 ? `$${limitUsd.toFixed(2)}` : `$${limitUsd.toFixed(4)}`;
  const consumedStr = used >= 1 ? `$${used.toFixed(2)}` : `$${used.toFixed(4)}`;
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
