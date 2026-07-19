"use strict";
// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — API Client
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
exports.listKeys = listKeys;
exports.getKeyDetail = getKeyDetail;
exports.fetchMeta = fetchMeta;
exports.runAnalytics = runAnalytics;
exports.listGuardrails = listGuardrails;
exports.listGuardrailKeyAssignments = listGuardrailKeyAssignments;
const vscode = __importStar(require("vscode"));
const BASE = 'https://openrouter.ai/api/v1';
function getKey() {
    return vscode.workspace.getConfiguration('openrouterTracker').get('managementKey', '');
}
async function fetchJSON(endpoint, init = {}) {
    const mgmtKey = getKey();
    if (!mgmtKey) {
        throw new Error('OpenRouter management key not set. Configure openrouterTracker.managementKey in settings.');
    }
    const res = await fetch(`${BASE}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${mgmtKey}`,
            'Content-Type': 'application/json',
            ...init.headers,
        },
        ...init,
    });
    const text = await res.text();
    if (!res.ok) {
        let detail = text;
        try {
            detail = JSON.stringify(JSON.parse(text), null, 2);
        }
        catch { /* keep raw */ }
        throw new Error(`${res.status} ${res.statusText}\n${detail}`);
    }
    return JSON.parse(text);
}
async function listKeys() {
    const body = await fetchJSON('/keys');
    return body.data ?? [];
}
async function getKeyDetail(hash) {
    const { data } = await fetchJSON(`/keys/${hash}`);
    return data;
}
async function fetchMeta() {
    const { data } = await fetchJSON('/analytics/meta');
    return data;
}
async function runAnalytics(params) {
    const body = {
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
    const { data } = await fetchJSON('/analytics/query', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return data;
}
async function listGuardrails() {
    const body = await fetchJSON('/guardrails');
    return body.data ?? [];
}
async function listGuardrailKeyAssignments(guardrailId) {
    const body = await fetchJSON(`/guardrails/${guardrailId}/assignments/keys`);
    return body.data ?? [];
}
//# sourceMappingURL=api.js.map