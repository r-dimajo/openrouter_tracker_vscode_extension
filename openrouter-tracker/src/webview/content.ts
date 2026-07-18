export function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      --bg: #1e1e2e;
      --card: #252536;
      --card-hover: #2a2a3e;
      --border: #363650;
      --text: #cdd6f4;
      --text-dim: #7f8499;
      --accent: #89b4fa;
      --accent2: #a6e3a1;
      --accent3: #f9e2af;
      --red: #f38ba8;
      --orange: #fab387;
      --green: #a6e3a1;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .container { max-width: 900px; margin: 0 auto; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }
    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .header-actions select {
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }
    .header-actions select:focus { border-color: var(--accent); }
    .btn {
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn:hover { background: var(--card-hover); }
    .btn-primary {
      background: var(--accent);
      color: #111;
      border-color: var(--accent);
      font-weight: 500;
    }
    .btn-primary:hover { opacity: 0.9; }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }
    .card-full { grid-column: 1 / -1; }
    .card-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-dim);
      margin-bottom: 12px;
      font-weight: 600;
    }

    .key-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .key-selector label {
      color: var(--text-dim);
      font-size: 12px;
      white-space: nowrap;
    }
    .key-selector select {
      flex: 1;
      min-width: 200px;
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }
    .key-selector select:focus { border-color: var(--accent); }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: var(--text-dim); font-size: 12px; }
    .stat-value {
      font-family: var(--mono);
      font-size: 13px;
      font-weight: 500;
    }
    .stat-highlight { color: var(--accent); }
    .stat-green { color: var(--green); }
    .stat-orange { color: var(--orange); }
    .stat-red { color: var(--red); }

    .budget-bar {
      margin-top: 8px;
      height: 8px;
      background: var(--bg);
      border-radius: 4px;
      overflow: hidden;
    }
    .budget-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .budget-bar-fill.low { background: var(--green); }
    .budget-bar-fill.med { background: var(--orange); }
    .budget-bar-fill.high { background: var(--red); }

    .model-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .model-table th {
      text-align: right;
      padding: 6px 8px;
      color: var(--text-dim);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }
    .model-table th:first-child { text-align: left; }
    .model-table td {
      text-align: right;
      padding: 6px 8px;
      border-bottom: 1px solid var(--border);
      font-family: var(--mono);
      font-size: 12px;
    }
    .model-table td:first-child {
      text-align: left;
      font-family: var(--font);
      color: var(--text);
    }
    .model-table tr:last-child td { border-bottom: none; }
    .model-table .total-row td {
      font-weight: 600;
      border-top: 2px solid var(--border);
      border-bottom: none;
    }

    .empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-dim);
    }
    .empty p { margin-top: 8px; }
    .empty .btn { margin-top: 16px; }

    .footer {
      text-align: center;
      color: var(--text-dim);
      font-size: 11px;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }
      .header { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OpenRouter Usage</h1>
      <div class="header-actions">
        <button class="btn" id="refreshBtn">Refresh</button>
        <button class="btn" id="settingsBtn">Settings</button>
      </div>
    </div>

    <div class="card card-full" id="keyCard">
      <div class="card-title">API Key</div>
      <div class="key-selector">
        <label for="keySelect">Tracking:</label>
        <select id="keySelect">
          <option value="">Loading keys...</option>
        </select>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Usage</div>
        <div id="usageStats">
          <div class="stat-row"><span class="stat-label">Daily</span><span class="stat-value" id="usageDaily">—</span></div>
          <div class="stat-row"><span class="stat-label">Weekly</span><span class="stat-value" id="usageWeekly">—</span></div>
          <div class="stat-row"><span class="stat-label">Monthly</span><span class="stat-value" id="usageMonthly">—</span></div>
          <div class="stat-row"><span class="stat-label">All Time</span><span class="stat-value" id="usageAll">—</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Budget <span id="budgetIntervalLabel" class="tag" style="margin-left:6px"></span></div>
        <div id="budgetStats">
          <div id="budgetHasLimit" style="display:none">
            <div class="stat-row"><span class="stat-label">Limit</span><span class="stat-value" id="budgetLimit">—</span></div>
            <div class="stat-row"><span class="stat-label">Spent</span><span class="stat-value" id="budgetSpent">—</span></div>
            <div class="stat-row"><span class="stat-label">Remaining</span><span class="stat-value" id="budgetRemaining">—</span></div>
            <div class="stat-row"><span class="stat-label">Used</span><span class="stat-value" id="budgetPct">—</span></div>
            <div class="stat-row"><span class="stat-label">Next Reset</span><span class="stat-value" id="budgetReset">—</span></div>
            <div class="budget-bar" id="budgetBar"><div class="budget-bar-fill" id="budgetBarFill" style="width:0%"></div></div>
          </div>
          <div id="budgetNoLimit" style="display:none;padding:12px 0;text-align:center;color:var(--text-dim);font-size:13px">
            No budget limit set for the current key
          </div>
        </div>
      </div>
    </div>

    <div class="card card-full">
      <div class="card-title">Model Breakdown</div>
      <div id="modelContent">
        <table class="model-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Cost</th>
              <th>%</th>
              <th>Req</th>
              <th>Tokens</th>
              <th>Cache</th>
            </tr>
          </thead>
          <tbody id="modelBody">
            <tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px;">Loading...</td></tr>
          </tbody>
        </table>
        <div style="margin-top:8px;color:var(--text-dim);font-size:11px;font-family:var(--mono)" id="modelFooter"></div>
      </div>
    </div>

    <div class="footer">OpenRouter Tracker — Data refreshes automatically</div>
  </div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      let currentData = null;

      const keySelect = document.getElementById('keySelect');
      const refreshBtn = document.getElementById('refreshBtn');
      const settingsBtn = document.getElementById('settingsBtn');

      function fmt$(n) {
        if (n == null) return '\u2014';
        if (n < 0.01) return '$' + n.toFixed(6);
        if (n < 1) return '$' + n.toFixed(4);
        return '$' + n.toFixed(2);
      }
      function fmtNum(n) { return n != null ? Number(n).toLocaleString() : '\u2014'; }

      function render(data) {
        if (!data || !data.key) {
          document.querySelectorAll('.stat-value').forEach(el => el.textContent = '\u2014');
          return;
        }

        const key = data.key;

        document.getElementById('usageDaily').textContent = fmt$(key.usage_daily);
        document.getElementById('usageWeekly').textContent = fmt$(key.usage_weekly);
        document.getElementById('usageMonthly').textContent = fmt$(key.usage_monthly);
        document.getElementById('usageAll').textContent = fmt$(key.usage);

        if (data.budget) {
          const b = data.budget;
          document.getElementById('budgetHasLimit').style.display = 'block';
          document.getElementById('budgetNoLimit').style.display = 'none';
          document.getElementById('budgetLimit').textContent = '$' + b.limit.toFixed(2);
          document.getElementById('budgetSpent').textContent = fmt$(b.spent);
          document.getElementById('budgetRemaining').textContent = fmt$(b.remaining);
          document.getElementById('budgetPct').textContent = b.pct.toFixed(2) + '%';

          const intervalLabel = b.interval.charAt(0).toUpperCase() + b.interval.slice(1);
          document.getElementById('budgetIntervalLabel').textContent = intervalLabel;
          document.getElementById('budgetIntervalLabel').className = 'tag ' + (b.pct > 80 ? 'tag-red' : b.pct > 50 ? 'tag-orange' : 'tag-green');

          const resetStr = b.resetDate
            ? new Date(b.resetDate).toUTCString().slice(5, 22) + ' (' + b.daysUntilReset + 'd)'
            : 'Never';
          document.getElementById('budgetReset').textContent = resetStr + ' (' + b.interval + ')';

          const fill = document.getElementById('budgetBarFill');
          fill.style.width = Math.min(b.pct, 100) + '%';
          fill.className = 'budget-bar-fill ' + (b.pct > 80 ? 'high' : b.pct > 50 ? 'med' : 'low');
        } else {
          document.getElementById('budgetHasLimit').style.display = 'none';
          document.getElementById('budgetNoLimit').style.display = 'block';
          document.getElementById('budgetIntervalLabel').textContent = '';
        }

        const tbody = document.getElementById('modelBody');
        const footer = document.getElementById('modelFooter');

        if (data.modelBreakdown && data.modelBreakdown.rows.length > 0) {
          const mb = data.modelBreakdown;
          let html = '';
          for (const r of mb.rows) {
            const model = r.model.length > 40 ? r.model.slice(0, 37) + '...' : r.model;
            const pct = ((r.total_usage / mb.totalUsage) * 100).toFixed(1) + '%';
            const tokens = parseInt(r.tokens_total || '0');
            const cache = r.cache_hit_rate != null ? (r.cache_hit_rate * 100).toFixed(0) + '%' : '-';
            html += '<tr>' +
              '<td>' + model + '</td>' +
              '<td>' + fmt$(r.total_usage) + '</td>' +
              '<td>' + pct + '</td>' +
              '<td>' + fmtNum(r.request_count) + '</td>' +
              '<td>' + (tokens > 0 ? (tokens / 1000).toFixed(0) + 'k' : '0') + '</td>' +
              '<td>' + cache + '</td>' +
              '</tr>';
          }
          html += '<tr class="total-row"><td>TOTAL</td><td>' + fmt$(mb.totalUsage) + '</td><td>100%</td><td>' + fmtNum(mb.totalReqs) + '</td><td>' + (mb.totalTokens > 0 ? (mb.totalTokens / 1000).toFixed(0) + 'k' : '0') + '</td><td></td></tr>';
          tbody.innerHTML = html;

          const blendedRate = mb.totalTokens > 0 ? (mb.totalUsage / mb.totalTokens * 1_000_000).toFixed(2) : 'N/A';
          footer.textContent = 'Blended rate: $' + blendedRate + '/M tok  \u00b7  ' + mb.rows.length + ' models  \u00b7  ' + mb.queryTimeMs + 'ms' + (mb.truncated ? '  \u26a0 truncated' : '');
        } else {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px;">No usage data for this period</td></tr>';
          footer.textContent = '';
        }
      }

      function populateKeys(data, selectedHash) {
        if (!data || !data.keys) return;
        let html = '';
        for (const k of data.keys) {
          const label = k.name + ' (' + k.label.slice(0, 15) + '...)';
          const sel = k.hash === selectedHash ? 'selected' : '';
          html += '<option value="' + k.hash + '" ' + sel + '>' + label + '</option>';
        }
        keySelect.innerHTML = html;
      }

      window.addEventListener('message', event => {
        const msg = event.data;
        if (msg.type === 'data') {
          currentData = msg.data;
          populateKeys(msg.data, msg.data.key?.hash);
          render(msg.data);
        }
      });

      keySelect.addEventListener('change', () => {
        vscode.postMessage({ type: 'selectKey', keyHash: keySelect.value });
      });

      refreshBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'refresh' });
      });

      settingsBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'openSettings' });
      });

      vscode.postMessage({ type: 'ready' });
    })();
  </script>
</body>
</html>`;
}