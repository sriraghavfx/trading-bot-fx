"""
Nexus Forex Scalper AI - MetaTrader 5 (MT5) Auto-Execution Connector
Works with any MT5 Forex Broker (Exness, IC Markets, XM, Pepperstone, etc.)
Handles Micro-pip TP, Strict Stop-Loss, and Trailing Stop modifications.
"""

import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    logging.warning("MetaTrader5 python module not installed. Running in simulation mode.")


class MT5ForexConnector:
    def __init__(self, login: int = 0, password: str = "", server: str = ""):
        self.login = login
        self.password = password
        self.server = server
        self.is_connected = False

    def connect(self) -> bool:
        """Initializes connection to MT5 terminal."""
        if not MT5_AVAILABLE:
            logging.info("[SIMULATION] MT5 Connector running in mock mode.")
            self.is_connected = True
            return True

        if not mt5.initialize():
            logging.error(f"MT5 initialize failed, error code: {mt5.last_error()}")
            return False

        if self.login and self.password and self.server:
            authorized = mt5.login(self.login, password=self.password, server=self.server)
            if not authorized:
                logging.error(f"Failed to connect to MT5 account #{self.login}, error: {mt5.last_error()}")
                return False

        self.is_connected = True
        logging.info("Connected successfully to MetaTrader 5!")
        return True

    def get_symbol_info(self, symbol: str):
        """Retrieves pip point size, bid, ask, and spread."""
        if not MT5_AVAILABLE:
            return {"bid": 1.08450, "ask": 1.08456, "point": 0.00001, "digits": 5, "spread": 0.6}

        info = mt5.symbol_info_tick(symbol)
        sym_data = mt5.symbol_info(symbol)
        if not info or not sym_data:
            return None

        spread_pips = (info.ask - info.bid) / (sym_data.point * 10)
        return {
            "bid": info.bid,
            "ask": info.ask,
            "point": sym_data.point,
            "digits": sym_data.digits,
            "spread": spread_pips
        }

    def place_scalp_order(self, symbol: str, order_type: str, lot_size: float = 0.10, tp_pips: float = 5.0, sl_pips: float = 3.0):
        """
        Places an ultra-fast market order on MT5 with immediate TP and SL set at the broker level.
        Setting SL at the broker level guarantees stop execution even during internet disconnects!
        """
        if not self.is_connected:
            logging.error("Not connected to MT5.")
            return None

        sym_info = self.get_symbol_info(symbol)
        if not sym_info:
            logging.error(f"Symbol {symbol} not found.")
            return None

        pip_factor = sym_info["point"] * 10
        digits = sym_info["digits"]

        if order_type == "BUY":
            price = sym_info["ask"]
            sl = round(price - (sl_pips * pip_factor), digits)
            tp = round(price + (tp_pips * pip_factor), digits)
            mt5_type = 0 # mt5.ORDER_TYPE_BUY
        else:
            price = sym_info["bid"]
            sl = round(price + (sl_pips * pip_factor), digits)
            tp = round(price - (tp_pips * pip_factor), digits)
            mt5_type = 1 # mt5.ORDER_TYPE_SELL

        logging.info(f"[MT5 EXECUTION] {order_type} {symbol} | Lots: {lot_size} | Price: {price} | SL: {sl} (-{sl_pips} pips) | TP: {tp} (+{tp_pips} pips)")

        if not MT5_AVAILABLE:
            return {"status": "MOCK_SUCCESS", "price": price, "sl": sl, "tp": tp}

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": lot_size,
            "type": mt5_type,
            "price": price,
            "sl": sl,
            "tp": tp,
            "deviation": 10,
            "magic": 998877,
            "comment": "Nexus Forex Scalper AI",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logging.error(f"Order failed with retcode: {result.retcode}")
            return None

        logging.info(f"Order executed successfully on MT5, Ticket #{result.order}")
        return result

    def modify_trailing_sl(self, ticket: int, symbol: str, new_sl: float):
        """Moves Stop Loss to Breakeven or trails profit on MT5 server."""
        if not MT5_AVAILABLE:
            logging.info(f"[SIMULATION] Trailing SL updated for Ticket #{ticket} to {new_sl}")
            return True

        request = {
            "action": mt5.TRADE_ACTION_SLTP,
            "position": ticket,
            "symbol": symbol,
            "sl": new_sl
        }
        res = mt5.order_send(request)
        return res.retcode == mt5.TRADE_RETCODE_DONE


if __name__ == "__main__":
    bot = MT5ForexConnector()
    bot.connect()
    print("MT5 Forex Scalper Ready.")
