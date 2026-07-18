// ── OpenRouter API client ──────────────────────────────────────────────

const BASE = 'https://openrouter.ai/api/v1';

export interface KeyInfo {
  hash: string;
  name: string;
  label: string;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  byok_usage: number;
  byok_usage_daily: number;
  byok_usage_weekly: number;
  byok_usage_monthly: number;
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  include_byok_in_limit: boolean;
  is_free_tier: boolean;
  disabled: boolean;
  workspace_id: string;
}

export interface Guardrail {
  id: string;
  name: string;
  description: string | null;
  limit_usd: number | null;
  reset_interval: 'daily' | 'weekly' | 'monthly' | null;
  allowed_models: string[] | null;
  allowed_providers: string[] | null;
  ignored_models: string[] | null;
  ignored_providers: string[] | null;
  enforce_zdr_anthropic: boolean | null;
  enforce_zdr_openai: boolean | null;
  enforce_zdr_google: boolean | null;
  created_at: string;
  updated_at: string | null;
  workspace_id: string;
}

export interface ModelRow {
  model: string;
  total_usage: number;
  request_count: string;
  tokens_total: string;
  cache_hit_rate: number;
}

export interface AnalyticsResult {
  rows: ModelRow[];
  totalUsage: number;
  totalTokens: number;
  totalReqs: number;
  queryTimeMs: number;
  truncated: boolean;
}

export interface BudgetInfo {
  guardrail: Guardrail | null;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  resetDate: string | null;
  daysUntilReset: number | null;
  interval: string;
}

export interface AllData {
  key: KeyInfo;
  keys: KeyInfo[];
  guardrails: Guardrail[];
  budget: BudgetInfo | null;
  modelBreakdown: AnalyticsResult | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

function nextReset(interval: string | null): Date | null {
  if (!interval) return null;
  const now = new Date();
  switch (interval) {
    case 'daily':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    case 'weekly': {
      const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
    }
    case 'monthly':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    default:
      return null;
  }
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export class OpenRouterAPI {
  private mgmtKey: string;

  constructor(mgmtKey: string) {
    this.mgmtKey = mgmtKey;
  }

  private async fetch(path: string, options?: RequestInit): Promise<any> {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.mgmtKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  // ── List all API keys ──
  async listKeys(): Promise<KeyInfo[]> {
    // Also get the current key info via /key (uses regular API key, but we can at least list keys)
    const body = await this.fetch('/keys');
    return body.data ?? [];
  }

  // ── Get key details (uses the management key to get a specific key) ──
  async getKey(hash: string): Promise<KeyInfo | null> {
    try {
      const body = await this.fetch(`/keys/${hash}`);
      return body.data ?? null;
    } catch {
      return null;
    }
  }

  // ── List guardrails ──
  async listGuardrails(): Promise<Guardrail[]> {
    try {
      const body = await this.fetch('/guardrails');
      return body.data ?? [];
    } catch {
      return [];
    }
  }

  // ── Analytics query ──
  async queryAnalytics(params: {
    metrics: string[];
    dimensions?: string[];
    filters?: { field: string; operator: string; value: string }[];
    granularity?: string;
    order_by?: { field: string; direction: string };
    time_range?: { start: string; end: string };
    limit?: number;
  }): Promise<{ data: any[]; metadata: any }> {
    const body = await this.fetch('/analytics/query', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return {
      data: body.data?.data ?? [],
      metadata: body.data?.metadata ?? {},
    };
  }

  // ── Get everything for a single key ──
  async getAllForKey(keyHash: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<AllData> {
    const now = new Date();

    // Determine time range based on period
    let start: string;
    const end = now.toISOString();

    switch (period) {
      case 'daily':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
        break;
      case 'weekly': {
        // Start of current week (Monday)
        const dayOfWeek = now.getUTCDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - diff);
        monday.setUTCHours(0, 0, 0, 0);
        start = monday.toISOString();
        break;
      }
      case 'monthly':
      default:
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
        break;
    }

    // Run all requests in parallel
    const [keysBody, guardrailsBody, analyticsBody] = await Promise.all([
      this.fetch('/keys'),
      this.fetch('/guardrails'),
      this.queryAnalytics({
        metrics: ['total_usage', 'request_count', 'tokens_total', 'cache_hit_rate'],
        dimensions: ['model'],
        filters: [{ field: 'api_key_id', operator: 'eq', value: keyHash }],
        order_by: { field: 'total_usage', direction: 'desc' },
        time_range: { start, end },
        limit: 20,
      }),
    ]);

    const keys: KeyInfo[] = keysBody.data ?? [];
    const key = keys.find(k => k.hash === keyHash) ?? keys[0];
    const guardrails: Guardrail[] = guardrailsBody.data ?? [];

    // Budget info — only if a guardrail with a limit exists
    const guardrail = guardrails.find(g => g.limit_usd != null && g.limit_usd > 0) ?? null;
    let budget: BudgetInfo | null = null;
    if (guardrail && guardrail.limit_usd && guardrail.limit_usd > 0) {
      const interval = guardrail.reset_interval ?? 'monthly';
      const spent =
        interval === 'daily' ? (key?.usage_daily ?? 0) :
        interval === 'weekly' ? (key?.usage_weekly ?? 0) :
        (key?.usage_monthly ?? 0);
      const limit = guardrail.limit_usd;
      const remaining = Math.max(0, limit - spent);
      const pct = (spent / limit) * 100;
      const resetDate = nextReset(guardrail.reset_interval);
      const days = daysUntil(resetDate);
      budget = {
        guardrail,
        limit,
        spent,
        remaining,
        pct,
        resetDate: resetDate?.toISOString() ?? null,
        daysUntilReset: days,
        interval,
      };
    }

    // Model breakdown
    const rows: ModelRow[] = analyticsBody.data ?? [];
    const totalUsage = rows.reduce((s, r) => s + r.total_usage, 0);
    const totalTokens = rows.reduce((s, r) => s + parseInt(r.tokens_total || '0'), 0);
    const totalReqs = rows.reduce((s, r) => s + parseInt(r.request_count || '0'), 0);

    const modelBreakdown: AnalyticsResult = {
      rows,
      totalUsage,
      totalTokens,
      totalReqs,
      queryTimeMs: analyticsBody.metadata?.query_time_ms ?? 0,
      truncated: analyticsBody.metadata?.truncated ?? false,
    };

    // Also fetch per-key usage via /key equivalent (from the keys list)
    return {
      key,
      keys,
      guardrails,
      budget,
      modelBreakdown,
    };
  }
}