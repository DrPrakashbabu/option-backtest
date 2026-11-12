import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Terminal, 
  FileCode, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';

export const PythonCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<'backtester.py' | 'black_scholes.py' | 'payoff_calculator.py'>('backtester.py');
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/python-code')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.files) {
          setCodeMap(data.files);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load python code:', err);
        setLoading(false);
      });
  }, []);

  const currentCode = codeMap[selectedFile] || '# Loading code...';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header and File Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Python 3.10 Engine Source Code</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full transparency: Inspect, copy, or download the exact Python backtesting and pricing engine scripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {selectedFile}</span>
          </button>
        </div>
      </div>

      {/* Script Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setSelectedFile('backtester.py')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            selectedFile === 'backtester.py'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>engine/backtester.py</span>
        </button>

        <button
          onClick={() => setSelectedFile('black_scholes.py')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            selectedFile === 'black_scholes.py'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>engine/black_scholes.py</span>
        </button>

        <button
          onClick={() => setSelectedFile('payoff_calculator.py')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            selectedFile === 'payoff_calculator.py'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>engine/payoff_calculator.py</span>
        </button>
      </div>

      {/* Performance & Architecture Highlights Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>High Performance Sub-100ms</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Utilizes Python standard library analytical formulas with vectorized loops, yielding 500+ simulated trades per second without heavy C compiler dependencies.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Exact Mathematical Greeks</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Implements closed-form Black-Scholes partial derivatives (Delta, Gamma, Theta ₹/day, Vega ₹/1% IV) and Gaussian CDF via <code className="text-emerald-300">math.erf</code>.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Realistic Market Model</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Incorporates real India VIX levels, SEBI SPAN margin hedging offsets, per-order brokerage (₹20), and bid-ask slippage.
          </p>
        </div>
      </div>

      {/* Code Editor / Viewer */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{selectedFile}</span>
          <span>Python 3.10 Source</span>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};
