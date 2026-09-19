# ⚡ Raghav Forex Scalper AI - High-Frequency Trading Terminal

Raghav Forex Scalper AI is an automated, high-speed algorithmic scalping system designed specifically for international Forex and Precious Metal markets (**EUR/USD, GBP/USD, USD/JPY, Gold / XAU/USD**). It captures micro-pip price fluctuations (3 to 6 pips), enters rapidly, and exits with strict profit targets, stop-loss protection, and direct execution into your **MetaTrader 5 (MT5)** desktop terminal.

---

## 🚀 How to Run Live Trading with MetaTrader 5

You can trade live directly on your MetaTrader 5 broker account:

1. **Launch the Bot**:
   - Double-click **`⚡ Start Raghav MT5 Scalper.bat`** on your Desktop.
   - (Or run `Start_Live_MT5_Bot.bat` in `C:\Users\srira\Desktop\Raghav_Trading_Bot\`).
2. **Web Terminal Opens Automatically**:
   - The terminal loads in your browser at `http://127.0.0.1:5000/`.
   - The top header will display **`🟢 MT5 LINKED (LIVE)`** showing your live balance and equity.
3. **Connect Your Live Broker Account**:
   - Click **`🔑 CONNECT MT5 LIVE`** in the header.
   - Enter your MT5 Account Number, Password, and Broker Server (e.g., `Exness-Real`, `ICMarkets-Live`, `XMGlobal-Real`).
   - Credentials are stored securely on your local machine and never hardcoded.
4. **Start Automated Scalping**:
   - Switch the mode badge to **`🔴 LIVE MT5`**.
   - Click the green **"▶ START FOREX SCALPER"** button.
   - As soon as market conditions align (RSI, EMA 9/21, MACD), the bot submits real market orders directly into your MetaTrader 5 terminal with broker-side Stop Loss and Take Profit!
5. **Manual 1-Click Execution**:
   - You can also click **`▲ BUY MARKET`** or **`▼ SELL MARKET`** for immediate 1-click execution into MT5.

---

## 🎯 Core Scalping Strategy & Risk Fundamentals

### 1. Rapid Micro-Pip Execution
- **Take-Profit Target (TP)**: `5.0 Pips` (Captures small market impulses and locks in gains instantly).
- **Strict Stop-Loss (SL)**: `3.0 Pips` (Prevents severe drawdowns by cutting adverse price moves immediately).
- **Dynamic Trailing Stop-Loss**:
  - Once a trade reaches `+2.5 Pips` in profit, the Stop-Loss automatically shifts to **Breakeven (+0.5 Pip)** to eliminate downside risk and cover broker fees.
  - As price climbs higher, the SL trails the peak price by `1.8 Pips`, maximizing micro-surge gains.

### 2. Spread Protection Filter
- Wide broker spreads can eat away scalping returns.
- The engine continuously monitors the live Bid/Ask spread. If the spread exceeds `1.2 Pips`, trade entries are automatically paused.

### 3. Lot Sizing & Pip Valuation (USD)
- **0.01 Micro Lot**: 1 Pip = `$0.10` (Safest for small balances)
- **0.10 Mini Lot**: 1 Pip = `$1.00` (Recommended: 5 Pips = `$5.00` profit)
- **1.00 Standard Lot**: 1 Pip = `$10.00` (5 Pips = `$50.00` profit)

---

## 🛡️ Circuit Breakers & Capital Protection

1. **Max Daily Loss Limit (`-$50.00`)**:
   - The bot automatically halts all trading if daily losses reach the configured limit to protect principal balance.
2. **Consecutive Loss Cooldown**:
   - If 2 consecutive losses occur, the bot pauses for 3 minutes to avoid choppy whipsaw markets.
3. **Emergency Panic Button**:
   - One-click **"EMERGENCY EXIT"** closes all open positions immediately in MT5 and halts the bot.

---

## 📁 Repository Structure

- `index.html` - Professional dark-mode trading terminal UI with MT5 status badges.
- `styles.css` - Responsive financial terminal styling.
- `chart_engine.js` - High-performance 60 FPS Canvas candlestick, EMA, VWAP, and RSI chart.
- `scalper_bot.js` - Algorithmic execution engine, MT5 API client, and risk controls.
- `mt5_live_server.py` - Local Python bridge connecting web UI to MetaTrader 5 desktop terminal.
- `Start_Live_MT5_Bot.bat` - 1-click launcher for the live bridge server and browser terminal.
- `mt5_forex_connector.py` - Official MetaTrader 5 Python connector library.
- `strategy_engine.py` - Core momentum confluence logic.
- `broker_connectors.py` - Modular broker interfaces.
- `account_config.json` - Account connection template.
- `Install_MetaTrader5.bat` - MT5 automated installer script.
- `.gitignore` - Protects sensitive configuration files.
