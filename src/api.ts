// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — API Client
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import type {
  ApiKey,
  AnalyticsMeta,
  AnalyticsResult,
  Guardrail,
  GuardrailAssignment,
} from './types';

const BASE = 'https://openrouter.ai/api/v1';

function getKey(): string {
  return vscode.workspace.getConfiguration('openrouterTracker').get<string>('managementKey', '');
}

async function fetchJSON<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const mgmtKey = getKey();
  if (!mgmtKey) {
    throw new Error('OpenRouter management key not set. Configure openrouterTracker.managementKey in settings.');
  }
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${mgmtKey}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try { detail = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep raw */ }
    throw new Error(`${res.status} ${res.statusText}\n${detail}`);
  }
  return JSON.parse(text);
}

export async function listKeys(): Promise<ApiKey[]> {
  const body = await fetchJSON<{ data: ApiKey[] }>('/keys');
  return body.data ?? [];
}

export async function getKeyDetail(hash: string): Promise<ApiKey> {
  const { data } = await fetchJSON<{ data: ApiKey }>(`/keys/${hash}`);
  return data;
}

export async function fetchMeta(): Promise<AnalyticsMeta> {
  const { data } = await fetchJSON<{ data: AnalyticsMeta }>('/analytics/meta');
  return data;
}

export async function runAnalytics(params: {
  keyHash?: string;
  metrics: string[];
  dimensions: string[];
  granularity: string;
  timeRange: { start: string; end: string };
}): Promise<AnalyticsResult> {
  const body: Record<string, unknown> = {
    metrics: params.metrics,
    granularity: params.granularity,
    time_range: params.timeRange,
    limit: 1000,
  };
  if (params.dimensions.length > 0) {
    body.dimensions = params.dimensions;
  }
  if (params.keyHash) {
    body.filters = [{ field: 'api_key_id', operator: 'eq', value: params.keyHash }];
  }
  const { data } = await fetchJSON<{ data: AnalyticsResult }>('/analytics/query', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data;
}

export async function listGuardrails(): Promise<Guardrail[]> {
  const body = await fetchJSON<{ data: Guardrail[] }>('/guardrails');
  return body.data ?? [];
}

export async function listGuardrailKeyAssignments(guardrailId: string): Promise<GuardrailAssignment[]> {
  const body = await fetchJSON<{ data: GuardrailAssignment[] }>(`/guardrails/${guardrailId}/assignments/keys`);
  return body.data ?? [];
}
