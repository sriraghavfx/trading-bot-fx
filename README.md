# ⚡ Raghav Forex Scalper AI - High-Frequency Trading Terminal

Raghav Forex Scalper AI is an automated, high-speed algorithmic scalping system designed specifically for international Forex and Precious Metal markets (**EUR/USD, GBP/USD, USD/JPY, Gold / XAU/USD**). It captures micro-pip price fluctuations (3 to 6 pips), enters rapidly, and exits with strict profit targets and risk protection.

---

## 🚀 Quick Launch (Zero-Install Browser App)

You can launch the trading application instantly in any modern web browser (Google Chrome or Microsoft Edge):

1. **Desktop Shortcut**: Double-click **`⚡ Raghav Forex Scalper.bat`** on your Desktop.
   - Or open: [`index.html`](file:///C:/Users/srira/Desktop/Raghav_Trading_Bot/index.html)
2. **Start Scalping**: Click the green **"▶ START FOREX SCALPER"** button.
3. The bot immediately analyzes live 5-decimal tick streams and executes automated micro-scalp orders!

---

## 🎯 Core Scalping Strategy & Risk Fundamentals

### 1. Rapid Micro-Pip Execution
- **Take-Profit Target (TP)**: `5.0 Pips` (Configurable from 2.0 to 15.0 pips). Captures small market impulses and locks in gains instantly.
- **Strict Stop-Loss (SL)**: `3.0 Pips` (Configurable from 1.5 to 8.0 pips). Prevents severe drawdowns by cutting adverse price moves immediately.
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
   - One-click **"EMERGENCY EXIT"** closes all open positions immediately and halts the bot.

---

## 🔌 MetaTrader 5 (MT5) Live Broker Connection

- The [`mt5_forex_connector.py`](file:///C:/Users/srira/Desktop/Raghav_Trading_Bot/mt5_forex_connector.py) script bridges the algorithm to any live MT5 Forex broker account (**Exness, XM Global, IC Markets, OctaFX, Pepperstone**, etc.).
- Orders are submitted with server-side Stop Loss and Take Profit, ensuring execution protection even during local internet interruptions.
- Live credentials can be configured directly inside the application via the **`🔑 CONNECT MT5 LIVE`** modal or saved in [`account_config.json`](file:///C:/Users/srira/Desktop/Raghav_Trading_Bot/account_config.json).

---

## 📁 Repository Structure

- `index.html` - Professional dark-mode trading terminal UI.
- `styles.css` - Responsive financial terminal styling.
- `chart_engine.js` - High-performance 60 FPS Canvas candlestick, EMA, VWAP, and RSI chart.
- `scalper_bot.js` - Algorithmic execution engine, risk controls, and live tick stream.
- `mt5_forex_connector.py` - Official MetaTrader 5 Python bridge.
- `strategy_engine.py` - Core momentum confluence logic.
- `broker_connectors.py` - Modular broker interfaces.
- `account_config.json` - Secure account connection parameters.
- `Start_Raghav_Bot.bat` - 1-click terminal launcher.
- `Install_MetaTrader5.bat` - 1-click MT5 setup script.
- `.gitignore` - Protects sensitive files and excludes binary installers.
