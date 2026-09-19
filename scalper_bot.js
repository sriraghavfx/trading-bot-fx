/**
 * Raghav Forex Scalper AI - Forex Pip-Scalper Engine
 * Directly Linked to MetaTrader 5 (MT5) Desktop Application
 * Live Tick Streaming, Real MT5 Order Execution, Strict 3-Pip SL & 5-Pip TP
 */

class ForexScalperEngine {
  constructor() {
    this.isRunning = false;
    this.tradingMode = 'DEMO'; // 'DEMO' or 'LIVE'
    this.pair = 'EURUSD';
    this.currentBid = 1.08450;
    this.currentAsk = 1.08456;
    this.currentSpread = 0.6; // pips
    this.candles = [];
    this.tradeHistory = [];
    this.activeTrade = null;
    this.tradeMarkers = [];
    this.timer = null;

    // MT5 Bridge State
    this.apiBase = (window.location.port === '5000' || window.location.origin.includes('5000')) 
      ? '' 
      : 'http://127.0.0.1:5000';
    this.mt5Online = false;
    this.mt5Account = null;

    try {
      this.liveAccount = JSON.parse(localStorage.getItem('raghav_live_account') || 'null');
    } catch (e) {
      this.liveAccount = null;
    }

    this.config = {
      lotSize: 0.10,            // 0.10 Mini Lot ($1.00 per pip on EUR/USD)
      takeProfitPips: 5.0,      // 5.0 Pips
      stopLossPips: 3.0,        // 3.0 Pips
      useTrailingSL: true,
      maxSpreadPips: 1.2,       // Reject entries if spread > 1.2 pips
      tickSpeedMs: 1000,        // 1-second tick
      maxDailyLossUSD: 50.00,   // Circuit breaker -$50.00
      consecutiveLossesLimit: 2,
      audioEnabled: true
    };

    this.stats = {
      netUSD: 0,
      netPips: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalWinUSD: 0,
      totalLossUSD: 0,
      consecutiveLosses: 0,
      inCooldownUntil: 0
    };

    this.pairProfiles = {
      EURUSD: { basePrice: 1.08450, decimals: 5, pipMult: 10000, volatility: 0.00008, baseSpread: 0.6, name: 'EUR / USD' },
      GBPUSD: { basePrice: 1.29820, decimals: 5, pipMult: 10000, volatility: 0.00010, baseSpread: 0.8, name: 'GBP / USD' },
      USDJPY: { basePrice: 154.350, decimals: 3, pipMult: 100, volatility: 0.015, baseSpread: 0.7, name: 'USD / JPY' },
      XAUUSD: { basePrice: 2580.50, decimals: 2, pipMult: 10, volatility: 0.25, baseSpread: 1.5, name: 'XAU / USD (Gold)' },
      AUDUSD: { basePrice: 0.66520, decimals: 5, pipMult: 10000, volatility: 0.00007, baseSpread: 0.7, name: 'AUD / USD' },
      EURJPY: { basePrice: 167.420, decimals: 3, pipMult: 100, volatility: 0.018, baseSpread: 0.9, name: 'EUR / JPY' }
    };

    this.audioCtx = null;
    this.chart = new TradingChart('tradingChart');

    this.initPair(this.pair);
    this.bindUI();

    // Check MT5 Bridge Server connection immediately
    this.checkMT5Bridge();
    setInterval(() => this.checkMT5Bridge(), 4000);

    this.log('[SYSTEM] Raghav Forex Scalper AI Initialized.');
  }

  async checkMT5Bridge() {
    const tag = document.getElementById('mt5ConnectionTag');
    const balEl = document.getElementById('headerAccountBalance');
    try {
      const res = await fetch(`${this.apiBase}/api/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          if (!this.mt5Online) {
            this.log('[MT5 LINKED] 🟢 MetaTrader 5 Terminal connected! Live orders enabled.');
          }
          this.mt5Online = true;
          this.mt5Account = data.account;
          if (tag) {
            tag.textContent = '🟢 MT5 LINKED (LIVE)';
            tag.style.color = '#00e676';
            tag.style.borderColor = '#00e676';
            tag.style.background = 'rgba(0, 230, 118, 0.15)';
          }
          if (balEl && data.account) {
            balEl.textContent = `| Balance: $${data.account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Equity: $${data.account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
          }
          return;
        }
      }
    } catch (e) {
      // Bridge server not running
    }

    this.mt5Online = false;
    if (tag) {
      tag.textContent = '🟡 STANDALONE (SIM)';
      tag.style.color = '#ffab00';
      tag.style.borderColor = '#ffab00';
      tag.style.background = 'rgba(255, 171, 0, 0.15)';
    }
    if (balEl) {
      balEl.textContent = '';
    }
  }

