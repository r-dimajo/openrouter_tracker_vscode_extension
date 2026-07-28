// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Extension Entry Point
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import { createStatusBar, updateStatusBar, StatusBarData } from './status-bar';
import { showDashboard } from './dashboard';
import type { Guardrail } from './types';
import * as api from './api';

// Cache the last known good status bar data so transient errors don't blank the bar
let lastGoodStatus: StatusBarData | null = null;

function setStatusBar(data: StatusBarData): void {
  const hasData = data.tracked || data.budgets.length > 0;
  if (hasData) {
    lastGoodStatus = data;
  }
  updateStatusBar(data);
}

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
          let hash = context.globalState.get<string>('selectedKeyHash');
          const trackedId =
            context.globalState.get<string>('trackedLimitId');

          if (!hash) {
            lastGoodStatus = null;
            updateStatusBar({ usage: [], budgets: [], tracked: null });
            return;
          }

          let detail;
          try {
            detail = await api.getKeyDetail(hash);
          } catch {
            // Stale hash — clear it and try first available key
            const keys = await api.listKeys();
            if (keys.length > 0) {
              hash = keys[0].hash;
              await context.globalState.update('selectedKeyHash', hash);
              detail = await api.getKeyDetail(hash);
            } else {
              lastGoodStatus = null;
              updateStatusBar({ usage: [], budgets: [], tracked: null });
              return;
            }
          }

          if (!detail) {
            lastGoodStatus = null;
            updateStatusBar({ usage: [], budgets: [], tracked: null });
            return;
          }

          // Guardrails are best-effort; key-level limit still shows if they fail
          let guardrails: Guardrail[] = [];
          try { guardrails = await api.listGuardrails(); } catch (error) {
            console.log('api.listGuardrails() error: ', error);
          }

          // Usage summary
          const usage = [
            { period: 'All time', amount: detail.usage },
            { period: 'This month', amount: detail.usage_monthly },
            { period: 'This week', amount: detail.usage_weekly },
            { period: 'Today', amount: detail.usage_daily },
          ];

          // Budgets
          const budgets: StatusBarData['budgets'] = [];

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
            if (g.limit_usd == null || g.limit_usd <= 0) { continue; }
            let assignments: { key_hash: string }[] = [];
            try { assignments = await api.listGuardrailKeyAssignments(g.id); } catch (error) {
              console.log('api.listGuardrailKeyAssignments error: ', error);
            }

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
          setStatusBar({
            usage,
            budgets,
            tracked: tracked
              ? { name: tracked.name, used: tracked.used, limitUsd: tracked.limitUsd, pct: tracked.pct }
              : null,
          });
        } catch (error){
          console.log('tracker.refreshStatus() error: ', error);
          // Transient error — keep showing last known good data instead of blanking
          if (lastGoodStatus) {
            updateStatusBar(lastGoodStatus);
          }
        }
      },
    ),
  );

  // ── Auto-refresh on activation ──
  try {
    await vscode.commands.executeCommand('openrouter-tracker.refreshStatus');
  } catch (error){
    console.log('tracker.refreshStatus() error: ', error);
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
