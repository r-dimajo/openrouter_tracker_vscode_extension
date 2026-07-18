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
export declare class OpenRouterAPI {
    private mgmtKey;
    constructor(mgmtKey: string);
    private fetch;
    listKeys(): Promise<KeyInfo[]>;
    getKey(hash: string): Promise<KeyInfo | null>;
    listGuardrails(): Promise<Guardrail[]>;
    queryAnalytics(params: {
        metrics: string[];
        dimensions?: string[];
        filters?: {
            field: string;
            operator: string;
            value: string;
        }[];
        granularity?: string;
        order_by?: {
            field: string;
            direction: string;
        };
        time_range?: {
            start: string;
            end: string;
        };
        limit?: number;
    }): Promise<{
        data: any[];
        metadata: any;
    }>;
    getAllForKey(keyHash: string, period?: 'daily' | 'weekly' | 'monthly'): Promise<AllData>;
}