  initPair(pairKey) {
    this.pair = pairKey;
    const profile = this.pairProfiles[pairKey] || this.pairProfiles.EURUSD;
    this.chart.setPairConfig(profile.decimals, profile.pipMult);

    this.currentBid = profile.basePrice;
    this.currentSpread = profile.baseSpread;
    this.currentAsk = +(this.currentBid + (this.currentSpread / profile.pipMult)).toFixed(profile.decimals);

    this.candles = [];
    this.tradeMarkers = [];
    this.activeTrade = null;

    let p = profile.basePrice;
    const now = Date.now();
    for (let i = 50; i >= 0; i--) {
      const open = p;
      const change = (Math.random() - 0.49) * (profile.volatility * 3);
      const close = +(open + change).toFixed(profile.decimals);
      const high = +(Math.max(open, close) + Math.random() * profile.volatility).toFixed(profile.decimals);
      const low = +(Math.min(open, close) - Math.random() * profile.volatility).toFixed(profile.decimals);
      const volume = Math.floor(150 + Math.random() * 500);

      this.candles.push({
        time: now - i * 5000,
        open, high, low, close, volume
      });
      p = close;
    }

    this.currentBid = p;
    this.currentAsk = +(this.currentBid + (this.currentSpread / profile.pipMult)).toFixed(profile.decimals);
    this.chart.setPrices(this.currentBid, this.currentAsk);

    this.recalculateIndicators();
    this.updateHeaderUI();
    this.chart.setData(this.candles, this.tradeMarkers, this.activeTrade);
  }

