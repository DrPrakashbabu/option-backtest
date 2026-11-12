import React from 'react';
import { 
  TrendingUp, 
  Layers, 
  LineChart, 
  Code2, 
  PlayCircle, 
  Activity, 
  Cpu, 
  ShieldCheck 
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'builder' | 'backtest' | 'chart' | 'python';
  setActiveTab: (tab: 'builder' | 'backtest' | 'chart' | 'python') => void;
  spotPrice: number;
  indiaVix: number;
  atmStrike: number;
  nextExpiry: string;
  lastExecutionMs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  spotPrice,
  indiaVix,
  atmStrike,
  nextExpiry,
  lastExecutionMs,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-50 shadow-md">
      {/* Top Ticker Bar */}
      <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/40 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">NIFTY 50 INDEX:</span>
            <span className="text-emerald-400 font-mono font-semibold">₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-medium">
            <span className="text-slate-500">INDIA VIX:</span>
            <span className="text-amber-400 font-mono font-semibold">{indiaVix.toFixed(2)}</span>
            <span className="text-[10px] text-slate-500 font-normal">IV Baseline</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 font-medium">
            <span className="text-slate-500">ATM STRIKE:</span>
            <span className="text-cyan-400 font-mono font-semibold">{atmStrike}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 font-medium">
            <span className="text-slate-500">EXPIRY:</span>
            <span className="text-slate-300 font-mono">{nextExpiry || 'Weekly'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastExecutionMs !== undefined && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-[11px] text-emerald-300 font-mono">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Python Run: {lastExecutionMs}ms</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/50 border border-blue-800/40 text-[11px] text-blue-300 font-mono">
            <Cpu className="w-3 h-3 text-blue-400" />
            <span>Python 3.10 Vectorized</span>
          </div>

          <div className="hidden xl:flex items-center gap-1 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Black-Scholes Engine</span>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-inner shadow-cyan-300/30">
            <TrendingUp className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">Nifty50 Quant Terminal</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 tracking-wider">
                Multi-Leg
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-0.5">High Performance Options Backtesting & Strategy Suite</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'builder'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Strategy & Payoff</span>
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'backtest'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Historical Backtest</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'chart'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Nifty Chart & Signals</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'python'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Python Engine</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
