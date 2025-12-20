# Import Formats Specification

## Overview

The application imports data from three sources:
1. **Schwab** - Brokerage account positions (CSV)
2. **Seeking Alpha** - Watchlist exports (Excel)
3. **Motley Fool** - Scorecard exports (CSV)

---

## 1. Schwab Position Export

### File Format
- **Type:** CSV
- **Encoding:** UTF-8 with BOM
- **Quote style:** All fields quoted

### File Structure

```csv
"Positions for account My Roth IRA ... as of 04:41 PM ET, 2025/12/17"

"Symbol","Description","","Price","Ratings","Qty (Quantity)",...
"ALL","ALLSTATE CORP","N/A","$209.08","A","200",...
...
"Cash & Cash Investments","--","--","--","--","--",...
"Account Total","","--","--","--","--",...
```

### Parsing Rules

1. **Line 1:** Header with account name and timestamp
   - Extract account name: `"Positions for account (.+?) \.\.\.(\d+) as of"`
   - Account suffix is the 3 digits after "..."
   
2. **Line 2:** Empty (skip)

3. **Line 3:** Column headers

4. **Lines 4+:** Position data until "Cash & Cash Investments" or "Account Total"

### Fields to Extract

| CSV Column | DB Field | Transform |
|------------|----------|-----------|
| Symbol | symbol | Normalize (uppercase, "/" → ".") |
| Description | company_name | Trim quotes |
| Qty (Quantity) | shares | Parse as float, remove commas |
| Cost Basis | cost_basis | Remove "$" and commas, parse as float |

### Skip Rows
- Symbol = "Cash & Cash Investments"
- Symbol = "Account Total"
- Security Type = "ETFs & Closed End Funds" (optional: make configurable)

### Sample Parser Logic

```javascript
function parseSchwabCSV(content) {
  const lines = content.split('\n');
  
  // Line 1: Extract account info
  const headerMatch = lines[0].match(/Positions for account (.+?) \.\.\.(\d+) as of/);
  const accountName = headerMatch[1];
  const accountSuffix = headerMatch[2];
  
  // Skip to data rows (after column headers)
  const dataLines = lines.slice(3);
  
  const positions = [];
  for (const line of dataLines) {
    const row = parseCSVLine(line);
    const symbol = row[0].replace(/"/g, '');
    
    // Skip non-equity rows
    if (symbol === 'Cash & Cash Investments' || symbol === 'Account Total') continue;
    
    positions.push({
      symbol: normalizeSymbol(symbol),
      company_name: row[1].replace(/"/g, ''),
      shares: parseFloat(row[5].replace(/[",]/g, '')),
      cost_basis: parseFloat(row[9].replace(/["$,]/g, ''))
    });
  }
  
  return { accountName, accountSuffix, positions };
}
```

---

## 2. Seeking Alpha Watchlist Export

### File Format
- **Type:** Excel (.xlsx)
- **Sheets:** Summary, Ratings, Holdings, Dividends

### Sheets to Import

#### Sheet: "Ratings" (Primary)

| Column | Field | Type |
|--------|-------|------|
| A | Symbol | text |
| B | Quant Score | decimal (1-5) |
| C | SA Analysts Score | decimal (1-5) |
| D | Wall St. Score | decimal (1-5) |
| E | Valuation Grade | text (A+ to F) |
| F | Growth Grade | text |
| G | Profitability Grade | text |
| H | Momentum Grade | text |
| I | EPS Revision Grade | text |
| J-N | ETF fields | (ignore - all "-") |

#### Sheet: "Summary" (Secondary - for live data reference)

| Column | Field | Notes |
|--------|-------|-------|
| A | Symbol | text |
| B | Price | decimal |
| C | Change | decimal |
| D | Change % | decimal |
| E | Volume | integer |
| F | Avg. Vol | integer |
| G-L | Day/52W ranges | (pull from API instead) |
| M | Quant Rating | (duplicate of Ratings sheet) |
| N | SA Analyst Ratings | (duplicate) |
| O | Wall Street Ratings | (duplicate) |

### Known Excel Parsing Issue

The Seeking Alpha export uses non-standard conditional formatting operators that cause `openpyxl` to fail. Use the raw XML extraction method:

```bash
# Extract Excel as ZIP
unzip -o export.xlsx -d xlsx_extracted

# Parse shared strings
cat xlsx_extracted/xl/sharedStrings.xml | # extract text values

# Parse sheet data
cat xlsx_extracted/xl/worksheets/sheet2.xml | # Ratings sheet
```

