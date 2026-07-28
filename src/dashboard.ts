// ═══════════════════════════════════════════════════════════════════════
//  OpenRouter Tracker — Dashboard Webview Provider
// ═══════════════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import type {
  ApiKey,
  DashboardState,
  MessageFromWebview,
  BudgetLimit,
  AnalyticsMeta,
  Model,
  ModelsFilter,
} from './types';
import * as api from './api';
import { updateStatusBar, StatusBarData } from './status-bar';

let currentPanel: vscode.WebviewPanel | undefined;

function getWebviewHtml(webview: vscode.Webview, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}';
    font-src ${webview.cspSource};">
  <title>OpenRouter Tracker</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, -apple-system, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    h2 { 
      font-size: 20px; 
      margin-bottom: 16px; 
      color: var(--vscode-editor-foreground);
      font-weight: 600;
      border-bottom: 2px solid var(--vscode-focusBorder);
      padding-bottom: 8px;
    }
    h3 { 
      font-size: 15px; 
      margin: 0 0 12px 0; 
      color: var(--vscode-editor-foreground);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h3::before {
      content: '';
      width: 4px;
      height: 16px;
      background: var(--vscode-focusBorder);
      border-radius: 2px;
    }
    .section {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .row { 
      display: flex; 
      gap: 12px; 
      align-items: center; 
      flex-wrap: wrap; 
      margin-bottom: 10px; 
    }
    label { 
      font-size: 12px; 
      color: var(--vscode-descriptionForeground); 
      font-weight: 500;
      min-width: 90px;
    }
    select, input[type="text"], input[type="number"] {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      transition: border-color 0.2s;
    }
    select:focus, input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    input[type="text"] { flex: 1; min-width: 200px; }
    input[type="number"] { width: 100px; }
    
    /* Toggle Button */
    .toggle-btn {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .toggle-btn::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: var(--vscode-descriptionForeground);
      border-radius: 50%;
      transition: all 0.3s;
    }
    .toggle-btn.active {
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }
    .toggle-btn.active::after {
      left: 22px;
      background: var(--vscode-button-foreground);
    }
    
    /* Range Slider */
    .range-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    .range-slider {
      flex: 1;
      -webkit-appearance: none;
      height: 6px;
      background: var(--vscode-progressBar-background);
      border-radius: 3px;
      outline: none;
      position: relative;
      vertical-align: middle;
    }
    .range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: var(--vscode-button-background);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s;
      position: relative;
      z-index: 2;
      margin-top: -5px;
    }
    .range-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .range-slider::-webkit-slider-runnable-track {
      background: linear-gradient(to right, 
        var(--vscode-button-background) 0%, 
        var(--vscode-button-background) var(--value-percent, 100%), 
        var(--vscode-progressBar-background) var(--value-percent, 100%), 
        var(--vscode-progressBar-background) 100%
      );
      border-radius: 3px;
      height: 6px;
    }
    .range-value {
      min-width: 60px;
      text-align: right;
      font-family: monospace;
      font-size: 12px;
      color: var(--vscode-foreground);
    }
    
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 12px;
    }
    th, td {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    th {
      background: var(--vscode-editorGroupHeader-tabsBackground);
      color: var(--vscode-foreground);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    tr:hover { background: var(--vscode-list-hoverBackground); }
    td.money { 
      font-family: var(--vscode-editor-font-family, monospace); 
      text-align: right;
      font-weight: 500;
    }
    td.center { text-align: center; }
    
    /* Models Table Specific */
    .models-table th:nth-child(1),
    .models-table td:nth-child(1) { width: 28%; }
    .models-table th:nth-child(2),
    .models-table td:nth-child(2) { width: 32%; font-size: 11px; }
    .models-table th:nth-child(3),
    .models-table td:nth-child(3) { width: 11%; }
    .models-table th:nth-child(4),
    .models-table td:nth-child(4) { width: 11%; }
    .models-table th:nth-child(5),
    .models-table td:nth-child(5) { width: 10%; }
    .models-table th:nth-child(6),
    .models-table td:nth-child(6) { width: 8%; text-align: center; }
    
    /* Buttons */
    .btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { 
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .btn-sm { 
      padding: 4px 10px; 
      font-size: 11px; 
    }
    .btn-active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      box-shadow: inset 0 0 0 2px var(--vscode-focusBorder);
    }
    
    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .page-info {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin: 0 12px;
    }
    
    /* Status badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success {
      background: var(--vscode-charts-green);
      color: white;
    }
    .badge-neutral {
      background: var(--vscode-descriptionForeground);
      color: var(--vscode-editor-background);
      opacity: 0.5;
    }
    
    /* Progress bar */
    .bar-track {
      width: 100%;
      height: 8px;
      background: var(--vscode-progressBar-background);
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: var(--vscode-charts-green);
      border-radius: 4px;
      transition: width 0.3s;
    }
    .bar-fill.warn { background: var(--vscode-charts-orange); }
    .bar-fill.danger { background: var(--vscode-charts-red); }
    
    .error { 
      color: var(--vscode-errorForeground); 
      background: var(--vscode-inputValidation-errorBackground); 
      padding: 10px 14px; 
      border-radius: 6px; 
      margin: 12px 0;
      border-left: 4px solid var(--vscode-errorForeground);
    }
    .dim { color: var(--vscode-descriptionForeground); font-size: 11px; }
    
    /* Loading spinner */
    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid var(--vscode-button-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <h2>OpenRouter Tracker</h2>
  <div id="error"></div>
  
  <div class="row" style="justify-content:flex-end;margin-bottom:16px;">
    <button class="btn" id="btn-refresh">🔄 Refresh All</button>
  </div>

  <!-- Key Selection -->
  <div class="section">
    <h3>API Key</h3>
    <div class="row">
      <label for="key-select">Active key:</label>
      <select id="key-select"><option>Loading…</option></select>
    </div>
  </div>

  <!-- Usage Summary -->
  <div class="section">
    <h3>Usage Summary</h3>
    <table class="usage-table">
      <thead>
        <tr><th>Period</th><th>Amount</th></tr>
      </thead>
      <tbody id="usage-body">
        <tr><td>All time</td><td class="money">—</td></tr>
        <tr><td>This month</td><td class="money">—</td></tr>
        <tr><td>This week</td><td class="money">—</td></tr>
        <tr><td>Today</td><td class="money">—</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Budget Limits -->
  <div class="section">
    <h3>Budget Limits</h3>
    <table>
      <thead>
        <tr><th>Track</th><th>Source</th><th>Name</th><th>Interval</th><th>Limit</th><th>Used</th><th>Remaining</th><th>Progress</th></tr>
      </thead>
      <tbody id="budget-body"><tr><td colspan="8">Loading…</td></tr></tbody>
    </table>
  </div>

  <!-- Models -->
  <div class="section">
    <h3>Models</h3>
    <div class="row">
      <label for="model-sort">Sort by:</label>
      <select id="model-sort" style="flex:1;">
        <option value="top-weekly">📈 Top weekly</option>
        <option value="pricing-low-to-high">💰 Price (low to high)</option>
        <option value="pricing-high-to-low">💰 Price (high to low)</option>
        <option value="context-high-to-low">📏 Context length</option>
        <option value="throughput-high-to-low">⚡ Throughput</option>
        <option value="latency-low-to-high">⏱️ Latency (low to high)</option>
        <option value="most-popular">🔥 Most popular</option>
        <option value="newest">✨ Newest</option>
        <option value="intelligence-high-to-low">🧠 Intelligence</option>
        <option value="coding-high-to-low">💻 Coding</option>
        <option value="agentic-high-to-low">🤖 Agentic</option>
        <option value="design-arena-elo-high-to-low">🎨 Design Arena ELO</option>
      </select>
    </div>
    <div class="row">
      <label for="model-search">Search:</label>
      <input type="text" id="model-search" placeholder="🔍 Model name or slug...">
    </div>
    <div class="row">
      <label>ZDR only:</label>
      <div class="toggle-btn" id="model-zdr" role="checkbox" aria-checked="false" tabindex="0"></div>
      <span class="dim" id="zdr-label">Show only zero data retention models</span>
    </div>
    <div class="row">
      <label>Max output price ($/M):</label>
      <div class="range-container">
        <input type="range" class="range-slider" id="model-price-slider" min="0" max="100" value="100" step="1">
        <span class="range-value" id="model-price-value">$100</span>
      </div>
    </div>
    <div class="row" style="margin-top:12px;">
      <button class="btn" id="btn-models">
        <span>Apply Filters</span>
      </button>
      <button class="btn btn-secondary" id="btn-models-reset">
        <span>Reset</span>
      </button>
    </div>
    <div id="models-result" style="margin-top:12px;"></div>
    <div id="models-pagination"></div>
  </div>

  <!-- Analytics -->
  <div class="section">
    <h3>Analytics</h3>
    <div class="row">
      <label for="dim-select">Dimension:</label>
      <select id="dim-select">
        <option value="user">User</option>
        <option value="model">Model</option>
        <option value="api_key_id">API Key ID</option>
      </select>
    </div>
    <div class="row">
      <label for="met-select">Metric:</label>
      <select id="met-select">
        <option value="total_usage">Total Usage</option>
        <option value="request_count">Request Count</option>
        <option value="credits_usage">Credits Usage</option>
        <option value="openrouter_usage">OpenRouter Usage</option>
      </select>
    </div>
    <div class="row">
      <label for="gran-select">Granularity:</label>
      <select id="gran-select">
        <option value="minute">Minute</option>
        <option value="hour">Hour</option>
        <option value="day" selected>Day</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
    </div>
    <div class="row" style="margin-top:8px;">
      <button class="btn" id="btn-analytics">Run Analytics</button>
    </div>
    <div id="analytics-result" style="margin-top:8px;"></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = null;
    let modelsFilterState = {
      sort: 'top-weekly',
      searchQuery: '',
      zdr: false,
      maxPrice: 100,
      offset: 0,
      limit: 20
    };

    // ── Helpers ──
    function $(id) { return document.getElementById(id); }
    function fmtMoney(v) {
      if (v == null || v === '') return '—';
      return '$' + Number(v).toFixed(4);
    }

    function renderBar(pct) {
      let cls = '';
      if (pct > 90) cls = 'danger';
      else if (pct > 75) cls = 'warn';
      return '<div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>' + pct.toFixed(1) + '%';
    }

    function updateSliderFill() {
      const slider = $('model-price-slider');
      const value = slider.value;
      const percent = (value / slider.max) * 100;
      slider.style.setProperty('--value-percent', percent + '%');
    }

    function applyModelsFilter() {
      modelsFilterState = {
        sort: $('model-sort').value,
        searchQuery: $('model-search').value || '',
        zdr: $('model-zdr').classList.contains('active'),
        maxPrice: parseFloat($('model-price-slider').value),
        offset: 0,
        limit: 20,
      };
      vscode.postMessage({ type: 'fetchModels', filter: modelsFilterState });
    }

    // ── Render functions ──
    function renderUsage(detail) {
      if (!detail) return;
      const rows = [
        ['All time', detail.usage],
        ['This month', detail.usage_monthly],
        ['This week', detail.usage_weekly],
        ['Today', detail.usage_daily],
      ];
      $('usage-body').innerHTML = rows
        .map(r => '<tr><td>' + r[0] + '</td><td class="money">' + fmtMoney(r[1]) + '</td></tr>')
        .join('');
    }

    function renderBudgets(budgets, trackedId) {
      if (!budgets?.length) {
        $('budget-body').innerHTML = '<tr><td colspan="8">No budget limits found</td></tr>';
        return;
      }
      $('budget-body').innerHTML = budgets
        .map(b => '<tr>' +
          '<td><input type="radio" name="tracked" value="' + b.id + '"' + (b.id === trackedId ? ' checked' : '') + '></td>' +
          '<td>' + b.source + '</td>' +
          '<td>' + b.name + '</td>' +
          '<td>' + (b.resetInterval ?? 'lifetime') + '</td>' +
          '<td>' + fmtMoney(b.limitUsd) + '</td>' +
          '<td>' + fmtMoney(b.used) + '</td>' +
          '<td>' + fmtMoney(b.remaining) + '</td>' +
          '<td style="min-width:140px;">' + renderBar(b.pct) + '</td>' +
          '</tr>')
        .join('');

      // Listen for radio changes
      document.querySelectorAll('input[name="tracked"]').forEach(r => {
        r.addEventListener('change', () => {
          vscode.postMessage({ type: 'setTrackedLimit', limitId: r.value });
        });
      });
    }

    function renderAnalyticsResult(result) {
      const el = $('analytics-result');
      if (!result?.data?.length) { el.innerHTML = '<p class="dim">No analytics data.</p>'; return; }

      const rows = result.data;
      const keys = Object.keys(rows[0]);
      let html = '<table><thead><tr>';
      for (const k of keys) html += '<th>' + k + '</th>';
      html += '</tr></thead><tbody>';
      for (const row of rows) {
        html += '<tr>';
        for (const k of keys) {
          let v = row[k];
          if (v == null) v = '—';
          html += '<td>' + v + '</td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table><p class="dim">' + rows.length + ' rows</p>';
      el.innerHTML = html;
    }

    function formatModelPrice(priceStr) {
      if (!priceStr) return '—';
      const price = parseFloat(priceStr);
      if (isNaN(price)) return '—';
      const perMillion = price * 1000000;
      return '$' + perMillion.toFixed(4);
    }

    function formatContextLength(contextLength) {
      if (!contextLength || contextLength === null) return '—';
      const length = Number(contextLength);
      if (isNaN(length)) return '—';
      
      if (length >= 1000000) {
        return (length / 1000000).toFixed(1) + 'M';
      } else if (length >= 1000) {
        return (length / 1000).toFixed(0) + 'K';
      } else {
        return length.toString();
      }
    }

    function renderModels(models, total, offset, limit, zdrFilter, zdrModelIds) {
      const el = $('models-result');
      if (!models?.length) {
        el.innerHTML = '<p class="dim">No models found.</p>';
        $('models-pagination').innerHTML = '';
        return;
      }

      // Create a Set for fast lookup if zdrModelIds is provided
      const zdrSet = zdrModelIds ? new Set(zdrModelIds) : null;

      let html = '<table class="models-table"><thead><tr>' +
        '<th>Name</th>' +
        '<th>Slug</th>' +
        '<th style="text-align:right;">Input ($/M)</th>' +
        '<th style="text-align:right;">Output ($/M)</th>' +
        '<th style="text-align:right;">Context</th>' +
        '<th style="text-align:center;">ZDR</th>' +
        '</tr></thead><tbody>';

      for (const model of models) {
        const name = (model.name || '—').substring(0, 40);
        const slug = model.id || '—';
        const inputPrice = formatModelPrice(model.pricing?.prompt);
        const outputPrice = formatModelPrice(model.pricing?.completion);
        const contextLength = formatContextLength(model.context_length || model.top_provider?.context_length);
        
        // When ZDR filter is active, all models in the result support ZDR
        // When ZDR filter is not active, check if model is in the ZDR models list
        let zdrBadge;
        if (zdrFilter) {
          zdrBadge = '<span class="badge badge-success">✓</span>';
        } else if (zdrSet && zdrSet.has(model.id)) {
          zdrBadge = '<span class="badge badge-success">✓</span>';
        } else {
          zdrBadge = '<span class="badge badge-neutral">—</span>';
        }

        html += '<tr>' +
          '<td>' + name + '</td>' +
          '<td class="dim">' + slug + '</td>' +
          '<td class="money">' + inputPrice + '</td>' +
          '<td class="money">' + outputPrice + '</td>' +
          '<td class="money">' + contextLength + '</td>' +
          '<td class="center">' + zdrBadge + '</td>' +
          '</tr>';
      }

      html += '</tbody></table>';
      el.innerHTML = html;

      // Pagination
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(offset / limit) + 1;
      const startItem = offset + 1;
      const endItem = Math.min(offset + limit, total);
      
      let pagHtml = '<div class="pagination">';
      
      if (currentPage > 1) {
        pagHtml += '<button class="btn btn-sm btn-secondary" data-page="' + (currentPage - 1) + '">← Prev</button>';
      }

      pagHtml += '<span class="page-info">Page ' + currentPage + ' of ' + totalPages + ' (' + startItem + '-' + endItem + ' of ' + total + ')</span>';

      if (currentPage < totalPages) {
        pagHtml += '<button class="btn btn-sm" data-page="' + (currentPage + 1) + '">Next →</button>';
      }

      pagHtml += '</div>';
      $('models-pagination').innerHTML = pagHtml;
      
      // Add event listeners to pagination buttons
      document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const page = parseInt(e.target.getAttribute('data-page'));
          changePage(page);
        });
      });
    }

    function changePage(page) {
      const offset = (page - 1) * modelsFilterState.limit;
      modelsFilterState.offset = offset;
      vscode.postMessage({ type: 'fetchModels', filter: modelsFilterState });
    }

    function renderAll(s) {
      state = s;
      if (!s) return;

      // Key selector
      const sel = $('key-select');
      sel.innerHTML = s.apiKeys
        .map(k => '<option value="' + k.hash + '"' + (k.hash === s.selectedKeyHash ? ' selected' : '') + '>' + k.name + (k.disabled ? ' [DISABLED]' : '') + '</option>')
        .join('');

      renderUsage(s.selectedKeyDetail);
      renderBudgets(s.budgetLimits, s.trackedLimitId);
    }

    // ── Events ──
    $('key-select').addEventListener('change', () => {
      vscode.postMessage({ type: 'selectKey', hash: $('key-select').value });
    });

    $('btn-analytics').addEventListener('click', () => {
      vscode.postMessage({
        type: 'runAnalytics',
        dimension: $('dim-select').value,
        metric: $('met-select').value,
        granularity: $('gran-select').value,
      });
    });

    $('btn-refresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    // Toggle button for ZDR
    const zdrToggle = $('model-zdr');
    zdrToggle.addEventListener('click', () => {
      zdrToggle.classList.toggle('active');
      const isActive = zdrToggle.classList.contains('active');
      zdrToggle.setAttribute('aria-checked', isActive);
      $('zdr-label').textContent = isActive ? 'Showing only zero data retention models' : 'Show only zero data retention models';
      applyModelsFilter();
    });
    zdrToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        zdrToggle.click();
      }
    });

    // Price slider
    const priceSlider = $('model-price-slider');
    const priceValue = $('model-price-value');
    priceSlider.addEventListener('input', () => {
      const value = priceSlider.value;
      priceValue.textContent = '$' + value;
      updateSliderFill();
    });
    priceSlider.addEventListener('change', () => {
      applyModelsFilter();
    });

    // Search input - Enter key triggers refresh
    $('model-search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyModelsFilter();
      }
    });

    // Sort dropdown triggers refresh
    $('model-sort').addEventListener('change', () => {
      applyModelsFilter();
    });

    $('btn-models').addEventListener('click', () => {
      modelsFilterState = {
        sort: $('model-sort').value,
        searchQuery: $('model-search').value || '',
        zdr: $('model-zdr').classList.contains('active'),
        maxPrice: parseFloat(priceSlider.value),
        offset: 0,
        limit: 20,
      };
      vscode.postMessage({ type: 'fetchModels', filter: modelsFilterState });
    });

    $('btn-models-reset').addEventListener('click', () => {
      $('model-sort').value = 'top-weekly';
      $('model-search').value = '';
      $('model-zdr').classList.remove('active');
      $('model-zdr').setAttribute('aria-checked', 'false');
      $('zdr-label').textContent = 'Show only zero data retention models';
      priceSlider.value = 100;
      priceValue.textContent = '$100';
      updateSliderFill();
      
      modelsFilterState = {
        sort: 'top-weekly',
        searchQuery: '',
        zdr: false,
        maxPrice: 100,
        offset: 0,
        limit: 20
      };
      vscode.postMessage({ type: 'fetchModels', filter: modelsFilterState });
    });

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'state') {
        renderAll(msg.state);
      } else if (msg.type === 'analyticsResult') {
        renderAnalyticsResult(msg.result);
      } else if (msg.type === 'error') {
        $('error').innerHTML = '<div class="error">' + msg.message + '</div>';
        setTimeout(() => { $('error').innerHTML = ''; }, 8000);
      } else if (msg.type === 'modelsResult') {
        renderModels(msg.models, msg.total, msg.offset, msg.limit, msg.zdrFilter, msg.zdrModelIds);
      }
    });

    vscode.postMessage({ type: 'refresh' });
  </script>
