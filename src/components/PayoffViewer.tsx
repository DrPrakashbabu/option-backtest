import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Area,
  ComposedChart
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Percent, 
  Crosshair, 
  Sliders, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PayoffResponseData } from '../types/options';

interface PayoffViewerProps {
  payoffData: PayoffResponseData | null;
  loading: boolean;
  spotPrice: number;
  ivShift: number;
  setIvShift: (shift: number) => void;
  targetDte: number;
  setTargetDte: (dte: number) => void;
  totalDte: number;
}

export const PayoffViewer: React.FC<PayoffViewerProps> = ({
  payoffData,
  loading,
  spotPrice,
  ivShift,
  setIvShift,
  targetDte,
  setTargetDte,
  totalDte,
}) => {
  if (loading && !payoffData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[380px] text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Computing Python Black-Scholes Payoff Matrix...</p>
      </div>
    );
  }

  if (!payoffData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <p className="text-sm">Configure legs above to view payoff diagram.</p>
      </div>
    );
  }

  const { summary, payoff_curve } = payoffData;
  const beList = summary.breakevens || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      {/* Top Title & Interactive Sliders */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Interactive Strategy Payoff & Greeks Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time theoretical payoff at Expiry vs. Target Date with IV shifts & Greeks sensitivity.
          </p>
        </div>

        {/* Sliders for Sensitivity Simulation */}
        <div className="flex items-center gap-4 flex-wrap bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          {/* IV Shift Slider */}
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400">IV Shift:</span>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={ivShift}
              onChange={(e) => setIvShift(Number(e.target.value))}
              className="w-24 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className={`text-xs font-mono font-semibold w-12 text-right ${
              ivShift > 0 ? 'text-amber-400' : ivShift < 0 ? 'text-cyan-400' : 'text-slate-400'
            }`}>
              {ivShift > 0 ? `+${ivShift}%` : `${ivShift}%`}
            </span>
          </div>

          {/* DTE Slider */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="text-xs text-slate-400">Days Elapsed:</span>
            <input
              type="range"
              min={0}
              max={totalDte}
              step={0.5}
              value={targetDte}
              onChange={(e) => setTargetDte(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-xs font-mono font-semibold text-cyan-300 w-12 text-right">
              {targetDte}d / {totalDte}d
            </span>
          </div>

          {(ivShift !== 0 || targetDte !== 0) && (
            <button
              onClick={() => {
                setIvShift(0);
                setTargetDte(0);
              }}
              title="Reset IV and DTE sliders"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Net Premium */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Net Premium</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              summary.is_credit ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-blue-950 text-blue-400 border border-blue-800/60'
            }`}>
              {summary.is_credit ? 'CREDIT' : 'DEBIT'}
            </span>
          </div>
          <div className={`text-base font-bold font-mono mt-1 ${
            summary.is_credit ? 'text-emerald-400' : 'text-blue-400'
          }`}>
            ₹{Math.abs(summary.net_premium).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {summary.is_credit ? 'Inflow at trade entry' : 'Initial capital outlay'}
          </div>
        </div>

        {/* Max Profit */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Max Profit</div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-1">
            {summary.max_profit_display}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {summary.risk_reward !== 'N/A' ? `R:R = ${summary.risk_reward}` : 'Defined risk profile'}
          </div>
        </div>

        {/* Max Loss */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Max Loss</div>
          <div className="text-base font-bold font-mono text-rose-400 mt-1">
            {summary.max_loss_display}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Worst case at expiry</div>
        </div>

        {/* Probability of Profit */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>POP (%)</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono text-amber-400 mt-1">
            {summary.pop_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Log-normal probability</div>
        </div>

        {/* Breakevens */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Breakeven Range</div>
          <div className="text-sm font-bold font-mono text-white mt-1 flex items-center gap-2">
            {beList.length >= 2 ? (
              <>
                <span className="text-cyan-400 font-mono">{beList[0]}</span>
                <span className="text-slate-500">↔</span>
                <span className="text-cyan-400 font-mono">{beList[beList.length - 1]}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (±{((Math.abs(beList[beList.length - 1] - beList[0]) / 2 / spotPrice) * 100).toFixed(1)}% cushion)
                </span>
              </>
            ) : beList.length === 1 ? (
              <span className="text-cyan-400 font-mono">{beList[0]}</span>
            ) : (
              <span className="text-slate-500 font-normal">No Breakeven (Full Profit/Loss)</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Current Spot: <span className="text-white font-mono">{spotPrice.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Net Portfolio Greeks Row */}
      <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
          Net Strategy Greeks:
        </span>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500">Delta (Δ):</span>
            <span className={`font-bold ${
              summary.net_greeks.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summary.net_greeks.delta > 0 ? `+${summary.net_greeks.delta}` : summary.net_greeks.delta}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500">Gamma (Γ):</span>
            <span className="text-slate-300 font-semibold">{summary.net_greeks.gamma}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500">Theta (θ):</span>
            <span className={`font-bold ${
              summary.net_greeks.theta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summary.net_greeks.theta >= 0 ? `+₹${summary.net_greeks.theta}` : `-₹${Math.abs(summary.net_greeks.theta)}`}/day
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500">Vega (ν):</span>
            <span className={`font-bold ${
              summary.net_greeks.vega >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summary.net_greeks.vega >= 0 ? `+₹${summary.net_greeks.vega}` : `-₹${Math.abs(summary.net_greeks.vega)}`}/1% IV
            </span>
          </div>
        </div>
      </div>

      {/* Payoff Chart */}
      <div className="h-[360px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={payoff_curve}
            margin={{ top: 10, right: 25, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} />
            <XAxis
              dataKey="spot"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => Math.round(val).toString()}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => `₹${Math.round(val).toLocaleString('en-IN')}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                const spotDiff = data.spot - spotPrice;
                const pctDiff = (spotDiff / spotPrice) * 100;

                return (
                  <div className="bg-slate-950 border border-slate-700/80 rounded-lg p-3 shadow-xl text-xs font-mono space-y-1.5">
                    <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                      <span>Nifty Spot: ₹{data.spot}</span>
                      <span className={`text-[11px] ${spotDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {spotDiff >= 0 ? `+${spotDiff.toFixed(0)}` : spotDiff.toFixed(0)} ({pctDiff.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6 text-emerald-400">
                      <span>Expiry P&L:</span>
                      <span className="font-bold">
                        {data.expiry_pnl >= 0 ? `+₹${data.expiry_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(data.expiry_pnl).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6 text-cyan-400">
                      <span>Target (T+{targetDte}d) P&L:</span>
                      <span className="font-bold">
                        {data.target_pnl >= 0 ? `+₹${data.target_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(data.target_pnl).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Zero P&L horizontal reference */}
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />

            {/* Current Spot vertical line */}
            <ReferenceLine
              x={spotPrice}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Current Spot: ${spotPrice.toFixed(0)}`,
                fill: '#f59e0b',
                position: 'top',
                fontSize: 10,
              }}
            />

            {/* Breakeven vertical markers */}
            {beList.map((be, idx) => (
              <ReferenceLine
                key={idx}
                x={be}
                stroke="#06b6d4"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: `BE: ${be}`,
                  fill: '#06b6d4',
                  position: 'bottom',
                  fontSize: 9,
                }}
              />
            ))}

            {/* Expiry Payoff Line (Solid Emerald) */}
            <Line
              type="monotone"
              dataKey="expiry_pnl"
              name="Expiry Payoff"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Target DTE Payoff Line (Cyan Dashed) */}
            <Line
              type="monotone"
              dataKey="target_pnl"
              name={`T+${targetDte} Payoff`}
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-emerald-500 rounded" />
          <span>Payoff at Expiry</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-cyan-400 rounded border-b border-dashed border-cyan-400" />
          <span>Payoff at Target Date (T+{targetDte}d)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-amber-400 rounded" />
          <span>Current Nifty Spot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-cyan-600 rounded" />
          <span>Breakeven Thresholds</span>
        </div>
      </div>
    </div>
  );
};