### Symbol-to-Value Mapping

Seeking Alpha uses shared strings. Build a lookup table from `sharedStrings.xml`:
- Index 0 = "Symbol"
- Index 1 = "Price"
- etc.

Then resolve `<v>15</v>` → sharedStrings[15] → "W" (symbol)

---

## 3. Motley Fool Scorecard Export

### File Format
- **Type:** CSV
- **Encoding:** UTF-8 with BOM
- **Has header row:** Yes

### Fields

| CSV Column | DB Field | Type |
|------------|----------|------|
| Symbol | symbol | text |
| Company | company_name | text |
| Allocation | allocation | percentage |
| Rec Date | rec_date | ISO datetime |
| Price | (skip - use live) | - |
| Cost Basis | cost_basis | decimal |
| Return | (skip - calculate) | - |
| Quant: 5Y | quant_5y | decimal |
| Market Cap | (skip - use live) | - |
| Est. Low Return | est_low_return | percentage |
| Est. High Return | est_high_return | percentage |
| Return vs. S&P 500 | (skip - calculate) | - |
| cmaTagLabel | risk_tag | text |
| Est. Max Drawdown | est_max_drawdown | percentage |
| Times Rec'd | times_recommended | integer |
| Sector | sector | text |
| 1Y Rev. Growth | (skip - use live) | - |
| Beta | (skip - use live) | - |
| P/E Ratio | (skip - use live) | - |
| 1Y FCF Growth | fcf_growth_1y | percentage |
| Div Yield | (skip - use live) | - |
| Gross Margin | gross_margin | percentage |
| Change % | (skip - use live) | - |

### Sample Row

```csv
CLS,Celestica,4.326740233,2025-09-22T18:00:00Z,306.5,249.7421451,40.70913034,74.575075,40425152200,-0.7,27.9,36.48138197,Aggressive,-46.83,1,Information Technology,22.08575015,1.7064,57.03,150.6713078,0,11.76063891,-12.78
```

### Date Parsing
- Format: ISO 8601 with timezone (`2025-09-22T18:00:00Z`)
- Store as-is in database

---

## 4. Transaction Log Export

### CSV Format

```csv
Date,Symbol,Type,Shares,Price,Amount,Account,Reason,Watchlist,Notes,URL
2025-12-15,AAPL,BUY,100,150.00,15000.00,My Roth IRA,watchlist_add,Alpha Picks,"Added on SA recommendation",https://seekingalpha.com/...
```

### Excel Format

Same columns with proper formatting:
- Date column as Excel date
- Currency columns as currency
- Hyperlink column for URL

---

## Import Workflow

### UI Flow

1. **Select import type:** Schwab / Seeking Alpha / Motley Fool
2. **Select file(s):** File picker
3. **For watchlist imports:** Select or create watchlist
4. **Preview:** Show what will be imported
5. **Confirm:** Execute import
6. **Summary:** Show counts (added/updated/errors)

### Conflict Resolution

| Scenario | Behavior |
|----------|----------|
| Same symbol, same account | Update shares and cost_basis |
| Same symbol, different account | Add new position |
| Symbol in multiple watchlists | OK - show both on summary |
| Rating update (same watchlist) | Overwrite with newer data |
| Symbol removed from watchlist | Set removed_at timestamp |

### Import Validation

1. **File type validation:** Check extension and MIME type
2. **Required columns:** Verify all required columns present
3. **Symbol validation:** Must match `^[A-Z0-9.]+$` after normalization
4. **Numeric validation:** Shares > 0, cost_basis >= 0
5. **Date validation:** Must be valid ISO date or parseable format

---

## API Endpoints

### POST /api/import/schwab
```json
{
  "file": "<base64 encoded CSV>",
  "filename": "Jim_s_Roth_IRA-Positions-2025-12-17.csv"
}
```

Response:
```json
{
  "success": true,
  "account": {
    "id": 1,
    "name": "My Roth IRA",
    "created": false
  },
  "positions": {
    "added": 5,
    "updated": 12,
    "unchanged": 0
  }
}
```

### POST /api/import/seeking-alpha
```json
{
  "file": "<base64 encoded Excel>",
  "filename": "Alpha_picks_2025-12-17.xlsx",
  "watchlist_id": 1
}
```

### POST /api/import/motley-fool
```json
{
  "file": "<base64 encoded CSV>",
  "filename": "hgsc_scorecard_12DEC2025.csv",
  "watchlist_id": 2
}
```
