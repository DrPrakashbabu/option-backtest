import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  Brush
} from 'recharts';
import { LineChart as LineChartIcon, Activity, Flag, ArrowUpRight, TrendingUp } from 'lucide-react';
import { NiftyBar, TradeResult } from '../types/options';

interface NiftyChartProps {
  historicalBars: NiftyBar[];
  trades: TradeResult[];
}

export const NiftyChart: React.FC<NiftyChartProps> = ({ historicalBars, trades }) => {
  const [selectedRange, setSelectedRange] = useState<'ALL' | '2024' | '2023' | '2022' | '2021'>('ALL');
  const [showVix, setShowVix] = useState<boolean>(true);

  // Map trades by entry_date and exit_date
  const tradeEntryMap = new Map<string, TradeResult[]>();
  const tradeExitMap = new Map<string, TradeResult[]>();

  trades.forEach((t) => {
    if (!tradeEntryMap.has(t.entry_date)) tradeEntryMap.set(t.entry_date, []);
    tradeEntryMap.get(t.entry_date)!.push(t);

    if (!tradeExitMap.has(t.exit_date)) tradeExitMap.set(t.exit_date, []);
    tradeExitMap.get(t.exit_date)!.push(t);
  });

  const filteredBars = historicalBars.filter((bar) => {
    if (selectedRange === 'ALL') return true;
    return bar.date.startsWith(selectedRange);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-purple-400" />
            <span>Nifty 50 Spot Price Chart & Strategy Signals Overlay</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualize Nifty market regimes, historical volatility (India VIX), and exact backtest entry/exit executions.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* VIX Toggle */}
          <button
            onClick={() => setShowVix(!showVix)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              showVix
                ? 'bg-amber-950 text-amber-300 border-amber-800/80 font-medium'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>India VIX Overlay</span>
          </button>

          {/* Timeframe Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            {(['ALL', '2024', '2023', '2022', '2021'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedRange === r ? 'bg-purple-900/60 text-purple-200 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Legend info */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-cyan-400 rounded" />
            <span className="text-slate-300">Nifty 50 Spot Price</span>
          </div>
          {showVix && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-amber-400 rounded" />
              <span className="text-amber-300">India VIX (Right Axis)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Strategy Trade Entry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Strategy Trade Exit</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Showing {filteredBars.length} daily bars
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-[420px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filteredBars}
            margin={{ top: 10, right: 25, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="niftySpotGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              yAxisId="spot"
              stroke="#38bdf8"
              fontSize={11}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(val) => Math.round(val).toString()}
            />
            {showVix && (
              <YAxis
                yAxisId="vix"
                orientation="right"
                stroke="#f59e0b"
                fontSize={11}
                tickLine={false}
                domain={[8, 36]}
                tickFormatter={(val) => val.toString()}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as NiftyBar;
                const entries = tradeEntryMap.get(d.date) || [];
                const exits = tradeExitMap.get(d.date) || [];

                return (
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono shadow-2xl space-y-1.5 max-w-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-bold text-white">
                      <span>{d.date} ({d.day_name})</span>
                      <span className="text-cyan-400">ATM: {d.atm_strike}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-300">
                      <div>Open: ₹{d.open}</div>
                      <div>High: ₹{d.high}</div>
                      <div>Low: ₹{d.low}</div>
                      <div className="font-bold text-white">Close: ₹{d.close}</div>
                    </div>
                    <div className="text-amber-400">India VIX: {d.vix}</div>
                    {d.is_expiry_day && (
                      <div className="text-[10px] text-cyan-400 font-sans font-semibold">
                        ★ Weekly Expiry Day
                      </div>
                    )}
                    {entries.length > 0 && (
                      <div className="pt-1 mt-1 border-t border-slate-800 text-emerald-400 font-sans text-[11px]">
                        🟢 Trade Entry: {entries.map((e) => e.id).join(', ')}
                      </div>
                    )}
                    {exits.length > 0 && (
                      <div className="pt-1 mt-1 border-t border-slate-800 text-rose-400 font-sans text-[11px]">
                        🔴 Trade Exit: {exits.map((e) => `${e.id} (${e.net_pnl >= 0 ? '+' : ''}₹${e.net_pnl})`).join(', ')}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Nifty 50 Spot Line */}
            <Area
              yAxisId="spot"
              type="monotone"
              dataKey="close"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#niftySpotGrad)"
              dot={false}
              isAnimationActive={false}
            />

            {/* India VIX Line */}
            {showVix && (
              <Line
                yAxisId="vix"
                type="monotone"
                dataKey="vix"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                opacity={0.8}
                isAnimationActive={false}
              />
            )}

            {/* Trade Entries */}
            {filteredBars.map((bar) => {
              if (tradeEntryMap.has(bar.date)) {
                return (
                  <ReferenceDot
                    key={`entry-${bar.date}`}
                    yAxisId="spot"
                    x={bar.date}
                    y={bar.close}
                    r={5}
                    fill="#10b981"
                    stroke="#047857"
                    strokeWidth={2}
                  />
                );
              }
              if (tradeExitMap.has(bar.date)) {
                const ex = tradeExitMap.get(bar.date)![0];
                const isProfitable = ex.net_pnl > 0;
                return (
                  <ReferenceDot
                    key={`exit-${bar.date}`}
                    yAxisId="spot"
                    x={bar.date}
                    y={bar.close}
                    r={5}
                    fill={isProfitable ? '#10b981' : '#f43f5e'}
                    stroke={isProfitable ? '#065f46' : '#9f1239'}
                    strokeWidth={2}
                  />
                );
              }
              return null;
            })}

            <Brush
              dataKey="date"
              height={26}
              stroke="#475569"
              fill="#0f172a"
              tickFormatter={(v) => v.slice(0, 7)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
