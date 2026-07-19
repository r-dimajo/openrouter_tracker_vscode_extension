// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Extension Entry Point
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import { createStatusBar, updateStatusBar } from './status-bar';
import { showDashboard } from './dashboard';
import * as api from './api';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // ── Status Bar ──
  createStatusBar(() => {
    showDashboard(context);
  });

  // ── Commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'openrouter-tracker.showDashboard',
      () => showDashboard(context),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'openrouter-tracker.refreshStatus',
      async () => {
        try {
          const hash = context.globalState.get<string>('selectedKeyHash');
          const trackedId =
            context.globalState.get<string>('trackedLimitId');

          if (!hash) {
            updateStatusBar(null, null);
            return;
          }

          const detail = await api.getKeyDetail(hash);
          const guardrails = await api.listGuardrails();

          // Find the tracked budget
          let found: { used: number; limitUsd: number; name: string } | null = null;

          if (trackedId?.startsWith('key-')) {
            if (detail.limit != null && detail.limit > 0) {
              const used = getUsageForInterval(detail, detail.limit_reset);
              found = { used, limitUsd: detail.limit, name: detail.name };
            }
          } else if (trackedId?.startsWith('guardrail-')) {
            const gId = trackedId.replace('guardrail-', '');
            const g = guardrails.find(x => x.id === gId);
            if (g && g.limit_usd != null) {
              const used = getUsageForInterval(detail, g.reset_interval);
              found = { used, limitUsd: g.limit_usd, name: g.name };
            }
          }

          if (found) {
            updateStatusBar(found.used, found.limitUsd, found.name);
          } else {
            updateStatusBar(null, null);
          }
        } catch {
          // If fetch fails, show disconnected
          updateStatusBar(null, null);
        }
      },
    ),
  );

  // ── Auto-refresh on activation ──
  try {
    await vscode.commands.executeCommand('openrouter-tracker.refreshStatus');
  } catch {
    // silent
  }

  // ── Periodic refresh (every 60s) ──
  const interval = setInterval(() => {
    vscode.commands.executeCommand('openrouter-tracker.refreshStatus');
  }, 60_000);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

function getUsageForInterval(
  detail: { usage?: number; usage_daily?: number; usage_weekly?: number; usage_monthly?: number },
  interval: string | null,
): number {
  switch (interval) {
    case 'daily': return detail.usage_daily ?? 0;
    case 'weekly': return detail.usage_weekly ?? 0;
    case 'monthly': return detail.usage_monthly ?? 0;
    default: return detail.usage ?? 0;
  }
}

export function deactivate(): void {
  // Cleanup is handled by subscriptions
}
