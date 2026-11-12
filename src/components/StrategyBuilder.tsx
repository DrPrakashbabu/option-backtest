import React from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  RotateCcw, 
  Zap, 
  Info, 
  SlidersHorizontal 
} from 'lucide-react';
import { StrategyLeg, OptionType, LegAction, StrikeType } from '../types/options';
import { STRATEGY_PRESETS, StrategyTemplate } from '../constants/presets';

interface StrategyBuilderProps {
  legs: StrategyLeg[];
  setLegs: React.Dispatch<React.SetStateAction<StrategyLeg[]>>;
  spotPrice: number;
  lotSize: number;
  setLotSize: (size: number) => void;
  parsedLegsDetails?: any[];
  onApplyPreset: (template: StrategyTemplate) => void;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  legs,
  setLegs,
  spotPrice,
  lotSize,
  setLotSize,
  parsedLegsDetails = [],
  onApplyPreset,
}) => {
  const atmStrike = Math.round(spotPrice / 50) * 50;

  const handleAddLeg = () => {
    const newLeg: StrategyLeg = {
      id: `leg-${Date.now()}-${legs.length + 1}`,
      type: 'CE',
      action: 'SELL',
      strikeType: 'OTM_1',
      strikeOffset: 0,
      lots: 1,
    };
    setLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    if (legs.length <= 1) return;
    setLegs(legs.filter((leg) => leg.id !== id));
  };

  const handleDuplicateLeg = (leg: StrategyLeg) => {
    const duplicated: StrategyLeg = {
      ...leg,
      id: `leg-${Date.now()}-${legs.length + 1}`,
    };
    setLegs([...legs, duplicated]);
  };

  const handleUpdateLeg = (id: string, updates: Partial<StrategyLeg>) => {
    setLegs(legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg)));
  };

  // Resolve strike for UI display
  const getLegDisplayStrike = (leg: StrategyLeg) => {
    if (leg.strike) return leg.strike;
    if (leg.strikeType === 'ATM') return atmStrike;
    if (leg.strikeType === 'OFFSET') return atmStrike + (leg.strikeOffset || 0);
    if (leg.strikeType.startsWith('OTM_')) {
      const step = parseInt(leg.strikeType.split('_')[1], 10) || 1;
      return leg.type === 'CE' ? atmStrike + step * 50 : atmStrike - step * 50;
    }
    if (leg.strikeType.startsWith('ITM_')) {
      const step = parseInt(leg.strikeType.split('_')[1], 10) || 1;
      return leg.type === 'CE' ? atmStrike - step * 50 : atmStrike + step * 50;
    }
    return atmStrike;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      {/* Header and Preset Strategies */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Multi-Leg Strategy Configurator</span>
            <span className="text-xs font-normal text-slate-400">({legs.length} Legs Active)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Design custom multi-leg options structures for Nifty 50 with exact strike offsets and risk parameters.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Strategy Templates:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STRATEGY_PRESETS.slice(0, 5).map((preset) => (
              <button
                key={preset.name}
                onClick={() => onApplyPreset(preset)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/50 transition-colors"
                title={preset.description}
              >
                {preset.name.split(' (')[0]}
              </button>
            ))}
            <div className="relative inline-block">
              <select
                onChange={(e) => {
                  const found = STRATEGY_PRESETS.find((p) => p.name === e.target.value);
                  if (found) onApplyPreset(found);
                }}
                value=""
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 cursor-pointer"
              >
                <option value="" disabled>More Strategies...</option>
                {STRATEGY_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name} ({preset.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lot Size & Controls Bar */}
      <div className="flex items-center justify-between py-3 text-xs text-slate-300 border-b border-slate-800/60 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Nifty Lot Size:</span>
            <select
              value={lotSize}
              onChange={(e) => setLotSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300 font-mono font-medium"
            >
              <option value={50}>50 (Standard Nifty 50 Lot)</option>
              <option value={25}>25 (Mini Lot)</option>
              <option value={75}>75 (1.5x Lot)</option>
              <option value={100}>100 (2 Lots Base)</option>
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Underlying Spot: <strong className="text-white font-mono">{spotPrice.toFixed(0)}</strong></span>
            <span className="text-slate-600">|</span>
            <span>ATM Strike: <strong className="text-cyan-400 font-mono">{atmStrike}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onApplyPreset(STRATEGY_PRESETS[0])}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded border border-slate-700/60 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Default</span>
          </button>
          <button
            onClick={handleAddLeg}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded shadow transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Leg</span>
          </button>
        </div>
      </div>

      {/* Legs Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-3">Leg</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Option Type</th>
              <th className="py-2.5 px-3">Strike Selection</th>
              <th className="py-2.5 px-3">Resolved Strike</th>
              <th className="py-2.5 px-3">Lots</th>
              <th className="py-2.5 px-3">Qty</th>
              <th className="py-2.5 px-3">Est. Price (₹)</th>
              <th className="py-2.5 px-3">Stop Loss (%)</th>
              <th className="py-2.5 px-3">Target (%)</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {legs.map((leg, idx) => {
              const displayStrike = getLegDisplayStrike(leg);
              const legDetail = parsedLegsDetails.find((d) => d.id === leg.id) || parsedLegsDetails[idx];
              const estPrice = legDetail?.price ?? (leg.price || 0);

              return (
                <tr key={leg.id} className="hover:bg-slate-800/40 transition-colors group">
                  {/* Leg index */}
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-400">
                    #{idx + 1}
                  </td>

                  {/* Action: BUY / SELL */}
                  <td className="py-2.5 px-3">
                    <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateLeg(leg.id, { action: 'BUY' })}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          leg.action === 'BUY'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLeg(leg.id, { action: 'SELL' })}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          leg.action === 'SELL'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        SELL
                      </button>
                    </div>
                  </td>

                  {/* Option Type: CE / PE */}
                  <td className="py-2.5 px-3">
                    <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateLeg(leg.id, { type: 'CE' })}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          leg.type === 'CE'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        CALL (CE)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLeg(leg.id, { type: 'PE' })}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          leg.type === 'PE'
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        PUT (PE)
                      </button>
                    </div>
                  </td>

                  {/* Strike Selection Mode */}
                  <td className="py-2.5 px-3">
                    <select
                      value={leg.strikeType}
                      onChange={(e) => handleUpdateLeg(leg.id, { strikeType: e.target.value as StrikeType })}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="ATM">ATM (At the money)</option>
                      <option value="OTM_1">OTM 1 ({leg.type === 'CE' ? '+50' : '-50'})</option>
                      <option value="OTM_2">OTM 2 ({leg.type === 'CE' ? '+100' : '-100'})</option>
                      <option value="OTM_3">OTM 3 ({leg.type === 'CE' ? '+150' : '-150'})</option>
                      <option value="OTM_4">OTM 4 ({leg.type === 'CE' ? '+200' : '-200'})</option>
                      <option value="OTM_5">OTM 5 ({leg.type === 'CE' ? '+250' : '-250'})</option>
                      <option value="ITM_1">ITM 1 ({leg.type === 'CE' ? '-50' : '+50'})</option>
                      <option value="ITM_2">ITM 2 ({leg.type === 'CE' ? '-100' : '+100'})</option>
                      <option value="OFFSET">Custom Offset Points</option>
                      <option value="DELTA">Delta Target (0.30 / 0.15)</option>
                    </select>

                    {leg.strikeType === 'OFFSET' && (
                      <input
                        type="number"
                        step={50}
                        value={leg.strikeOffset || 0}
                        onChange={(e) => handleUpdateLeg(leg.id, { strikeOffset: Number(e.target.value) })}
                        placeholder="+/- offset"
                        className="mt-1 w-24 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300 font-mono"
                      />
                    )}
                  </td>

                  {/* Resolved Strike */}
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-white text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {displayStrike}
                    </span>
                  </td>

                  {/* Lots */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateLeg(leg.id, { lots: Math.max(1, (leg.lots || 1) - 1) })}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={leg.lots || 1}
                        onChange={(e) => handleUpdateLeg(leg.id, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-10 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateLeg(leg.id, { lots: (leg.lots || 1) + 1 })}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Total Qty */}
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {(leg.lots || 1) * lotSize}
                  </td>

                  {/* Estimated Price */}
                  <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                    {estPrice > 0 ? `₹${estPrice.toFixed(2)}` : '—'}
                  </td>

                  {/* Stop Loss % */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="e.g. 25"
                        value={leg.stopLossPercent ?? ''}
                        onChange={(e) =>
                          handleUpdateLeg(leg.id, {
                            stopLossPercent: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-rose-300 font-mono"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>

                  {/* Take Profit % */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="e.g. 50"
                        value={leg.takeProfitPercent ?? ''}
                        onChange={(e) =>
                          handleUpdateLeg(leg.id, {
                            takeProfitPercent: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-emerald-300 font-mono"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleDuplicateLeg(leg)}
                        title="Duplicate Leg"
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLeg(leg.id)}
                        disabled={legs.length <= 1}
                        title="Remove Leg"
                        className={`p-1 rounded ${
                          legs.length <= 1
                            ? 'text-slate-700 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leg Greeks strip */}
      {parsedLegsDetails && parsedLegsDetails.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Individual Leg Greeks:</span>
            <div className="flex items-center gap-3 flex-wrap">
              {parsedLegsDetails.map((l, i) => (
                <div key={i} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                  <span className="text-slate-500">#{i + 1}: </span>
                  <span className={l.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>Δ {l.delta}</span>
                  <span className="text-slate-600 mx-1">|</span>
                  <span className="text-amber-400">θ ₹{l.theta}/d</span>
                  <span className="text-slate-600 mx-1">|</span>
                  <span className="text-cyan-400">ν {l.vega}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
