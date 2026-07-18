"use strict";
// ── OpenRouter API client ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterAPI = void 0;
const BASE = 'https://openrouter.ai/api/v1';
// ── Helpers ────────────────────────────────────────────────────────────
function nextReset(interval) {
    if (!interval)
        return null;
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
function daysUntil(d) {
    if (!d)
        return null;
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
class OpenRouterAPI {
    mgmtKey;
    constructor(mgmtKey) {
        this.mgmtKey = mgmtKey;
    }
    async fetch(path, options) {
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
    async listKeys() {
        // Also get the current key info via /key (uses regular API key, but we can at least list keys)
        const body = await this.fetch('/keys');
        return body.data ?? [];
    }
    // ── Get key details (uses the management key to get a specific key) ──
    async getKey(hash) {
        try {
            const body = await this.fetch(`/keys/${hash}`);
            return body.data ?? null;
        }
        catch {
            return null;
        }
    }
    // ── List guardrails ──
    async listGuardrails() {
        try {
            const body = await this.fetch('/guardrails');
            return body.data ?? [];
        }
        catch {
            return [];
        }
    }
    // ── Analytics query ──
    async queryAnalytics(params) {
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
    async getAllForKey(keyHash, period = 'monthly') {
        const now = new Date();
        // Determine time range based on period
        let start;
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
        const keys = keysBody.data ?? [];
        const key = keys.find(k => k.hash === keyHash) ?? keys[0];
        const guardrails = guardrailsBody.data ?? [];
        // Budget info — only if a guardrail with a limit exists
        const guardrail = guardrails.find(g => g.limit_usd != null && g.limit_usd > 0) ?? null;
        let budget = null;
        if (guardrail && guardrail.limit_usd && guardrail.limit_usd > 0) {
            const interval = guardrail.reset_interval ?? 'monthly';
            const spent = interval === 'daily' ? (key?.usage_daily ?? 0) :
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
        const rows = analyticsBody.data ?? [];
        const totalUsage = rows.reduce((s, r) => s + r.total_usage, 0);
        const totalTokens = rows.reduce((s, r) => s + parseInt(r.tokens_total || '0'), 0);
        const totalReqs = rows.reduce((s, r) => s + parseInt(r.request_count || '0'), 0);
        const modelBreakdown = {
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
exports.OpenRouterAPI = OpenRouterAPI;
//# sourceMappingURL=api.js.map