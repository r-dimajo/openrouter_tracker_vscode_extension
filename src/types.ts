// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Type Definitions
// ═══════════════════════════════════════════════════════════════════════

export interface ApiKey {
  name: string;
  label: string;
  hash: string;
  disabled: boolean;
  workspace_id: string | null;
  created_at: string;
  expires_at: string | null;
  usage: number;
  usage_monthly: number;
  usage_weekly: number;
  usage_daily: number;
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  include_byok_in_limit: boolean;
  byok_usage: number;
  byok_usage_monthly: number;
}

export interface MetricMeta {
  name: string;
  display_label: string;
  display_format: string;
  is_rate: boolean;
}

export interface DimensionMeta {
  name: string;
  display_label: string;
}

export interface GranularityMeta {
  name: string;
  display_label: string;
}

export interface AnalyticsMeta {
  metrics: MetricMeta[];
  dimensions: DimensionMeta[];
  granularities: GranularityMeta[];
}

export interface AnalyticsRow {
  [key: string]: string | number;
}

export interface AnalyticsResult {
  data: AnalyticsRow[];
  metadata?: { truncated?: boolean };
}

export interface Guardrail {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  limit_usd: number | null;
  reset_interval: string | null;
  allowed_models: string[] | null;
  allowed_providers: string[] | null;
  ignored_models: string[] | null;
  ignored_providers: string[] | null;
  enforce_zdr_anthropic: boolean;
  enforce_zdr_openai: boolean;
  enforce_zdr_google: boolean;
  enforce_zdr_xai: boolean;
  enforce_zdr_other: boolean;
  content_filters: unknown[] | null;
  content_filter_builtins: unknown[] | null;
  created_at: string;
}

export interface GuardrailAssignment {
  key_hash: string;
  key_name: string;
  key_label: string;
}

export interface BudgetLimit {
  source: 'key-level' | 'guardrail' | 'workspace';
  id: string;
  name: string;
  limitUsd: number;
  resetInterval: string | null;
  used: number;
  remaining: number;
  pct: number;
}

// ═══════════════════════════════════════════════════════════════════════
//  Models
// ═══════════════════════════════════════════════════════════════════════

export interface Model {
  id: string;
  name: string;
  canonical_slug: string;
  description?: string | null;
  context_length: number | null;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  top_provider?: {
    is_moderated: boolean;
    context_length?: number;
    max_completion_tokens?: number | null;
  };
  architecture?: {
    input_modalities: string[];
    output_modalities: string[];
    modality: string;
    tokenizer?: string;
  };
  created: number;
}

export interface ModelsListResponse {
  data: Model[];
  total_count: number;
  links?: {
    next: string | null;
  };
}

export type ModelSortOption =
  | 'pricing-low-to-high'
  | 'pricing-high-to-low'
  | 'context-high-to-low'
  | 'throughput-high-to-low'
  | 'latency-low-to-high'
  | 'most-popular'
  | 'top-weekly'
  | 'newest'
  | 'intelligence-high-to-low'
  | 'coding-high-to-low'
  | 'agentic-high-to-low'
  | 'design-arena-elo-high-to-low';

export interface ModelsFilter {
  zdr: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  searchQuery: string;
  sort: ModelSortOption;
  offset: number;
  limit: number;
}

export interface DashboardState {
  apiKeys: ApiKey[];
  selectedKeyHash: string | null;
  selectedKeyDetail: ApiKey | null;
  budgetLimits: BudgetLimit[];
  analyticsMeta: AnalyticsMeta | null;
  trackedLimitId: string | null;
  // Analytics filters
  analyticsDimension: string;
  analyticsMetric: string;
  analyticsGranularity: string;
  analyticsCustomRange: { start: string; end: string } | null;
  // Models
  models: Model[];
  modelsTotal: number;
  modelsFilter: ModelsFilter;
}

export type MessageToWebview =
  | { type: 'state'; state: DashboardState }
  | { type: 'analyticsResult'; result: AnalyticsResult }
  | { type: 'modelsResult'; models: Model[]; total: number; offset: number; limit: number }
  | { type: 'error'; message: string };

export type MessageFromWebview =
  | { type: 'selectKey'; hash: string }
  | { type: 'setTrackedLimit'; limitId: string }
  | { type: 'setAnalyticsDimension'; dimension: string }
  | { type: 'setAnalyticsMetric'; metric: string }
  | { type: 'setAnalyticsGranularity'; granularity: string }
  | { type: 'setAnalyticsCustomRange'; range: { start: string; end: string } | null }
  | { type: 'runAnalytics'; dimension?: string; metric?: string; granularity?: string }
  | { type: 'refresh' }
  | { type: 'fetchModels'; filter: Partial<ModelsFilter> }
  | { type: 'setModelsFilter'; filter: Partial<ModelsFilter> };
