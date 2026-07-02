"""
PDF Export Service — generates a styled PDF from transaction list using WeasyPrint + Jinja2.
Supports Vietnamese text via Google Fonts (Noto Sans).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from jinja2 import Template
from weasyprint import HTML

# HTML / CSS Template

_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>FinTrack — Lịch sử giao dịch</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Noto Sans', 'DejaVu Sans', sans-serif;
    font-size: 11px;
    color: #1e293b;
    background: #ffffff;
    padding: 32px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 2px solid #0f1f3d;
  }
  .header h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0f1f3d;
    letter-spacing: -0.5px;
  }
  .header p {
    font-size: 10px;
    color: #64748b;
    margin-top: 4px;
  }
  .badge {
    background: #0f1f3d;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 999px;
  }

  /* ── Summary row ── */
  .summary {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }
  .summary-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
  }
  .summary-card .label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-card .value { font-size: 15px; font-weight: 700; color: #0f1f3d; margin-top: 4px; }
  .summary-card .value.income { color: #059669; }
  .summary-card .value.expense { color: #dc2626; }

  /* ── Table ── */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead tr {
    background: #0f1f3d;
    color: #ffffff;
  }
  thead th {
    padding: 10px 8px;
    text-align: left;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tbody tr:nth-child(even) { background: #f1f5f9; }
  tbody tr:nth-child(odd)  { background: #ffffff; }
  tbody td {
    padding: 8px 8px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .amount-income  { color: #059669; font-weight: 600; }
  .amount-expense { color: #dc2626; font-weight: 600; }
  .type-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 999px;
  }
  .type-income  { background: #d1fae5; color: #065f46; }
  .type-expense { background: #fee2e2; color: #991b1b; }

  /* ── Footer ── */
  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
  }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <h1>FinTrack</h1>
      <p>Lịch sử giao dịch · Xuất ngày {{ export_date }}</p>
    </div>
    <span class="badge">{{ transactions | length }} giao dịch</span>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="summary-card">
      <div class="label">Tổng thu nhập</div>
      <div class="value income">{{ "{:,.0f}".format(total_income) }} ₫</div>
    </div>
    <div class="summary-card">
      <div class="label">Tổng chi tiêu</div>
      <div class="value expense">{{ "{:,.0f}".format(total_expense) }} ₫</div>
    </div>
    <div class="summary-card">
      <div class="label">Số dư thuần</div>
      <div class="value {% if net >= 0 %}income{% else %}expense{% endif %}">
        {{ "{:,.0f}".format(net) }} ₫
      </div>
    </div>
  </div>

  <!-- Table -->
  <table>
    <thead>
      <tr>
        <th>Ngày</th>
        <th>Loại</th>
        <th style="text-align:right;">Số tiền (₫)</th>
        <th>Danh mục</th>
        <th>Ví</th>
        <th>Người bán</th>
        <th>Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      {% for t in transactions %}
      <tr>
        <td>{{ t.date_str }}</td>
        <td>
          <span class="type-badge {% if t.type == 'INCOME' %}type-income{% else %}type-expense{% endif %}">
            {% if t.type == 'INCOME' %}Thu nhập{% else %}Chi tiêu{% endif %}
          </span>
        </td>
        <td style="text-align:right;" class="{% if t.type == 'INCOME' %}amount-income{% else %}amount-expense{% endif %}">
          {{ "{:,.0f}".format(t.amount) }}
        </td>
        <td>{{ t.category }}</td>
        <td>{{ t.wallet }}</td>
        <td>{{ t.merchant }}</td>
        <td>{{ t.note }}</td>
      </tr>
      {% else %}
      <tr>
        <td colspan="7" style="text-align:center; padding:24px; color:#94a3b8;">
          Không có giao dịch nào trong khoảng thời gian đã chọn.
        </td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    Được tạo tự động bởi FinTrack · {{ export_date }}
  </div>

</body>
</html>
"""

# Public API

def generate_pdf(transactions: list[dict[str, Any]]) -> bytes:
    """
    Render the HTML template with transaction data and return a PDF byte string.

    Each transaction dict must contain:
        amount (int/float), type (str), transactionDate (ISO str),
        category (str), wallet (str), merchant (str), note (str)
    """
# Enrich rows
    enriched: list[dict[str, Any]] = []
    total_income  = 0.0
    total_expense = 0.0

    for t in transactions:
        amount = float(t.get("amount", 0))
        tx_type = t.get("type", "EXPENSE")

        # Parse ISO date → Vietnamese locale string (dd/mm/yyyy)
        try:
            dt = datetime.fromisoformat(t["transactionDate"].replace("Z", "+00:00"))
            date_str = dt.strftime("%d/%m/%Y")
        except (KeyError, ValueError):
            date_str = ""

        if tx_type == "INCOME":
            total_income += amount
        else:
            total_expense += amount

        enriched.append({
            **t,
            "amount":   amount,
            "date_str": date_str,
        })

    net = total_income - total_expense
    export_date = datetime.now().strftime("%d/%m/%Y %H:%M")

# Render template
    template = Template(_HTML_TEMPLATE)
    html_str = template.render(
        transactions=enriched,
        export_date=export_date,
        total_income=total_income,
        total_expense=total_expense,
        net=net,
    )

# Generate PDF
    return HTML(string=html_str).write_pdf()
