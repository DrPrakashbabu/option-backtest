import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StrategyBuilder } from './components/StrategyBuilder';
import { PayoffViewer } from './components/PayoffViewer';
import { BacktestTerminal } from './components/BacktestTerminal';
import { NiftyChart } from './components/NiftyChart';
import { PythonCodeViewer } from './components/PythonCodeViewer';
import { 
  StrategyLeg, 
  StrategyConfig, 
  PayoffResponseData, 
  BacktestResponseData, 
  NiftyBar 
} from './types/options';
import { STRATEGY_PRESETS, StrategyTemplate } from './constants/presets';

export default function App() {
  const [activeTab, setActiveTab] = useState<'builder' | 'backtest' | 'chart' | 'python'>('builder');
  
  // Strategy Legs
  const [legs, setLegs] = useState<StrategyLeg[]>(STRATEGY_PRESETS[0].legs);
  const [lotSize, setLotSize] = useState<number>(50);

  // Market Spot & Historical Data
  const [spotPrice, setSpotPrice] = useState<number>(24205.0);
  const [indiaVix, setIndiaVix] = useState<number>(15.5);
  const [nextExpiry, setNextExpiry] = useState<string>('2024-11-07');
  const [historicalBars, setHistoricalBars] = useState<NiftyBar[]>([]);

  // Sensitivity Sliders for Payoff
  const [ivShift, setIvShift] = useState<number>(0);
  const [targetDte, setTargetDte] = useState<number>(0);
  const totalDte = 7;

  // Payoff state
  const [payoffData, setPayoffData] = useState<PayoffResponseData | null>(null);
  const [payoffLoading, setPayoffLoading] = useState<boolean>(false);

  // Backtest state
  const [config, setConfig] = useState<StrategyConfig>({
    initialCapital: 500000,
    lotSize: 50,
    entryDay: 'THURSDAY',
    entryDTE: 7,
    exitDTE: 0,
    overallStopLoss: 15000,
    overallTargetProfit: 25000,
    slippagePercent: 0.5,
    brokeragePerOrder: 20,
    startDate: '2023-01-01',
    endDate: '2024-10-31',
  });
  const [backtestResult, setBacktestResult] = useState<BacktestResponseData | null>(null);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [lastExecutionMs, setLastExecutionMs] = useState<number | undefined>(undefined);

  const atmStrike = Math.round(spotPrice / 50) * 50;

  // Load Historical Data on Mount
  useEffect(() => {
    fetch('/api/historical-data')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setHistoricalBars(res.data);
          if (res.latest) {
            setSpotPrice(res.latest.close);
            setIndiaVix(res.latest.vix);
            setNextExpiry(res.latest.weekly_expiry);
          }
        }
      })
      .catch((err) => console.error('Error fetching historical data:', err));
  }, []);

  // Compute Payoff via Python
  const fetchPayoff = useCallback(() => {
    if (legs.length === 0) return;
    setPayoffLoading(true);

    const payload = {
      spot: spotPrice,
      iv: indiaVix,
      ivShift: ivShift,
      dte: totalDte,
      targetDte: targetDte,
      lotSize: lotSize,
      legs: legs.map((leg) => {
        let strikeVal = leg.strike;
        if (!strikeVal) {
          if (leg.strikeType === 'ATM') strikeVal = atmStrike;
          else if (leg.strikeType === 'OFFSET') strikeVal = atmStrike + (leg.strikeOffset || 0);
          else if (leg.strikeType.startsWith('OTM_')) {
            const step = parseInt(leg.strikeType.split('_')[1], 10) || 1;
            strikeVal = leg.type === 'CE' ? atmStrike + step * 50 : atmStrike - step * 50;
          } else if (leg.strikeType.startsWith('ITM_')) {
            const step = parseInt(leg.strikeType.split('_')[1], 10) || 1;
            strikeVal = leg.type === 'CE' ? atmStrike - step * 50 : atmStrike + step * 50;
          } else {
            strikeVal = atmStrike;
          }
        }
        return {
          id: leg.id,
          type: leg.type,
          action: leg.action,
          strike: strikeVal,
          lots: leg.lots || 1,
          price: leg.price,
        };
      }),
    };

    fetch('/api/payoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setPayoffData(res.data);
        }
        setPayoffLoading(false);
      })
      .catch((err) => {
        console.error('Error calculating payoff:', err);
        setPayoffLoading(false);
      });
  }, [legs, spotPrice, indiaVix, ivShift, targetDte, lotSize, atmStrike]);

  // Execute Backtest via Python
  const handleRunBacktest = useCallback(() => {
    if (legs.length === 0) return;
    setBacktestLoading(true);

    const payload = {
      legs: legs,
      strategyConfig: {
        ...config,
        lotSize: lotSize,
      },
    };

    fetch('/api/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setBacktestResult(res.data);
          setLastExecutionMs(res.executionTimeMs);
        } else if (res.error) {
          console.error('Backtest error:', res.error);
        }
        setBacktestLoading(false);
      })
      .catch((err) => {
        console.error('Error executing backtest:', err);
        setBacktestLoading(false);
      });
  }, [legs, config, lotSize]);

  // Trigger payoff when legs, ivShift, targetDte, or spot change
  useEffect(() => {
    fetchPayoff();
  }, [fetchPayoff]);

  // Run backtest once initial data is ready
  useEffect(() => {
    if (historicalBars.length > 0 && !backtestResult && !backtestLoading) {
      handleRunBacktest();
    }
  }, [historicalBars.length, backtestResult, backtestLoading, handleRunBacktest]);

  const handleApplyPreset = (template: StrategyTemplate) => {
    setLegs(template.legs);
    setIvShift(0);
    setTargetDte(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        spotPrice={spotPrice}
        indiaVix={indiaVix}
        atmStrike={atmStrike}
        nextExpiry={nextExpiry}
        lastExecutionMs={lastExecutionMs}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Strategy Builder & Payoff Tab */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            <StrategyBuilder
              legs={legs}
              setLegs={setLegs}
              spotPrice={spotPrice}
              lotSize={lotSize}
              setLotSize={setLotSize}
              parsedLegsDetails={payoffData?.legs}
              onApplyPreset={handleApplyPreset}
            />

            <PayoffViewer
              payoffData={payoffData}
              loading={payoffLoading}
              spotPrice={spotPrice}
              ivShift={ivShift}
              setIvShift={setIvShift}
              targetDte={targetDte}
              setTargetDte={setTargetDte}
              totalDte={totalDte}
            />
          </div>
        )}

        {/* Historical Backtest Tab */}
        {activeTab === 'backtest' && (
          <BacktestTerminal
            legs={legs}
            config={config}
            setConfig={setConfig}
            backtestResult={backtestResult}
            loading={backtestLoading}
            onRunBacktest={handleRunBacktest}
            executionTimeMs={lastExecutionMs}
          />
        )}

        {/* Nifty 50 Chart & Trade Markers Tab */}
        {activeTab === 'chart' && (
          <NiftyChart
            historicalBars={historicalBars}
            trades={backtestResult?.trades || []}
          />
        )}

        {/* Python Code Viewer Tab */}
        {activeTab === 'python' && <PythonCodeViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500">
        Nifty 50 Options Quant Terminal • Powered by Python 3.10 Vectorized Engine & Black-Scholes Formula • Historical Data 2021-2024
      </footer>
    </div>
  );
}
