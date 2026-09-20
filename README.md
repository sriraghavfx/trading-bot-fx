# ⚡ Raghav Forex Scalper AI - High-Frequency Trading Terminal

Raghav Forex Scalper AI is an automated, high-speed algorithmic scalping system designed specifically for international Forex and Precious Metal markets (**EUR/USD, GBP/USD, USD/JPY, Gold / XAU/USD**). It captures micro-pip price fluctuations (3 to 6 pips), enters rapidly, and exits with strict profit targets, stop-loss protection, and direct execution into your **MetaTrader 5 (MT5)** desktop terminal.

---

## 🚀 Dual Mode: Demo & Live Trading with MetaTrader 5

You can run the bot in **Demo Mode** (zero risk) or **Live Mode** (real money):

### 1. 🧪 Connect MT5 Demo Broker Account (Practice Mode)
- Click **`🧪 CONNECT DEMO`** in the header.
- Select your demo broker (e.g., `MetaQuotes-Demo`, `Exness-MT5Trial`, `XMGlobal-Demo`, `ICMarketsSC-Demo`, `Octa-Demo`).
- Enter your **MT5 Demo Account Number**, **Password**, and **Server**.
- The bot connects to MT5 and executes automated scalping orders using **virtual broker funds** with live broker ticks!

### 2. ⚡ 1-Click Instant Paper Demo ($10,000 Virtual Capital)
- Click **`🧪 CONNECT DEMO`** &rarr; select **`⚡ 1-CLICK PAPER DEMO`**.
- Click **`Activate Instant Paper Demo`** to trade immediately with $10,000 virtual balance.
- **Zero broker login required**: runs high-speed client-side simulation.

### 3. 🔴 Connect Real Live MT5 Account (Real Money)
- Click **`🔑 CONNECT MT5 LIVE`** in the header.
- Enter your live broker login, password, and server.
- Switch the mode badge to **`🔴 LIVE MT5`**.
- The bot executes real market orders in MT5 with strict 3-Pip Stop Loss & 5-Pip Take Profit.

### 4. How to Launch
1. Double-click **`Start_Raghav_MT5_Scalper.bat`** on your Desktop.
2. The terminal automatically opens in your browser at `http://127.0.0.1:5000/`.
3. Choose **DEMO** or **LIVE**, then click **`▶ START FOREX SCALPER`**!

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
