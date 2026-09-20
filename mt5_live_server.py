"""
Raghav Forex Scalper AI - MetaTrader 5 (MT5) Live Server Bridge
Bridges the Web Trading Terminal directly to the MetaTrader 5 Desktop Application.
Provides live tick streaming, real account balance/equity, and live order execution.
"""

import os
import json
import time
import logging
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

try:
    import MetaTrader5 as mt5
    MT5_INSTALLED = True
except ImportError:
    MT5_INSTALLED = False

PORT = 5000
WEB_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MT5_PATH = r"C:\Program Files\MetaTrader 5\terminal64.exe"


def ensure_mt5():
    """Ensure MT5 is initialized without hanging."""
    if not MT5_INSTALLED:
        return False
    try:
        terminal = mt5.terminal_info()
        if terminal is not None:
            return True
        if os.path.exists(DEFAULT_MT5_PATH):
            return mt5.initialize(path=DEFAULT_MT5_PATH, timeout=3000)
        return mt5.initialize(timeout=3000)
    except Exception as e:
        logging.warning(f"MT5 initialization attempt notice: {e}")
        return False


def get_filling_mode(sym_info):
    """Detect the appropriate filling mode supported by the broker for this symbol."""
    if not sym_info:
        return mt5.ORDER_FILLING_IOC
    mode = getattr(sym_info, "filling_mode", 0)
    if mode & 2:  # SYMBOL_FILLING_IOC
        return mt5.ORDER_FILLING_IOC
    elif mode & 1:  # SYMBOL_FILLING_FOK
        return mt5.ORDER_FILLING_FOK
    elif mode & 4:  # SYMBOL_FILLING_RETURN
        return mt5.ORDER_FILLING_RETURN
    return mt5.ORDER_FILLING_IOC