</body>
</html>`;
}

async function buildState(
  keys: ApiKey[],
  selectedHash: string | null,
  trackedLimitId: string | null,
): Promise<DashboardState> {
  let hash = selectedHash ?? keys[0]?.hash ?? null;
  let detail: ApiKey | null = null;
  let meta: AnalyticsMeta | null = null;
  const budgetLimits: BudgetLimit[] = [];

  if (hash) {
    // If the stored hash is stale (e.g. after changing management key),
    // fall back to the first available key
    try {
      detail = await api.getKeyDetail(hash);
    } catch (error) {
      console.log('api.getKeyDetail error: ', error);
      hash = keys[0]?.hash ?? null;
      if (hash) {
        try { detail = await api.getKeyDetail(hash); } catch (error) { 
          console.log('await api.getKeyDetail error: ', error);
          detail = null; 
        }
      }
    }
  }

  if (hash && detail) {

    // Key-level limit
    if (detail.limit != null && detail.limit > 0) {
      const used = getUsageForInterval(detail, detail.limit_reset);
      const remaining = Math.max(0, detail.limit - used);
      const pct = Math.min(100, (used / detail.limit) * 100);
      budgetLimits.push({
        source: 'key-level',
        id: `key-${hash}`,
        name: detail.name + ' (key limit)',
        limitUsd: detail.limit,
        resetInterval: detail.limit_reset,
        used,
        remaining,
        pct,
      });
    }

    // Guardrails
    try {
      const guardrails = await api.listGuardrails();
      for (const g of guardrails) {
        if (g.limit_usd == null || g.limit_usd <= 0) { continue; }
        let assignments: { key_hash: string }[] = [];
        try { assignments = await api.listGuardrailKeyAssignments(g.id); } catch (error) {
          console.log('api.listGuardrailKeyAssignments(g.id) error: ', error);
        }

        const isAssigned = assignments.some(a => a.key_hash === hash);
        const isWorkspaceGuard = g.workspace_id === detail?.workspace_id &&
          /^Workspace [0-9a-f-]+/i.test(g.name);

        if (isAssigned || isWorkspaceGuard) {
          const used = getUsageForInterval(detail!, g.reset_interval);
          const remaining = Math.max(0, g.limit_usd - used);
          const pct = Math.min(100, (used / g.limit_usd) * 100);
          budgetLimits.push({
            source: isAssigned ? 'guardrail' : 'workspace',
            id: `guardrail-${g.id}`,
            name: g.name,
            limitUsd: g.limit_usd,
            resetInterval: g.reset_interval,
            used,
            remaining,
            pct,
          });
        }
      }
    } catch { /* guardrails not available */ }

    // Meta
    try { meta = await api.fetchMeta(); } catch (error) {
      console.log('api.fetchMeta() error: ', error);
    }
  }

  // Persist tracked limit
  const effectiveTracked =
    trackedLimitId ?? budgetLimits[0]?.id ?? null;

  // Update status bar
  const tracked = budgetLimits.find(b => b.id === effectiveTracked);

  const usage = detail
    ? [
        { period: 'All time', amount: detail.usage },
        { period: 'This month', amount: detail.usage_monthly },
        { period: 'This week', amount: detail.usage_weekly },
        { period: 'Today', amount: detail.usage_daily },
      ]
    : [];
  const sbBudgets: StatusBarData['budgets'] = budgetLimits.map(b => ({
    name: b.name,
    source: b.source,
    interval: b.resetInterval ?? 'lifetime',
    limitUsd: b.limitUsd,
    used: b.used,
    remaining: b.remaining,
    pct: b.pct,
    isTracked: b.id === effectiveTracked,
  }));

  updateStatusBar({
    usage,
    budgets: sbBudgets,
    tracked: tracked
      ? { name: tracked.name, used: tracked.used, limitUsd: tracked.limitUsd, pct: tracked.pct }
      : null,
  });

  return {
    apiKeys: keys,
    selectedKeyHash: hash,
    selectedKeyDetail: detail,
    budgetLimits,
    analyticsMeta: meta,
    trackedLimitId: effectiveTracked,
    analyticsDimension: 'user',
    analyticsMetric: 'total_usage',
    analyticsGranularity: 'day',
    analyticsCustomRange: null,
    models: [],
    modelsTotal: 0,
    modelsFilter: {
      zdr: false,
      minPrice: null,
      maxPrice: null,
      searchQuery: '',
      sort: 'pricing-low-to-high',
      offset: 0,
      limit: 20,
    },
  };
}

function getUsageForInterval(
  detail: ApiKey,
  interval: string | null,
): number {
  switch (interval) {
    case 'daily': return detail.usage_daily ?? 0;
    case 'weekly': return detail.usage_weekly ?? 0;
    case 'monthly': return detail.usage_monthly ?? 0;
    default: return detail.usage ?? 0;
  }
}

export async function showDashboard(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'openrouterTrackerDashboard',
    'OpenRouter Tracker',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const nonce = getNonce();
  currentPanel.webview.html = getWebviewHtml(currentPanel.webview, nonce);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });

  // Handle messages
  let analyticsState: {
    dimension: string;
    metric: string;
    granularity: string;
    customRange: { start: string; end: string } | null;
  } = {
    dimension: 'user',
    metric: 'total_usage',
    granularity: 'day',
    customRange: null,
  };

  currentPanel.webview.onDidReceiveMessage(
    async (msg: MessageFromWebview) => {
      try {
        if (msg.type === 'refresh') {
          const keys = await api.listKeys();
          let storedHash: string | null = context.globalState.get('selectedKeyHash') ?? null;

          // If stored hash is stale, fall back to first key and persist
          if (storedHash && !keys.some(k => k.hash === storedHash)) {
            storedHash = keys[0]?.hash ?? null;
            if (storedHash) await context.globalState.update('selectedKeyHash', storedHash);
          }

          const state = await buildState(
            keys,
            storedHash,
            context.globalState.get('trackedLimitId') ?? null,
          );
          // Persist the hash that buildState actually resolved to
          if (state.selectedKeyHash && state.selectedKeyHash !== storedHash) {
            await context.globalState.update('selectedKeyHash', state.selectedKeyHash);
          }
          currentPanel?.webview.postMessage({ type: 'state', state });
        } else if (msg.type === 'selectKey') {
          await context.globalState.update('selectedKeyHash', msg.hash);
          const keys = await api.listKeys();
          const state = await buildState(
            keys,
            msg.hash,
            context.globalState.get('trackedLimitId') ?? null,
          );
          currentPanel?.webview.postMessage({ type: 'state', state });
        } else if (msg.type === 'setTrackedLimit') {
          await context.globalState.update('trackedLimitId', msg.limitId);
          const keys = await api.listKeys();
          const state = await buildState(
            keys,
            context.globalState.get('selectedKeyHash') ?? null,
            msg.limitId,
          );
          currentPanel?.webview.postMessage({ type: 'state', state });
        } else if (msg.type === 'setAnalyticsDimension') {
          analyticsState.dimension = msg.dimension;
        } else if (msg.type === 'setAnalyticsMetric') {
          analyticsState.metric = msg.metric;
        } else if (msg.type === 'setAnalyticsGranularity') {
          analyticsState.granularity = msg.granularity;
        } else if (msg.type === 'setAnalyticsCustomRange') {
          analyticsState.customRange = msg.range;
        } else if (msg.type === 'runAnalytics') {
          // Read dim/metric/gran from the webview message (sent with the click)
          analyticsState.dimension = msg.dimension ?? analyticsState.dimension;
          analyticsState.metric = msg.metric ?? analyticsState.metric;
          analyticsState.granularity = msg.granularity ?? analyticsState.granularity;

          const hash = context.globalState.get<string>('selectedKeyHash');
          if (!hash) {
            currentPanel?.webview.postMessage({
              type: 'error',
              message: 'No API key selected.',
            });
            return;
          }

          let timeRange: { start: string; end: string };
          if (analyticsState.customRange) {
            timeRange = analyticsState.customRange;
          } else {
            timeRange = defaultTimeRange(analyticsState.granularity);
          }

          const result = await api.runAnalytics({
            keyHash: hash,
            metrics: [analyticsState.metric],
            dimensions: analyticsState.dimension ? [analyticsState.dimension] : [],
            granularity: analyticsState.granularity,
            timeRange,
          });
          currentPanel?.webview.postMessage({
            type: 'analyticsResult',
            result,
          });
        } else if (msg.type === 'fetchModels') {
          const result = await api.listModels(msg.filter);
          
          // If ZDR filter is not active, fetch ZDR models to cross-reference
          let zdrModelIds: Set<string> | undefined;
          if (!msg.filter.zdr) {
            try {
              const zdrResult = await api.listModels({ zdr: true, limit: 1000 });
              zdrModelIds = new Set(zdrResult.data.map(m => m.id));
            } catch {
              // If fetching ZDR models fails, just don't show ZDR indicators
            }
          }
          
          currentPanel?.webview.postMessage({
            type: 'modelsResult',
            models: result.data,
            total: result.total_count,
            offset: msg.filter.offset ?? 0,
            limit: msg.filter.limit ?? 20,
            zdrFilter: msg.filter.zdr ?? false,
            zdrModelIds: zdrModelIds ? Array.from(zdrModelIds) : undefined,
          });
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : String(e);
        currentPanel?.webview.postMessage({ type: 'error', message });
      }
    },
  );
}

function defaultTimeRange(gran: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  switch (gran) {
    case 'minute':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'hour':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'day':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'week':
      start = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { start: start.toISOString(), end };
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