  bindUI() {
    const btnToggle = document.getElementById('btnToggleBot');
    btnToggle.addEventListener('click', () => {
      this.toggleBot();
    });

    const modeBadge = document.getElementById('modeBadge');
    const modeDot = document.getElementById('modeDot');
    const modeText = document.getElementById('modeText');

    modeBadge.addEventListener('click', () => {
      if (this.tradingMode === 'DEMO') {
        this.tradingMode = 'LIVE';
        modeBadge.className = 'mode-badge live';
        modeDot.className = 'mode-dot live';
        modeText.textContent = `🔴 LIVE MT5 (${this.mt5Online ? 'CONNECTED' : 'STANDALONE'})`;
        this.log('[MODE] 🔴 LIVE BROKER MODE ACTIVATED. When bot starts, orders are sent to MT5.');
        if (!this.mt5Online) {
          alert('Note: MetaTrader 5 Bridge is not detected. Start "Start_Live_MT5_Bot.bat" on your Desktop to place orders directly into your MT5 application.');
        } else {
          alert('🔴 LIVE MT5 MODE IS ACTIVE!\nAll trade executions will be placed in your MetaTrader 5 terminal in real time.');
        }
      } else {
        this.tradingMode = 'DEMO';
        modeBadge.className = 'mode-badge';
        modeDot.className = 'mode-dot';
        modeText.textContent = 'DEMO ($10,000)';
        this.log('[MODE] 🧪 DEMO PAPER TRADING MODE ACTIVATED.');
      }
    });

    document.getElementById('btnOpenConnectModal').addEventListener('click', () => {
      document.getElementById('accountModal').style.display = 'flex';
    });

    document.getElementById('btnCloseModal').addEventListener('click', () => {
      document.getElementById('accountModal').style.display = 'none';
    });

    document.getElementById('btnSaveLiveAccount').addEventListener('click', async () => {
      const broker = document.getElementById('modalBrokerSelect').value;
      const account = document.getElementById('modalAccountNum').value.trim();
      const password = document.getElementById('modalPassword').value.trim();
      const server = document.getElementById('modalServer').value.trim();

      if (!account) {
        alert('Please enter your MT5 Account Number / Login ID.');
        return;
      }

      this.liveAccount = { broker, account, server };
      localStorage.setItem('raghav_live_account', JSON.stringify(this.liveAccount));

      // Attempt login on local MT5 bridge server if online
      if (this.mt5Online) {
        this.log(`[MT5 BRIDGE] Logging into MT5 Account #${account} on ${server}...`);
        try {
          const res = await fetch(`${this.apiBase}/api/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: account, password, server })
          });
          const data = await res.json();
          if (data.success) {
            this.log(`[MT5 SUCCESS] Logged into MT5 Account #${account}! Balance: $${data.account.balance}`);
            alert(`✅ Connected to MT5 Successfully!\n\nAccount: #${account}\nBalance: $${data.account.balance}\nServer: ${server}`);
          }
        } catch (e) {
          this.log(`[MT5 LOGIN NOTICE] Credentials saved locally.`);
        }
      } else {
        alert(`Account credentials saved locally.\nRun "Start_Live_MT5_Bot.bat" on Desktop to start the live connection.`);
      }

      document.getElementById('accountModal').style.display = 'none';
      this.tradingMode = 'LIVE';
      modeBadge.className = 'mode-badge live';
      modeDot.className = 'mode-dot live';
      modeText.textContent = `LIVE MT5 (#${account})`;
    });

    const btnBuy = document.getElementById('btnManualBuy');
    if (btnBuy) {
      btnBuy.addEventListener('click', () => {
        if (this.activeTrade) {
          alert('A position is already open! Close it before opening another.');
          return;
        }
        this.executeEntry('BUY', this.currentAsk, 'Manual 1-Click Buy Market');
      });
    }

    const btnSell = document.getElementById('btnManualSell');
    if (btnSell) {
      btnSell.addEventListener('click', () => {
        if (this.activeTrade) {
          alert('A position is already open! Close it before opening another.');
          return;
        }
        this.executeEntry('SELL', this.currentBid, 'Manual 1-Click Sell Market');
      });
    }

    const btnBannerClose = document.getElementById('btnBannerClose');
    if (btnBannerClose) {
      btnBannerClose.addEventListener('click', () => {
        if (this.activeTrade) {
          const exitPrice = this.activeTrade.type === 'BUY' ? this.currentBid : this.currentAsk;
          this.closeActiveTrade(exitPrice, 'Manual 1-Click Close');
        }
      });
    }

    document.getElementById('btnKillSwitch').addEventListener('click', () => {
      this.emergencyExit();
    });

    document.getElementById('marketSelect').addEventListener('change', (e) => {
      if (this.activeTrade) {
        if (!confirm('A trade is currently open. Changing pair will close it. Proceed?')) {
          e.target.value = this.pair;
          return;
        }
        this.closeActiveTrade(this.currentBid, 'Manual Pair Switch');
      }
      this.initPair(e.target.value);
    });

    document.getElementById('selectLotSize').addEventListener('change', (e) => {
      this.config.lotSize = parseFloat(e.target.value);
      this.log(`[CONFIG] Lot Size set to: ${this.config.lotSize} Lots ($${(this.config.lotSize * 10).toFixed(2)}/pip)`);
    });

    const inputTP = document.getElementById('inputTakeProfit');
    const valTP = document.getElementById('valTakeProfit');
    inputTP.addEventListener('input', (e) => {
      this.config.takeProfitPips = parseFloat(e.target.value);
      valTP.textContent = `${this.config.takeProfitPips.toFixed(1)} Pips`;
      if (this.activeTrade) {
        const profile = this.pairProfiles[this.pair];
        const isBuy = this.activeTrade.type === 'BUY';
        this.activeTrade.takeProfitPrice = isBuy
          ? +(this.activeTrade.entryPrice + (this.config.takeProfitPips / profile.pipMult)).toFixed(profile.decimals)
          : +(this.activeTrade.entryPrice - (this.config.takeProfitPips / profile.pipMult)).toFixed(profile.decimals);
      }
    });

    const inputSL = document.getElementById('inputStopLoss');
    const valSL = document.getElementById('valStopLoss');
    inputSL.addEventListener('input', (e) => {
      this.config.stopLossPips = parseFloat(e.target.value);
      valSL.textContent = `${this.config.stopLossPips.toFixed(1)} Pips`;
      if (this.activeTrade) {
        const profile = this.pairProfiles[this.pair];
        const isBuy = this.activeTrade.type === 'BUY';
        this.activeTrade.stopLossPrice = isBuy
          ? +(this.activeTrade.entryPrice - (this.config.stopLossPips / profile.pipMult)).toFixed(profile.decimals)
          : +(this.activeTrade.entryPrice + (this.config.stopLossPips / profile.pipMult)).toFixed(profile.decimals);
      }
    });

    document.getElementById('inputTrailingSL').addEventListener('change', (e) => {
      this.config.useTrailingSL = e.target.checked;
    });

    const inputSpread = document.getElementById('inputMaxSpread');
    const valSpread = document.getElementById('valMaxSpread');
    inputSpread.addEventListener('input', (e) => {
      this.config.maxSpreadPips = parseFloat(e.target.value);
      valSpread.textContent = `${this.config.maxSpreadPips.toFixed(1)} Pips`;
    });

    document.getElementById('selectSpeed').addEventListener('change', (e) => {
      this.config.tickSpeedMs = parseInt(e.target.value);
      if (this.isRunning) {
        clearInterval(this.timer);
        this.timer = setInterval(() => this.processTick(), this.config.tickSpeedMs);
      }
    });

    document.getElementById('inputAudioAlerts').addEventListener('change', (e) => {
      this.config.audioEnabled = e.target.checked;
    });

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(target).style.display = 'block';
      });
    });
  }

  toggleBot() {
    this.isRunning = !this.isRunning;
    const btn = document.getElementById('btnToggleBot');
    const badge = document.getElementById('botStatusBadge');

    if (this.isRunning) {
      btn.textContent = '⏹ STOP FOREX SCALPER';
      btn.className = 'btn-toggle-bot running';
      badge.textContent = 'RUNNING';
      badge.className = 'bot-status-badge status-active';
      const modeText = this.tradingMode === 'LIVE' ? '🔴 LIVE MT5 MARKET' : '🧪 DEMO PAPER';
      this.log(`[BOT] Forex Scalper Started in ${modeText} Mode. Micro-pips scanning active...`);
      this.playSound('start');
      this.timer = setInterval(() => this.processTick(), this.config.tickSpeedMs);
    } else {
      btn.textContent = '▶ START FOREX SCALPER';
      btn.className = 'btn-toggle-bot stopped';
      badge.textContent = 'IDLE';
      badge.className = 'bot-status-badge status-idle';
      this.log('[BOT] Forex Scalper Paused.');
      clearInterval(this.timer);
    }
  }

  async processTick() {
    const profile = this.pairProfiles[this.pair];

    // If MT5 Bridge is connected, fetch live prices from MT5
    if (this.mt5Online) {
      try {
        const res = await fetch(`${this.apiBase}/api/price?symbol=${this.pair}`);
        if (res.ok) {
          const data = await res.json();
          if (data.bid && data.ask) {
            this.currentBid = +data.bid.toFixed(profile.decimals);
            this.currentAsk = +data.ask.toFixed(profile.decimals);
            this.currentSpread = data.spread || +(profile.baseSpread);
            this.chart.setPrices(this.currentBid, this.currentAsk);
          }
        }
      } catch (e) {
        // Fallback to Brownian drift simulation
      }
    }

    // Brownian drift tick simulation if MT5 market is closed or standalone
    if (!this.mt5Online) {
      const drift = (Math.random() - 0.49) * profile.volatility;
      this.currentBid = +(this.currentBid + drift).toFixed(profile.decimals);
      this.currentSpread = +(profile.baseSpread + (Math.random() - 0.4) * 0.3).toFixed(1);
      this.currentAsk = +(this.currentBid + (this.currentSpread / profile.pipMult)).toFixed(profile.decimals);
      this.chart.setPrices(this.currentBid, this.currentAsk);
    }

    let currentCandle = this.candles[this.candles.length - 1];
    if (!currentCandle.tickCount) currentCandle.tickCount = 0;
    currentCandle.tickCount++;

    if (currentCandle.tickCount >= 5) {
      currentCandle = {
        time: Date.now(),
        open: this.currentBid,
        high: this.currentBid,
        low: this.currentBid,
        close: this.currentBid,
        volume: Math.floor(100 + Math.random() * 350),
        tickCount: 1
      };
      this.candles.push(currentCandle);
      if (this.candles.length > 90) this.candles.shift();
    } else {
      currentCandle.close = this.currentBid;
      if (this.currentBid > currentCandle.high) currentCandle.high = this.currentBid;
      if (this.currentBid < currentCandle.low) currentCandle.low = this.currentBid;
      currentCandle.volume += Math.floor(15 + Math.random() * 40);
    }

    this.recalculateIndicators();
    this.updateHeaderUI();

    if (Date.now() < this.stats.inCooldownUntil) {
      const remainingSec = Math.ceil((this.stats.inCooldownUntil - Date.now()) / 1000);
      const badge = document.getElementById('botStatusBadge');
      badge.textContent = `COOLDOWN (${remainingSec}s)`;
      badge.className = 'bot-status-badge status-cooldown';
      this.chart.setData(this.candles, this.tradeMarkers, this.activeTrade);
      return;
    } else if (this.isRunning) {
      const badge = document.getElementById('botStatusBadge');
      badge.textContent = 'RUNNING';
      badge.className = 'bot-status-badge status-active';
    }

    if (this.activeTrade) {
      this.manageOpenTrade();
    } else if (this.isRunning) {
      this.evaluateSignal();
    }

    this.chart.setData(this.candles, this.tradeMarkers, this.activeTrade);
    this.updateActivePositionsTable();
  }

  recalculateIndicators() {
    if (this.candles.length < 5) return;
    const profile = this.pairProfiles[this.pair];

    const k9 = 2 / (9 + 1);
    const k21 = 2 / (21 + 1);

    let ema9 = this.candles[0].close;
    let ema21 = this.candles[0].close;
    let cumVolume = 0;
    let cumVolPrice = 0;

    this.candles.forEach((c, i) => {
      if (i > 0) {
        ema9 = c.close * k9 + ema9 * (1 - k9);
        ema21 = c.close * k21 + ema21 * (1 - k21);
      }
      c.ema9 = +ema9.toFixed(profile.decimals);
      c.ema21 = +ema21.toFixed(profile.decimals);

      const typical = (c.high + c.low + c.close) / 3;
      cumVolume += c.volume;
      cumVolPrice += typical * c.volume;
      c.vwap = +(cumVolPrice / cumVolume).toFixed(profile.decimals);
    });

    const period = 14;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < this.candles.length; i++) {
      const diff = this.candles[i].close - this.candles[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);

      if (i >= period) {
        if (i === period) {
          const avgG = gains / period;
          const avgL = losses / period;
          const rs = avgL === 0 ? 100 : avgG / avgL;
          this.candles[i].rsi = +(100 - (100 / (1 + rs))).toFixed(1);
          this.candles[i]._ag = avgG;
          this.candles[i]._al = avgL;
        } else {
          const prev = this.candles[i - 1];
          const curG = diff > 0 ? diff : 0;
          const curL = diff < 0 ? Math.abs(diff) : 0;
          const avgG = (prev._ag * (period - 1) + curG) / period;
          const avgL = (prev._al * (period - 1) + curL) / period;
          const rs = avgL === 0 ? 100 : avgG / avgL;
          this.candles[i].rsi = +(100 - (100 / (1 + rs))).toFixed(1);
          this.candles[i]._ag = avgG;
          this.candles[i]._al = avgL;
        }
      } else {
        this.candles[i].rsi = 50.0;
      }
    }

    const latest = this.candles[this.candles.length - 1];
    document.getElementById('pillEma9').textContent = `EMA 9: ${latest.ema9 || '--'}`;
    document.getElementById('pillEma21').textContent = `EMA 21: ${latest.ema21 || '--'}`;
    document.getElementById('pillVwap').textContent = `VWAP: ${latest.vwap || '--'}`;
    document.getElementById('pillRsi').textContent = `RSI: ${latest.rsi || '--'}`;
  }

  evaluateSignal() {
    if (this.currentSpread > this.config.maxSpreadPips) return;

    const len = this.candles.length;
    if (len < 12) return;

    const current = this.candles[len - 1];
    const prev = this.candles[len - 2];

    const emaBullish = current.ema9 > current.ema21 && prev.ema9 <= prev.ema21;
    const priceAboveVwap = current.close >= current.vwap;
    const rsiGoodBull = current.rsi >= 46 && current.rsi <= 64;

    if (emaBullish && priceAboveVwap && rsiGoodBull) {
      this.executeEntry('BUY', this.currentAsk, 'EMA Cross + VWAP Support + RSI Bullish');
      return;
    }

    const emaBearish = current.ema9 < current.ema21 && prev.ema9 >= prev.ema21;
    const priceBelowVwap = current.close <= current.vwap;
    const rsiGoodBear = current.rsi <= 54 && current.rsi >= 36;

    if (emaBearish && priceBelowVwap && rsiGoodBear) {
      this.executeEntry('SELL', this.currentBid, 'EMA Cross Down + VWAP Resistance + RSI Bearish');
    }
  }

  async executeEntry(side, entryPrice, reason) {
    const profile = this.pairProfiles[this.pair];
    const tpDist = this.config.takeProfitPips / profile.pipMult;
    const slDist = this.config.stopLossPips / profile.pipMult;

    const isBuy = side === 'BUY';
    const takeProfitPrice = isBuy
      ? +(entryPrice + tpDist).toFixed(profile.decimals)
      : +(entryPrice - tpDist).toFixed(profile.decimals);

    const stopLossPrice = isBuy
      ? +(entryPrice - slDist).toFixed(profile.decimals)
      : +(entryPrice + slDist).toFixed(profile.decimals);

    let mt5Ticket = null;

    // Direct Live MT5 Execution Bridge
    if (this.tradingMode === 'LIVE' && this.mt5Online) {
      this.log(`[MT5 BRIDGE] Submitting LIVE order to MT5: ${side} ${this.pair} (${this.config.lotSize} Lots)...`);
      try {
        const orderRes = await fetch(`${this.apiBase}/api/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: this.pair,
            side: side,
            lots: this.config.lotSize,
            tp_pips: this.config.takeProfitPips,
            sl_pips: this.config.stopLossPips
          })
        });
        const orderData = await orderRes.json();
        if (orderData.success) {
          mt5Ticket = orderData.ticket;
          entryPrice = orderData.price || entryPrice;
          this.log(`[MT5 LIVE SUCCESS] Order executed in MT5 Terminal! Ticket #${mt5Ticket} @ ${entryPrice}`);
        } else {
          this.log(`[MT5 ERROR] Order rejected by broker: ${orderData.error}`);
          alert(`MT5 Order Rejected: ${orderData.error}`);
          return;
        }
      } catch (err) {
        this.log(`[MT5 BRIDGE ERROR] Could not reach MT5 Server: ${err.message}`);
      }
    }

    this.activeTrade = {
      id: mt5Ticket ? `MT5-#${mt5Ticket}` : ('FX-' + Math.floor(1000 + Math.random() * 9000)),
      ticket: mt5Ticket,
      time: new Date().toLocaleTimeString(),
      pair: this.pair,
      type: side,
      lotSize: this.config.lotSize,
      entryPrice: entryPrice,
      currentPrice: entryPrice,
      takeProfitPrice: takeProfitPrice,
      stopLossPrice: stopLossPrice,
      highestPrice: entryPrice,
      lowestPrice: entryPrice,
      pipTarget: this.config.takeProfitPips,
      pipSL: this.config.stopLossPips,
      mode: this.tradingMode,
      reason: reason
    };

    this.tradeMarkers.push({
      candleIndex: this.candles.length - 1,
      price: entryPrice,
      type: side
    });

    const modeTag = this.tradingMode === 'LIVE' ? '🔴 [LIVE REAL MONEY]' : '🧪 [DEMO PAPER]';
    this.log(`${modeTag} ${side} ${this.pair} @ ${entryPrice.toFixed(profile.decimals)} | Lots: ${this.config.lotSize} | TP: ${takeProfitPrice} (+${this.config.takeProfitPips}p) | SL: ${stopLossPrice} (-${this.config.stopLossPips}p)`);
    this.playSound('buy');
    this.updateActivePositionsTable();
  }

  manageOpenTrade() {
    const trade = this.activeTrade;
    const profile = this.pairProfiles[this.pair];
    const isBuy = trade.type === 'BUY';

    trade.currentPrice = isBuy ? this.currentBid : this.currentAsk;
    const currentPips = isBuy 
      ? (trade.currentPrice - trade.entryPrice) * profile.pipMult
      : (trade.entryPrice - trade.currentPrice) * profile.pipMult;

    // Trailing Stop Loss
    if (this.config.useTrailingSL) {
      if (isBuy) {
        if (trade.currentPrice > trade.highestPrice) trade.highestPrice = trade.currentPrice;
        const peakPips = (trade.highestPrice - trade.entryPrice) * profile.pipMult;

        if (peakPips >= 2.5) {
          const bePrice = +(trade.entryPrice + (0.5 / profile.pipMult)).toFixed(profile.decimals);
          if (trade.stopLossPrice < bePrice) {
            trade.stopLossPrice = bePrice;
            this.log(`[TRAILING SL] Stop Loss moved to Breakeven (+0.5 pip). Loss prevented!`);
          }
        }
        if (peakPips >= 4.0) {
          const trailPrice = +(trade.highestPrice - (1.8 / profile.pipMult)).toFixed(profile.decimals);
          if (trailPrice > trade.stopLossPrice) {
            trade.stopLossPrice = trailPrice;
          }
        }
      } else {
        if (trade.currentPrice < trade.lowestPrice) trade.lowestPrice = trade.currentPrice;
        const peakPips = (trade.entryPrice - trade.lowestPrice) * profile.pipMult;

        if (peakPips >= 2.5) {
          const bePrice = +(trade.entryPrice - (0.5 / profile.pipMult)).toFixed(profile.decimals);
          if (trade.stopLossPrice > bePrice) {
            trade.stopLossPrice = bePrice;
            this.log(`[TRAILING SL] Stop Loss moved to Breakeven (-0.5 pip). Loss prevented!`);
          }
        }
        if (peakPips >= 4.0) {
          const trailPrice = +(trade.lowestPrice + (1.8 / profile.pipMult)).toFixed(profile.decimals);
          if (trailPrice < trade.stopLossPrice) {
            trade.stopLossPrice = trailPrice;
          }
        }
      }
    }

    const isTakeProfitHit = isBuy 
      ? (trade.currentPrice >= trade.takeProfitPrice) 
      : (trade.currentPrice <= trade.takeProfitPrice);

    if (isTakeProfitHit) {
      this.closeActiveTrade(trade.takeProfitPrice, `🎯 Take-Profit Hit (+${trade.pipTarget} Pips)`);
      return;
    }

    const isStopLossHit = isBuy 
      ? (trade.currentPrice <= trade.stopLossPrice) 
      : (trade.currentPrice >= trade.stopLossPrice);

    if (isStopLossHit) {
      const isProtected = isBuy 
        ? (trade.stopLossPrice >= trade.entryPrice) 
        : (trade.stopLossPrice <= trade.entryPrice);

      const msg = isProtected ? '🛡️ Trailing Stop Profit Protected' : '🛑 Stop-Loss Hit (Tight Loss)';
      this.closeActiveTrade(trade.stopLossPrice, msg);
      return;
    }
  }

  async closeActiveTrade(exitPrice, exitReason) {
    const trade = this.activeTrade;
    if (!trade) return;

    // Send closing order to MetaTrader 5 if real position
    if (trade.ticket && this.mt5Online) {
      try {
        this.log(`[MT5 BRIDGE] Closing MT5 Ticket #${trade.ticket} on broker server...`);
        const closeRes = await fetch(`${this.apiBase}/api/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: trade.ticket, symbol: trade.pair })
        });
        const closeData = await closeRes.json();
        if (closeData.success) {
          this.log(`[MT5 LIVE SUCCESS] Position #${trade.ticket} closed in MT5 Terminal at ${closeData.close_price}`);
          exitPrice = closeData.close_price || exitPrice;
        }
      } catch (err) {
        this.log(`[MT5 ERROR] Could not send close to MT5: ${err.message}`);
      }
    }

    const profile = this.pairProfiles[this.pair];
    const isBuy = trade.type === 'BUY';
    const pipsGained = isBuy 
      ? +((exitPrice - trade.entryPrice) * profile.pipMult).toFixed(1)
      : +((trade.entryPrice - exitPrice) * profile.pipMult).toFixed(1);

    const dollarPerPip = trade.lotSize * 10.0;
    const netUSD = +(pipsGained * dollarPerPip).toFixed(2);

    const record = {
      id: trade.id,
      ticket: trade.ticket,
      time: new Date().toLocaleTimeString(),
      pair: trade.pair,
      type: trade.type,
      lots: trade.lotSize,
      entryPrice: trade.entryPrice,
      exitPrice: exitPrice,
      pips: pipsGained,
      netUSD: netUSD,
      mode: trade.mode || this.tradingMode,
      reason: exitReason,
      isWin: netUSD >= 0
    };

    this.tradeHistory.unshift(record);

    this.stats.totalTrades++;
    this.stats.netUSD += netUSD;
    this.stats.netPips += pipsGained;

    const modeTag = trade.mode === 'LIVE' ? '🔴 [LIVE REAL MONEY]' : '🧪 [DEMO]';

    if (record.isWin) {
      this.stats.winningTrades++;
      this.stats.totalWinUSD += netUSD;
      this.stats.consecutiveLosses = 0;
      this.log(`${modeTag} ${trade.pair} ${trade.type} WIN! Pips: +${pipsGained} | Profit: +$${netUSD} | ${exitReason}`);
      this.playSound('profit');
    } else {
      this.stats.losingTrades++;
      this.stats.totalLossUSD += Math.abs(netUSD);
      this.stats.consecutiveLosses++;
      this.log(`${modeTag} ${trade.pair} ${trade.type} LOSS: ${pipsGained} pips | -$${Math.abs(netUSD)} | ${exitReason}`);
      this.playSound('loss');

      if (this.stats.consecutiveLosses >= this.config.consecutiveLossesLimit) {
        this.stats.inCooldownUntil = Date.now() + 180000;
        this.log(`[COOLDOWN] 2 consecutive losses. Bot paused for 3 minutes for market stabilization.`);
      }
    }

    if (this.stats.netUSD <= -this.config.maxDailyLossUSD) {
      this.log(`[PANIC SHUTDOWN] Daily Loss Limit reached (-$${this.config.maxDailyLossUSD}). Bot stopped to preserve capital!`);
      this.toggleBot();
    }

    this.tradeMarkers.push({
      candleIndex: this.candles.length - 1,
      price: exitPrice,
      type: isBuy ? 'SELL' : 'BUY'
    });

    this.activeTrade = null;
    this.updateStatsUI();
    this.updateTradeHistoryTable();
    this.updateActivePositionsTable();
  }

  emergencyExit() {
    if (this.activeTrade) {
      const exitPrice = this.activeTrade.type === 'BUY' ? this.currentBid : this.currentAsk;
      this.closeActiveTrade(exitPrice, '🛑 Emergency Exit Pressed');
    }
    if (this.isRunning) {
      this.toggleBot();
    }
    this.log('[EMERGENCY] All open positions closed and bot halted.');
  }

  updateHeaderUI() {
    const elPrice = document.getElementById('headerLivePrice');
    const elSpread = document.getElementById('headerSpreadVal');
    const elChange = document.getElementById('headerPriceChange');
    const profile = this.pairProfiles[this.pair];

    elPrice.textContent = this.currentBid.toFixed(profile.decimals);
    elSpread.textContent = this.currentSpread.toFixed(1);

    const change = this.currentBid - profile.basePrice;
    const changePct = (change / profile.basePrice) * 100;

    elChange.textContent = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
    elChange.className = `price-change ${changePct >= 0 ? 'price-up' : 'price-down'}`;
  }

  updateStatsUI() {
    const elUSD = document.getElementById('statNetPnL');
    const elWinRate = document.getElementById('statWinRate');
    const elPips = document.getElementById('statTotalPips');
    const elTotal = document.getElementById('statTotalTrades');

    const sign = this.stats.netUSD >= 0 ? '+' : '-';
    elUSD.textContent = `${sign}$${Math.abs(this.stats.netUSD).toFixed(2)}`;
    elUSD.className = `stat-value ${this.stats.netUSD >= 0 ? 'price-up' : 'price-down'}`;

    const winRate = this.stats.totalTrades > 0 ? ((this.stats.winningTrades / this.stats.totalTrades) * 100) : 0;
    elWinRate.textContent = `${winRate.toFixed(1)}%`;
    elWinRate.style.color = winRate >= 60 ? 'var(--green)' : 'var(--yellow)';

    const pipSign = this.stats.netPips >= 0 ? '+' : '';
    elPips.textContent = `${pipSign}${this.stats.netPips.toFixed(1)} Pips`;
    elPips.className = `stat-value ${this.stats.netPips >= 0 ? 'price-up' : 'price-down'}`;

    elTotal.textContent = this.stats.totalTrades;
  }

  updateActivePositionsTable() {
    const tbody = document.getElementById('activePositionsBody');
    const countEl = document.getElementById('activePositionsCount');
    const banner = document.getElementById('activePositionBanner');
    const profile = this.pairProfiles[this.pair];

    if (!this.activeTrade) {
      if (banner) banner.style.display = 'none';
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">No open positions. Use "▲ BUY" or "▼ SELL" buttons above to open a position immediately.</td></tr>`;
      countEl.textContent = '0';
      return;
    }

    countEl.textContent = '1';
    const trade = this.activeTrade;
    const isBuy = trade.type === 'BUY';
    const pipsDiff = isBuy 
      ? +((trade.currentPrice - trade.entryPrice) * profile.pipMult).toFixed(1)
      : +((trade.entryPrice - trade.currentPrice) * profile.pipMult).toFixed(1);

    const usdDiff = +(pipsDiff * (trade.lotSize * 10.0)).toFixed(2);
    const isProfit = pipsDiff >= 0;

    if (banner) {
      banner.style.display = 'flex';
      const badgeEl = document.getElementById('bannerTradeType');
      badgeEl.textContent = trade.type;
      badgeEl.style.background = isBuy ? 'var(--green)' : 'var(--red)';
      badgeEl.style.color = isBuy ? '#000' : '#fff';

      document.getElementById('bannerTradeSymbol').textContent = trade.pair;
      document.getElementById('bannerTradeLots').textContent = trade.lotSize;
      document.getElementById('bannerTradeEntry').textContent = trade.entryPrice.toFixed(profile.decimals);
      document.getElementById('bannerTradeLive').textContent = trade.currentPrice.toFixed(profile.decimals);

      const pipsEl = document.getElementById('bannerTradePips');
      const usdEl = document.getElementById('bannerTradeUSD');
      pipsEl.textContent = `${isProfit ? '+' : ''}${pipsDiff} Pips`;
      pipsEl.className = isProfit ? 'price-up' : 'price-down';
      usdEl.textContent = `(${isProfit ? '+' : ''}$${usdDiff})`;
      usdEl.className = isProfit ? 'price-up' : 'price-down';
    }

    tbody.innerHTML = `
      <tr>
        <td>${trade.time}</td>
        <td><b>${trade.pair}</b> ${trade.ticket ? `<span style="font-size:10px; color:var(--green);">(#${trade.ticket})</span>` : ''}</td>
        <td><span class="${isBuy ? 'badge-buy' : 'badge-sell'}">${trade.type}</span></td>
        <td><b>${trade.lotSize} Lots</b></td>
        <td>${trade.entryPrice.toFixed(profile.decimals)}</td>
        <td><b>${trade.currentPrice.toFixed(profile.decimals)}</b></td>
        <td style="color: var(--green);">${trade.takeProfitPrice.toFixed(profile.decimals)} (+${trade.pipTarget}p)</td>
        <td style="color: var(--red);">${trade.stopLossPrice.toFixed(profile.decimals)} (-${trade.pipSL}p)</td>
        <td class="${isProfit ? 'price-up' : 'price-down'}"><b>${isProfit ? '+' : ''}${pipsDiff} pips ($${usdDiff})</b></td>
        <td>
          <button style="background: var(--red); color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;" onclick="window.botInstance.closeActiveTrade(window.botInstance.activeTrade.type === 'BUY' ? window.botInstance.currentBid : window.botInstance.currentAsk, 'Manual Table Close')">Close</button>
        </td>
      </tr>
    `;
  }

  updateTradeHistoryTable() {
    const tbody = document.getElementById('tradeHistoryBody');
    const profile = this.pairProfiles[this.pair];

    if (this.tradeHistory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">No trade history yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.tradeHistory.slice(0, 15).map(t => {
      const isWin = t.netUSD >= 0;
      return `
        <tr>
          <td>${t.time}</td>
          <td><b>${t.pair}</b> <span style="font-size: 9px; color: ${t.mode === 'LIVE' ? 'var(--red)' : 'var(--blue)'};">[${t.mode || 'DEMO'}]</span></td>
          <td><span class="${t.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.type}</span></td>
          <td>${t.lots}</td>
          <td>${t.entryPrice.toFixed(profile.decimals)}</td>
          <td>${t.exitPrice.toFixed(profile.decimals)}</td>
          <td class="${isWin ? 'price-up' : 'price-down'}">${isWin ? '+' : ''}${t.pips} pips</td>
          <td class="${isWin ? 'price-up' : 'price-down'}"><b>${isWin ? '+' : '-'}$${Math.abs(t.netUSD).toFixed(2)}</b></td>
          <td style="color: var(--text-secondary);">${t.reason}</td>
        </tr>
      `;
    }).join('');
  }

  log(msg) {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.style.marginBottom = '4px';
    div.innerHTML = `<span style="color: var(--text-muted);">[${time}]</span> ${msg}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  playSound(type) {
    if (!this.config.audioEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'buy') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'profit') {
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'loss') {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {}
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.botInstance = new ForexScalperEngine();
});
