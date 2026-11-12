import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Download,
  Calendar,
  AlertTriangle,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { 
  StrategyLeg, 
  StrategyConfig, 
  BacktestResponseData, 
  TradeResult 
} from '../types/options';

interface BacktestTerminalProps {
  legs: StrategyLeg[];
  config: StrategyConfig;
  setConfig: React.Dispatch<React.SetStateAction<StrategyConfig>>;
  backtestResult: BacktestResponseData | null;
  loading: boolean;
  onRunBacktest: () => void;
  executionTimeMs?: number;
}

export const BacktestTerminal: React.FC<BacktestTerminalProps> = ({
  legs,
  config,
  setConfig,
  backtestResult,
  loading,
  onRunBacktest,
  executionTimeMs,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const datePresets = [
    { label: 'Full 2021-2024', start: '2021-01-01', end: '2024-10-31' },
    { label: 'Last 2 Years (2023-2024)', start: '2023-01-01', end: '2024-10-31' },
    { label: '2024 YTD', start: '2024-01-01', end: '2024-10-31' },
    { label: '2022 Shock / Bear Volatility', start: '2022-01-01', end: '2022-12-31' },
    { label: '2024 Election Volatility', start: '2024-04-01', end: '2024-07-31' },
  ];

  const handleApplyDatePreset = (start: string, end: string) => {
    setConfig((prev) => ({ ...prev, startDate: start, endDate: end }));
  };

  const exportCSV = () => {
    if (!backtestResult || !backtestResult.trades.length) return;
    const trades = backtestResult.trades;
    const headers = [
      'Trade ID',
      'Entry Date',
      'Exit Date',
      'Expiry Date',
      'Days Held',
      'Spot Entry',
      'Spot Exit',
      'Exit Reason',
      'Gross PnL (INR)',
      'Brokerage (INR)',
      'Slippage (INR)',
      'Net PnL (INR)',
      'ROI (%)',
      'Legs Count'
    ];

    const rows = trades.map((t) => [
      t.id,
      t.entry_date,
      t.exit_date,
      t.expiry_date,
      t.days_held,
      t.spot_entry,
      t.spot_exit,
      `"${t.exit_reason.replace(/"/g, '""')}"`,
      t.gross_pnl,
      t.brokerage,
      t.slippage,
      t.net_pnl,
      t.roi_percent,
      t.legs.length,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nifty50_backtest_${config.startDate}_${config.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = backtestResult?.summary;
  const trades = backtestResult?.trades || [];

  const filteredTrades = trades.filter((t) => {
    if (filterType === 'WIN') return t.net_pnl > 0;
    if (filterType === 'LOSS') return t.net_pnl <= 0;
    return true;
  });

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearsList = Object.keys(backtestResult?.monthly_matrix || {}).sort();

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Backtest Execution Parameters</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate exact multi-leg performance over historical Nifty 50 data via high-performance Python 3.10 engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunBacktest}
              disabled={loading || legs.length === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
                loading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  <span>Computing in Python...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current stroke-none" />
                  <span>Execute Python Backtest</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="pt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Date Range Presets:</span>
          {datePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleApplyDatePreset(preset.start, preset.end)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                config.startDate === preset.start && config.endDate === preset.end
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 font-medium'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          {/* Start Date */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Start Date</label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">End Date</label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            />
          </div>

          {/* Initial Capital */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Initial Capital (₹)</label>
            <input
              type="number"
              step={50000}
              value={config.initialCapital}
              onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-cyan-300 font-mono"
            />
          </div>

          {/* Entry Schedule */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Entry Day</label>
            <select
              value={config.entryDay}
              onChange={(e) => setConfig({ ...config, entryDay: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value="THURSDAY">Every Thursday (Weekly Rollover)</option>
              <option value="FRIDAY">Every Friday</option>
              <option value="MONDAY">Every Monday</option>
              <option value="WEDNESDAY">Every Wednesday (1-DTE)</option>
              <option value="ANY">Continuous (Next Day after Exit)</option>
            </select>
          </div>

          {/* Entry DTE */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Target Entry DTE</label>
            <select
              value={config.entryDTE}
              onChange={(e) => setConfig({ ...config, entryDTE: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            >
              <option value={7}>7 DTE (Full Weekly Expiry)</option>
              <option value={5}>5 DTE (Friday Entry)</option>
              <option value={3}>3 DTE (Monday Entry)</option>
              <option value={1}>1 DTE (Day Before Expiry)</option>
              <option value={0}>0 DTE (Expiry Day Intraday)</option>
            </select>
          </div>

          {/* Exit DTE */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Exit DTE</label>
            <select
              value={config.exitDTE}
              onChange={(e) => setConfig({ ...config, exitDTE: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            >
              <option value={0}>0 DTE (Hold Till Expiry)</option>
              <option value={1}>1 DTE (Square off 1 Day Prior)</option>
              <option value={2}>2 DTE</option>
            </select>
          </div>

          {/* Overall Strategy SL */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Portfolio Stop Loss (₹)</label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={config.overallStopLoss ?? ''}
              onChange={(e) => setConfig({ ...config, overallStopLoss: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-rose-300 font-mono"
            />
          </div>

          {/* Overall Strategy TP */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Portfolio Target Profit (₹)</label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={config.overallTargetProfit ?? ''}
              onChange={(e) => setConfig({ ...config, overallTargetProfit: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-300 font-mono"
            />
          </div>

          {/* Slippage */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Slippage (%)</label>
            <input
              type="number"
              step={0.1}
              value={config.slippagePercent}
              onChange={(e) => setConfig({ ...config, slippagePercent: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            />
          </div>

          {/* Brokerage per order */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Brokerage / Order (₹)</label>
            <input
              type="number"
              value={config.brokeragePerOrder}
              onChange={(e) => setConfig({ ...config, brokeragePerOrder: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-semibold">Backtest Execution Finished:</span>
              <span className="font-mono text-slate-300">{summary.start_date} to {summary.end_date}</span>
              {executionTimeMs !== undefined && (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono font-medium">
                  ⚡ Python Engine: {executionTimeMs}ms
                </span>
              )}
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Trade Logs (CSV)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Total PnL */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Total Net P&L</div>
              <div className={`text-base font-bold font-mono mt-1 ${
                summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {summary.total_pnl >= 0 ? `+₹${summary.total_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(summary.total_pnl).toLocaleString('en-IN')}`}
              </div>
              <div className={`text-[10px] font-semibold mt-0.5 ${summary.total_roi_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary.total_roi_pct >= 0 ? `+${summary.total_roi_pct}%` : `${summary.total_roi_pct}%`} ROI
              </div>
            </div>

            {/* CAGR */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">CAGR (%)</div>
              <div className="text-base font-bold font-mono text-cyan-400 mt-1">
                {summary.cagr_pct.toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Annualized Return</div>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Win Rate</div>
              <div className="text-base font-bold font-mono text-amber-400 mt-1">
                {summary.win_rate_pct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {summary.winning_trades}W / {summary.losing_trades}L ({summary.total_trades} total)
              </div>
            </div>

            {/* Profit Factor */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Profit Factor</div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {summary.profit_factor.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Gross Win / Gross Loss</div>
            </div>

            {/* Max Drawdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Max Drawdown</div>
              <div className="text-base font-bold font-mono text-rose-400 mt-1">
                -{summary.max_drawdown_pct.toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{summary.max_drawdown_days} days recovery</div>
            </div>

            {/* Sharpe Ratio */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Sharpe Ratio</div>
              <div className="text-base font-bold font-mono text-blue-400 mt-1">
                {summary.sharpe_ratio.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Risk-adjusted return</div>
            </div>

            {/* Win / Loss Ratio */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Avg Win / Loss</div>
              <div className="text-sm font-bold font-mono text-white mt-1">
                ₹{Math.round(summary.avg_win)} / ₹{Math.round(summary.avg_loss)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ratio: 1 : {summary.win_loss_ratio.toFixed(2)}</div>
            </div>

            {/* Expectancy */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Expectancy</div>
              <div className={`text-base font-bold font-mono mt-1 ${
                summary.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                ₹{Math.round(summary.expectancy).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Per trade edge</div>
            </div>
          </div>
        </div>
      )}

      {/* Equity Curve & Underwater Drawdown Chart */}
      {backtestResult && backtestResult.equity_curve && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Cumulative Portfolio Equity Curve & Underwater Drawdown</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Final Capital: <strong className="text-white">₹{summary?.final_capital.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={backtestResult.equity_curve}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono space-y-1">
                        <div className="text-slate-400 font-semibold">{d.date}</div>
                        <div className="text-cyan-300 font-bold">Capital: ₹{d.capital.toLocaleString('en-IN')}</div>
                        <div className={d.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          Net P&L: ₹{d.pnl.toLocaleString('en-IN')}
                        </div>
                        <div className="text-rose-400">Drawdown: -{d.drawdown_pct.toFixed(2)}%</div>
                        <div className="text-slate-500">Nifty Spot: ₹{d.spot} | VIX: {d.vix}</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={config.initialCapital} stroke="#64748b" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="capital"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#equityGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Returns Heatmap Matrix */}
      {backtestResult && yearsList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Monthly P&L Heatmap Matrix (₹ INR)</span>
            </h3>
            <span className="text-xs text-slate-400">Green = Profitable month, Red = Drawdown month</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <th className="py-2 px-3 text-left">Year</th>
                  {monthsList.map((m) => (
                    <th key={m} className="py-2 px-2.5 font-medium">{m}</th>
                  ))}
                  <th className="py-2 px-3 text-right">Year Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {yearsList.map((year) => {
                  const yearData = backtestResult.monthly_matrix[year] || {};
                  let yearSum = 0;
                  return (
                    <tr key={year} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-left font-bold text-white">{year}</td>
                      {monthsList.map((month) => {
                        const val = yearData[month];
                        if (val === undefined) {
                          return <td key={month} className="py-2.5 px-2 text-slate-600">—</td>;
                        }
                        yearSum += val;
                        const isPos = val > 0;
                        const isZero = val === 0;

                        return (
                          <td
                            key={month}
                            className={`py-2 px-2 rounded-sm ${
                              isZero
                                ? 'text-slate-500'
                                : isPos
                                ? 'bg-emerald-950/40 text-emerald-400 font-semibold'
                                : 'bg-rose-950/40 text-rose-400 font-semibold'
                            }`}
                            title={`${month} ${year}: ₹${val.toLocaleString('en-IN')}`}
                          >
                            {isZero ? '0' : (val > 0 ? `+${(val / 1000).toFixed(0)}k` : `${(val / 1000).toFixed(0)}k`)}
                          </td>
                        );
                      })}
                      <td className={`py-2.5 px-3 text-right font-bold ${yearSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {yearSum >= 0 ? `+₹${yearSum.toLocaleString('en-IN')}` : `-₹${Math.abs(yearSum).toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade Log & Journal */}
      {backtestResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Trade Journal & Order Log</span>
                <span className="text-xs font-normal text-slate-400">({filteredTrades.length} trades)</span>
              </h3>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <button
                  onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filterType === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({trades.length})
                </button>
                <button
                  onClick={() => { setFilterType('WIN'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filterType === 'WIN' ? 'bg-emerald-950 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Winners ({summary?.winning_trades || 0})
                </button>
                <button
                  onClick={() => { setFilterType('LOSS'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filterType === 'LOSS' ? 'bg-rose-950 text-rose-400 font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Losers ({summary?.losing_trades || 0})
                </button>
              </div>
            </div>
          </div>

          {/* Trade Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Trade ID</th>
                  <th className="py-2.5 px-3">Entry Date</th>
                  <th className="py-2.5 px-3">Exit Date</th>
                  <th className="py-2.5 px-3">Days</th>
                  <th className="py-2.5 px-3">Spot Entry</th>
                  <th className="py-2.5 px-3">Spot Exit</th>
                  <th className="py-2.5 px-3">Exit Reason</th>
                  <th className="py-2.5 px-3">Brokerage & Slippage</th>
                  <th className="py-2.5 px-3 text-right">Net P&L (₹)</th>
                  <th className="py-2.5 px-3 text-right">ROI (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {paginatedTrades.map((t) => {
                  const isWin = t.net_pnl > 0;
                  const isExpanded = expandedTradeId === t.id;

                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        onClick={() => setExpandedTradeId(isExpanded ? null : t.id)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-cyan-400 flex items-center gap-1.5">
                          {isWin ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span>{t.id}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{t.entry_date}</td>
                        <td className="py-2.5 px-3 text-slate-300">{t.exit_date}</td>
                        <td className="py-2.5 px-3 text-slate-400">{t.days_held}d</td>
                        <td className="py-2.5 px-3 text-slate-300">₹{t.spot_entry.toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-slate-300">₹{t.spot_exit.toFixed(0)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-sans px-2 py-0.5 rounded font-medium ${
                            t.exit_reason.includes('SL')
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              : t.exit_reason.includes('Target')
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {t.exit_reason}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          ₹{(t.brokerage + t.slippage).toFixed(0)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? `+₹${t.net_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(t.net_pnl).toLocaleString('en-IN')}`}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${t.roi_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.roi_percent >= 0 ? `+${t.roi_percent}%` : `${t.roi_percent}%`}
                        </td>
                      </tr>

                      {/* Expandable row showing individual leg details */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={10} className="p-3">
                            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-xs">
                              <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Executed Legs Breakdown for {t.id}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {t.legs.map((leg, lIdx) => (
                                  <div key={lIdx} className="bg-slate-950 border border-slate-800/80 rounded p-2 text-[11px] font-mono">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`font-bold ${leg.action === 'SELL' ? 'text-rose-400' : 'text-blue-400'}`}>
                                        {leg.action} {leg.strike} {leg.type}
                                      </span>
                                      <span className="text-slate-400">Qty: {leg.qty}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400">
                                      <span>Entry: ₹{leg.entry_price}</span>
                                      <span>Exit: ₹{leg.current_price}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800">
                                      <span className="text-slate-500">Leg P&L:</span>
                                      <span className={leg.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {leg.pnl >= 0 ? `+₹${leg.pnl}` : `-₹${Math.abs(leg.pnl)}`}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTrades.length)} of {filteredTrades.length} trades
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
                >
                  Previous
                </button>
                <span className="font-mono text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
