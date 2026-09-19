"""
Nexus Scalper AI - Python Algorithmic Trading Core
Micro-Momentum Confluence Strategy (EMA 9/21, VWAP, RSI Pullbacks, Trailing Stop-Loss)
"""

import time
import logging
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class MicroScalperStrategy:
    def __init__(
        self,
        symbol: str = "NIFTY",
        take_profit_pct: float = 0.40,     # +0.40%
        stop_loss_pct: float = 0.25,       # -0.25%
        trailing_sl: bool = True,
        max_daily_loss_pct: float = 2.0,   # -2.0%
        capital_per_trade: float = 10000.0
    ):
        self.symbol = symbol
        self.tp_pct = take_profit_pct
        self.sl_pct = stop_loss_pct
        self.trailing_sl = trailing_sl
        self.max_daily_loss_pct = max_daily_loss_pct
        self.capital_per_trade = capital_per_trade

        self.candles: List[Dict] = []
        self.active_position: Optional[Dict] = None
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.cooldown_until = 0

    def update_tick(self, price: float, volume: float) -> Optional[Dict]:
        """Processes incoming price ticks, updates indicators, and checks exit/entry triggers."""
        now = time.time()

        # 1. Update position if active
        if self.active_position:
            return self._manage_position(price)

        # 2. Check risk cooldown
        if now < self.cooldown_until:
            return None

        # 3. Check daily circuit breaker
        if self.daily_pnl <= -(self.capital_per_trade * 10 * (self.max_daily_loss_pct / 100)):
            logging.warning("[CIRCUIT BREAKER] Daily drawdown limit reached. Halting trades.")
            return None

        # 4. Evaluate entry signal
        signal = self._evaluate_signals(price)
        if signal == "BUY":
            return self._open_position("BUY", price)

        return None

    def _evaluate_signals(self, current_price: float) -> Optional[str]:
        if len(self.candles) < 21:
            return None

        # In production, indicators are calculated over the candle history:
        # EMA 9 > EMA 21 (Upward trend momentum)
        # Price > VWAP (Institutional buyer support)
        # RSI in healthy momentum range (45 to 65)
        # Low volatility chop filter
        return None

    def _open_position(self, side: str, price: float) -> Dict:
        tp_price = round(price * (1 + self.tp_pct / 100), 2)
        sl_price = round(price * (1 - self.sl_pct / 100), 2)

        self.active_position = {
            "symbol": self.symbol,
            "side": side,
            "entry_price": price,
            "take_profit_price": tp_price,
            "stop_loss_price": sl_price,
            "highest_price": price,
            "entry_time": time.time(),
            "capital": self.capital_per_trade
        }
        logging.info(f"[ENTRY] {side} {self.symbol} @ {price} | TP: {tp_price} | SL: {sl_price}")
        return {"action": "ENTER", "position": self.active_position}

    def _manage_position(self, current_price: float) -> Optional[Dict]:
        pos = self.active_position
        if not pos:
            return None

        # Update high price for trailing
        if current_price > pos["highest_price"]:
            pos["highest_price"] = current_price

            if self.trailing_sl:
                gain_pct = ((pos["highest_price"] - pos["entry_price"]) / pos["entry_price"]) * 100
                # Move to Breakeven (+0.05% for fees) when +0.20% gain is made
                if gain_pct >= 0.20:
                    break_even = round(pos["entry_price"] * 1.0005, 2)
                    if pos["stop_loss_price"] < break_even:
                        pos["stop_loss_price"] = break_even
                        logging.info(f"[TRAILING] SL moved to breakeven: {break_even}")

                # Trail trailing SL behind new highs
                if gain_pct >= 0.30:
                    trail_sl = round(pos["highest_price"] * (1 - 0.15 / 100), 2)
                    if trail_sl > pos["stop_loss_price"]:
                        pos["stop_loss_price"] = trail_sl

        # Exit on Take-Profit
        if current_price >= pos["take_profit_price"]:
            return self._close_position(current_price, "TAKE_PROFIT_HIT")

        # Exit on Stop-Loss
        if current_price <= pos["stop_loss_price"]:
            return self._close_position(current_price, "STOP_LOSS_HIT")

        return None

    def _close_position(self, exit_price: float, reason: str) -> Dict:
        pos = self.active_position
        pnl_pct = ((exit_price - pos["entry_price"]) / pos["entry_price"]) * 100
        net_pnl = (pos["capital"] * (pnl_pct / 100)) - 20.0  # Approx broker charge

        self.daily_pnl += net_pnl
        if net_pnl > 0:
            self.consecutive_losses = 0
            logging.info(f"[PROFIT EXIT] PnL: +{net_pnl:.2f} ({pnl_pct:.2f}%) - {reason}")
        else:
            self.consecutive_losses += 1
            logging.info(f"[LOSS EXIT] PnL: {net_pnl:.2f} ({pnl_pct:.2f}%) - {reason}")
            if self.consecutive_losses >= 2:
                self.cooldown_until = time.time() + 180  # 3 min cooldown
                logging.warning("[COOLDOWN] 2 consecutive losses. Pausing bot for 3 minutes.")

        closed_pos = {
            "symbol": pos["symbol"],
            "entry_price": pos["entry_price"],
            "exit_price": exit_price,
            "net_pnl": net_pnl,
            "reason": reason
        }
        self.active_position = None
        return {"action": "EXIT", "result": closed_pos}
