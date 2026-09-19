/**
 * High Performance Canvas Chart Engine for Forex Scalping
 * Formats 5-decimal Forex pairs, JPY 3-decimals, Gold, Bid/Ask spread, and Pip markers
 */
class TradingChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.candles = [];
    this.tradeMarkers = [];
    this.activeTrade = null;
    this.pairConfig = { decimals: 5, pipMultiplier: 10000 };
    this.bidPrice = null;
    this.askPrice = null;
    this.mouseX = null;
    this.mouseY = null;

    this.initCanvas();
    window.addEventListener('resize', () => this.resize());
    this.setupInteractivity();
  }

  initCanvas() {
    this.resize();
  }

  setPairConfig(decimals, pipMultiplier) {
    this.pairConfig = { decimals, pipMultiplier };
  }

  setPrices(bid, ask) {
    this.bidPrice = bid;
    this.askPrice = ask;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  setupInteractivity() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = null;
      this.mouseY = null;
      this.render();
    });
  }

  setData(candles, tradeMarkers = [], activeTrade = null) {
    this.candles = candles;
    this.tradeMarkers = tradeMarkers;
    this.activeTrade = activeTrade;
    this.render();
  }

  formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '--';
    return Number(price).toFixed(this.pairConfig.decimals);
  }

  render() {
    if (!this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, w, h);

    if (!this.candles || this.candles.length < 2) {
      ctx.fillStyle = '#54657e';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Streaming Forex Market Ticks...', w / 2, h / 2);
      return;
    }

    const rsiHeight = Math.max(65, h * 0.22);
    const mainHeight = h - rsiHeight - 25;
    const rightMargin = 78;

    const maxVisible = 42;
    const visibleCandles = this.candles.slice(-maxVisible);
    const candleCount = visibleCandles.length;
    const candleSpacing = (w - rightMargin) / candleCount;
    const candleWidth = Math.max(3, candleSpacing * 0.65);

    // Calculate Y-scale bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    visibleCandles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.ema9 && c.ema9 < minPrice) minPrice = c.ema9;
      if (c.ema9 && c.ema9 > maxPrice) maxPrice = c.ema9;
      if (c.ema21 && c.ema21 < minPrice) minPrice = c.ema21;
      if (c.ema21 && c.ema21 > maxPrice) maxPrice = c.ema21;
    });

    if (this.activeTrade) {
      if (this.activeTrade.takeProfitPrice > maxPrice) maxPrice = this.activeTrade.takeProfitPrice;
      if (this.activeTrade.stopLossPrice < minPrice) minPrice = this.activeTrade.stopLossPrice;
    }

    const pricePadding = (maxPrice - minPrice) * 0.12 || (1 / this.pairConfig.pipMultiplier) * 10;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    const getY = (price) => {
      return mainHeight - ((price - minPrice) / priceRange) * mainHeight;
    };

    // 1. Grid Lines
    ctx.strokeStyle = '#182030';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const price = minPrice + (priceRange / gridSteps) * i;
      const y = getY(price);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w - rightMargin, y);
      ctx.stroke();

      // Right-side Price Scale
      ctx.fillStyle = '#8a99ad';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(this.formatPrice(price), w - rightMargin + 5, y + 3);
    }

    // 2. Candlesticks
    visibleCandles.forEach((c, i) => {
      const x = i * candleSpacing + candleSpacing / 2;
      const isGreen = c.close >= c.open;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      // Wick
      ctx.strokeStyle = isGreen ? '#00e676' : '#ff3d71';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = isGreen ? '#00e676' : '#ff3d71';
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
    });

    // 3. EMA 9, EMA 21, VWAP Lines
    this.drawLineIndicator(ctx, visibleCandles, candleSpacing, getY, 'ema9', '#00e676', 1.8);
    this.drawLineIndicator(ctx, visibleCandles, candleSpacing, getY, 'ema21', '#ffab00', 1.8);
    this.drawLineIndicator(ctx, visibleCandles, candleSpacing, getY, 'vwap', '#2979ff', 1.5, [4, 4]);

    // 4. Live Bid and Ask Lines (Forex Spread Box)
    if (this.bidPrice && this.askPrice) {
      const bidY = getY(this.bidPrice);
      const askY = getY(this.askPrice);
      
      // Spread shading
      ctx.fillStyle = 'rgba(255, 171, 0, 0.05)';
      ctx.fillRect(0, Math.min(bidY, askY), w - rightMargin, Math.abs(bidY - askY));

      // Ask line (Red dashed)
      this.drawDashedLine(ctx, 0, askY, w - rightMargin, askY, 'rgba(255, 61, 113, 0.7)', [3, 3]);
      // Bid line (Blue dashed)
      this.drawDashedLine(ctx, 0, bidY, w - rightMargin, bidY, 'rgba(41, 121, 255, 0.7)', [3, 3]);
    }

    // 5. Active Position Lines (TP, SL, Entry)
    if (this.activeTrade) {
      const entryY = getY(this.activeTrade.entryPrice);
      const tpY = getY(this.activeTrade.takeProfitPrice);
      const slY = getY(this.activeTrade.stopLossPrice);

      this.drawDashedLine(ctx, 0, entryY, w - rightMargin, entryY, '#ffea00', [4, 4]);
      this.drawBadge(ctx, w - rightMargin + 4, entryY, `Entry: ${this.formatPrice(this.activeTrade.entryPrice)}`, '#ffea00', '#000');

      this.drawDashedLine(ctx, 0, tpY, w - rightMargin, tpY, '#00e676', [6, 3]);
      this.drawBadge(ctx, w - rightMargin + 4, tpY, `TP: ${this.formatPrice(this.activeTrade.takeProfitPrice)}`, '#00e676', '#000');

      this.drawDashedLine(ctx, 0, slY, w - rightMargin, slY, '#ff3d71', [6, 3]);
      this.drawBadge(ctx, w - rightMargin + 4, slY, `SL: ${this.formatPrice(this.activeTrade.stopLossPrice)}`, '#ff3d71', '#fff');
    }

    // 6. Trade Pins
    const startIndex = Math.max(0, this.candles.length - maxVisible);
    this.tradeMarkers.forEach(m => {
      const candleIndex = m.candleIndex - startIndex;
      if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
        const x = candleIndex * candleSpacing + candleSpacing / 2;
        const y = getY(m.price);

        ctx.fillStyle = m.type === 'BUY' ? '#00e676' : '#ff3d71';
        ctx.beginPath();
        if (m.type === 'BUY') {
          ctx.moveTo(x, y + 14);
          ctx.lineTo(x - 6, y + 24);
          ctx.lineTo(x + 6, y + 24);
        } else {
          ctx.moveTo(x, y - 14);
          ctx.lineTo(x - 6, y - 24);
          ctx.lineTo(x + 6, y - 24);
        }
        ctx.closePath();
        ctx.fill();

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(m.type, x, m.type === 'BUY' ? y + 34 : y - 28);
      }
    });

    // 7. RSI Sub-Chart
    this.renderRSI(ctx, visibleCandles, candleSpacing, w, h, rightMargin, rsiHeight, mainHeight);

    // 8. Crosshair
    if (this.mouseX && this.mouseY && this.mouseX < w - rightMargin && this.mouseY < h - 25) {
      ctx.strokeStyle = 'rgba(138, 153, 173, 0.35)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(this.mouseX, 0);
      ctx.lineTo(this.mouseX, h - 25);
      ctx.moveTo(0, this.mouseY);
      ctx.lineTo(w - rightMargin, this.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawLineIndicator(ctx, candles, spacing, getY, key, color, lineWidth = 1.5, dash = []) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;

    candles.forEach((c, i) => {
      if (c[key] !== undefined && c[key] !== null) {
        const x = i * spacing + spacing / 2;
        const y = getY(c[key]);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  renderRSI(ctx, candles, spacing, w, h, rightMargin, rsiHeight, mainHeight) {
    const rsiTop = mainHeight + 5;
    const rsiBottom = mainHeight + rsiHeight;

    ctx.fillStyle = '#0f141f';
    ctx.fillRect(0, rsiTop, w - rightMargin, rsiHeight);
    ctx.strokeStyle = '#232f46';
    ctx.strokeRect(0, rsiTop, w - rightMargin, rsiHeight);

    const getRsiY = (val) => {
      return rsiBottom - ((val - 0) / 100) * rsiHeight;
    };

    this.drawDashedLine(ctx, 0, getRsiY(70), w - rightMargin, getRsiY(70), 'rgba(255, 61, 113, 0.4)', [4, 4]);
    this.drawDashedLine(ctx, 0, getRsiY(30), w - rightMargin, getRsiY(30), 'rgba(0, 230, 118, 0.4)', [4, 4]);
    this.drawDashedLine(ctx, 0, getRsiY(50), w - rightMargin, getRsiY(50), 'rgba(138, 153, 173, 0.2)', [2, 2]);

    ctx.fillStyle = '#8a99ad';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('70 OB', w - rightMargin + 5, getRsiY(70) + 3);
    ctx.fillText('30 OS', w - rightMargin + 5, getRsiY(30) + 3);

    ctx.strokeStyle = '#d500f9';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let started = false;

    candles.forEach((c, i) => {
      if (c.rsi !== undefined && c.rsi !== null) {
        const x = i * spacing + spacing / 2;
        const y = getRsiY(c.rsi);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
  }

  drawDashedLine(ctx, x1, y1, x2, y2, color, dash = [4, 4]) {
    ctx.strokeStyle = color;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBadge(ctx, x, y, text, bg, color) {
    ctx.font = '9px "JetBrains Mono", monospace';
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y - 8, textWidth + 6, 16);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 3, y + 4);
  }
}
window.TradingChart = TradingChart;