class MT5BridgeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/api/status":
            self._handle_status()
        elif path == "/api/account":
            self._handle_account()
        elif path == "/api/price":
            symbol = query.get("symbol", ["EURUSD"])[0]
            self._handle_price(symbol)
        elif path == "/api/positions":
            self._handle_positions()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"

        try:
            payload = json.loads(post_data)
        except Exception:
            payload = {}

        if path == "/api/connect":
            self._handle_connect(payload)
        elif path == "/api/order":
            self._handle_order(payload)
        elif path == "/api/close":
            self._handle_close(payload)
        else:
            self._send_json({"error": "Unknown endpoint"}, status=404)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _handle_status(self):
        if not MT5_INSTALLED:
            self._send_json({"connected": False, "error": "MetaTrader5 package not installed"})
            return

        is_ready = ensure_mt5()
        if not is_ready:
            self._send_json({
                "connected": False,
                "error": "MT5 terminal not running. Please open MetaTrader 5."
            })
            return

        account = mt5.account_info()
        terminal = mt5.terminal_info()

        trade_mode_str = "DEMO"
        if account:
            mode_val = getattr(account, "trade_mode", 0)
            trade_mode_str = "REAL" if mode_val == 2 else "DEMO"

        self._send_json({
            "connected": True,
            "account": {
                "login": account.login if account else None,
                "name": account.name if account else "User",
                "server": account.server if account else "Local MT5",
                "balance": account.balance if account else 10000.0,
                "equity": account.equity if account else 10000.0,
                "margin": account.margin if account else 0.0,
                "free_margin": account.margin_free if account else 10000.0,
                "currency": account.currency if account else "USD",
                "trade_mode": trade_mode_str,
                "trade_allowed": terminal.trade_allowed if terminal else False
            } if account else None
        })

    def _handle_account(self):
        if not ensure_mt5():
            self._send_json({"connected": False, "error": "MT5 offline"})
            return
        account = mt5.account_info()
        if account:
            mode_val = getattr(account, "trade_mode", 0)
            trade_mode_str = "REAL" if mode_val == 2 else "DEMO"
            self._send_json({
                "login": account.login,
                "server": account.server,
                "balance": account.balance,
                "equity": account.equity,
                "currency": account.currency,
                "trade_mode": trade_mode_str
            })
        else:
            self._send_json({"error": "No active MT5 account"})

    def _handle_connect(self, payload):
        if not MT5_INSTALLED:
            self._send_json({"success": False, "error": "MT5 library missing"}, status=500)
            return

        login = int(payload.get("login", 0))
        password = str(payload.get("password", ""))
        server = str(payload.get("server", ""))

        if not ensure_mt5():
            self._send_json({"success": False, "error": f"Failed to initialize MT5: {mt5.last_error()}"})
            return

        authorized = mt5.login(login, password=password, server=server)
        if authorized:
            account = mt5.account_info()
            mode_val = getattr(account, "trade_mode", 0) if account else 0
            trade_mode_str = "REAL" if mode_val == 2 else "DEMO"
            logging.info(f"Connected to MT5 Account #{login} ({trade_mode_str}) on {server} successfully.")
            self._send_json({
                "success": True,
                "account": {
                    "login": account.login,
                    "server": account.server,
                    "balance": account.balance,
                    "equity": account.equity,
                    "currency": account.currency,
                    "trade_mode": trade_mode_str
                }
            })
        else:
            error = mt5.last_error()
            logging.error(f"MT5 login failed for #{login}: {error}")
            self._send_json({"success": False, "error": f"Login failed: {error}"})

    def _handle_price(self, symbol):
        if not ensure_mt5():
            self._send_json({"error": "MT5 offline"})
            return

        mt5.symbol_select(symbol, True)
        tick = mt5.symbol_info_tick(symbol)
        sym_info = mt5.symbol_info(symbol)

        if not tick or not sym_info:
            self._send_json({"error": f"Symbol {symbol} tick not available"})
            return

        pip_factor = sym_info.point * 10 if (sym_info.digits == 3 or sym_info.digits == 5) else sym_info.point
        spread_pips = round((tick.ask - tick.bid) / pip_factor, 1) if pip_factor > 0 else 0.5

        rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M1, 0, 50)
        candles = []
        if rates is not None:
            for r in rates:
                candles.append({
                    "time": int(r["time"]) * 1000,
                    "open": float(r["open"]),
                    "high": float(r["high"]),
                    "low": float(r["low"]),
                    "close": float(r["close"]),
                    "volume": int(r["tick_volume"])
                })

        self._send_json({
            "symbol": symbol,
            "bid": tick.bid,
            "ask": tick.ask,
            "spread": spread_pips,
            "digits": sym_info.digits,
            "point": sym_info.point,
            "candles": candles
        })

    def _handle_order(self, payload):
        if not ensure_mt5():
            self._send_json({"success": False, "error": "MT5 offline"})
            return

        symbol = payload.get("symbol", "EURUSD")
        side = payload.get("side", "BUY").upper()
        lots = float(payload.get("lots", 0.10))
        tp_pips = float(payload.get("tp_pips", 5.0))
        sl_pips = float(payload.get("sl_pips", 3.0))

        mt5.symbol_select(symbol, True)
        sym_info = mt5.symbol_info(symbol)
        tick = mt5.symbol_info_tick(symbol)

        if not sym_info or not tick:
            self._send_json({"success": False, "error": f"Failed to get info for {symbol}"})
            return

        pip_factor = sym_info.point * 10 if (sym_info.digits == 3 or sym_info.digits == 5) else sym_info.point
        digits = sym_info.digits

        if side == "BUY":
            order_type = mt5.ORDER_TYPE_BUY
            price = tick.ask
            sl = round(price - (sl_pips * pip_factor), digits)
            tp = round(price + (tp_pips * pip_factor), digits)
        else:
            order_type = mt5.ORDER_TYPE_SELL
            price = tick.bid
            sl = round(price + (sl_pips * pip_factor), digits)
            tp = round(price - (tp_pips * pip_factor), digits)

        filling = get_filling_mode(sym_info)

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": lots,
            "type": order_type,
            "price": price,
            "sl": sl,
            "tp": tp,
            "deviation": 10,
            "magic": 998877,
            "comment": "Raghav Scalper AI",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": filling,
        }

        result = mt5.order_send(request)

        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logging.info(f"LIVE ORDER PLACED IN MT5: {side} {symbol} @ {price} | Ticket #{result.order}")
            self._send_json({
                "success": True,
                "ticket": result.order,
                "symbol": symbol,
                "side": side,
                "lots": lots,
                "price": price,
                "sl": sl,
                "tp": tp
            })
        else:
            err_code = result.retcode if result else mt5.last_error()
            err_comment = result.comment if result else "Unknown error"
            logging.error(f"Failed to place order in MT5: {err_code} - {err_comment}")
            self._send_json({"success": False, "error": f"MT5 Error {err_code}: {err_comment}"})

    def _handle_close(self, payload):
        if not ensure_mt5():
            self._send_json({"success": False, "error": "MT5 offline"})
            return

        ticket = int(payload.get("ticket", 0))
        positions = mt5.positions_get(ticket=ticket)
        if not positions:
            self._send_json({"success": False, "error": f"Position #{ticket} not found or already closed"})
            return

        pos = positions[0]
        symbol = pos.symbol
        mt5.symbol_select(symbol, True)
        tick = mt5.symbol_info_tick(symbol)
        sym_info = mt5.symbol_info(symbol)

        close_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
        close_price = tick.bid if pos.type == mt5.ORDER_TYPE_BUY else tick.ask
        filling = get_filling_mode(sym_info)

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": pos.volume,
            "type": close_type,
            "position": ticket,
            "price": close_price,
            "deviation": 10,
            "magic": 998877,
            "comment": "Raghav Scalper Close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": filling,
        }

        result = mt5.order_send(request)
        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logging.info(f"Position #{ticket} closed successfully in MT5.")
            self._send_json({"success": True, "ticket": ticket, "close_price": close_price})
        else:
            self._send_json({"success": False, "error": f"Close failed: {result.retcode if result else mt5.last_error()}"})

    def _handle_positions(self):
        if not ensure_mt5():
            self._send_json([])
            return

        positions = mt5.positions_get()
        result = []
        if positions:
            for p in positions:
                result.append({
                    "ticket": p.ticket,
                    "symbol": p.symbol,
                    "type": "BUY" if p.type == mt5.ORDER_TYPE_BUY else "SELL",
                    "volume": p.volume,
                    "open_price": p.price_open,
                    "current_price": p.price_current,
                    "sl": p.sl,
                    "tp": p.tp,
                    "profit": p.profit,
                    "time": p.time
                })
        self._send_json(result)


def start_server():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, MT5BridgeHandler)
    logging.info(f"============================================================")
    logging.info(f"  ⚡ RAGHAV FOREX SCALPER AI - MT5 LIVE BRIDGE SERVER ⚡")
    logging.info(f"  Server URL : http://127.0.0.1:{PORT}/")
    logging.info(f"  MT5 Desktop: C:\\Program Files\\MetaTrader 5\\terminal64.exe")
    logging.info(f"  Execution  : Real-time orders, TP/SL, Trailing Stop")
    logging.info(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logging.info("Server stopped.")
    finally:
        if MT5_INSTALLED:
            try:
                mt5.shutdown()
            except Exception:
                pass


if __name__ == "__main__":
    start_server()
