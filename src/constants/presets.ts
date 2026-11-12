import { StrategyLeg } from '../types/options';

export interface StrategyTemplate {
  name: string;
  category: 'Neutral' | 'Bullish' | 'Bearish' | 'Directional';
  description: string;
  legs: StrategyLeg[];
}

export const STRATEGY_PRESETS: StrategyTemplate[] = [
  {
    name: 'Iron Condor (4 Legs)',
    category: 'Neutral',
    description: 'Defined risk, market neutral strategy selling OTM Call & Put spreads to profit from time decay and low volatility.',
    legs: [
      { id: 'leg-1', type: 'PE', action: 'BUY', strikeType: 'OTM_3', strikeOffset: 0, lots: 1 },
      { id: 'leg-2', type: 'PE', action: 'SELL', strikeType: 'OTM_1', strikeOffset: 0, lots: 1 },
      { id: 'leg-3', type: 'CE', action: 'SELL', strikeType: 'OTM_1', strikeOffset: 0, lots: 1 },
      { id: 'leg-4', type: 'CE', action: 'BUY', strikeType: 'OTM_3', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    name: 'Iron Butterfly (4 Legs)',
    category: 'Neutral',
    description: 'High credit neutral strategy selling ATM Straddle with OTM wings for protection. Max profit achieved if index expires right at ATM.',
    legs: [
      { id: 'leg-1', type: 'PE', action: 'BUY', strikeType: 'OTM_3', strikeOffset: 0, lots: 1 },
      { id: 'leg-2', type: 'PE', action: 'SELL', strikeType: 'ATM', strikeOffset: 0, lots: 1 },
      { id: 'leg-3', type: 'CE', action: 'SELL', strikeType: 'ATM', strikeOffset: 0, lots: 1 },
      { id: 'leg-4', type: 'CE', action: 'BUY', strikeType: 'OTM_3', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    name: 'Short Straddle (2 Legs)',
    category: 'Neutral',
    description: 'Aggressive theta decay strategy selling ATM Call and ATM Put with strict stop losses (typically 25%-30% SL per leg).',
    legs: [
      { id: 'leg-1', type: 'CE', action: 'SELL', strikeType: 'ATM', strikeOffset: 0, lots: 1, stopLossPercent: 25 },
      { id: 'leg-2', type: 'PE', action: 'SELL', strikeType: 'ATM', strikeOffset: 0, lots: 1, stopLossPercent: 25 },
    ],
  },
  {
    name: 'Short Strangle (2 Legs)',
    category: 'Neutral',
    description: 'Wide breakeven range strategy selling OTM Call and OTM Put. High win rate with wide buffer zone against trending moves.',
    legs: [
      { id: 'leg-1', type: 'CE', action: 'SELL', strikeType: 'OTM_2', strikeOffset: 0, lots: 1, stopLossPercent: 35 },
      { id: 'leg-2', type: 'PE', action: 'SELL', strikeType: 'OTM_2', strikeOffset: 0, lots: 1, stopLossPercent: 35 },
    ],
  },
  {
    name: 'Bull Call Spread (2 Legs)',
    category: 'Bullish',
    description: 'Moderately bullish strategy buying ATM Call and selling higher OTM Call to reduce cost basis and hedge downside risk.',
    legs: [
      { id: 'leg-1', type: 'CE', action: 'BUY', strikeType: 'ATM', strikeOffset: 0, lots: 1 },
      { id: 'leg-2', type: 'CE', action: 'SELL', strikeType: 'OTM_2', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    name: 'Bear Put Spread (2 Legs)',
    category: 'Bearish',
    description: 'Moderately bearish strategy buying ATM Put and selling lower OTM Put to profit from anticipated market downturn with defined risk.',
    legs: [
      { id: 'leg-1', type: 'PE', action: 'BUY', strikeType: 'ATM', strikeOffset: 0, lots: 1 },
      { id: 'leg-2', type: 'PE', action: 'SELL', strikeType: 'OTM_2', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    name: 'Jade Lizard (3 Legs)',
    category: 'Bullish',
    description: 'Slightly bullish or neutral credit strategy selling an OTM Put and a Bear Call Spread. Crafted so that total credit exceeds call spread width (no upside risk).',
    legs: [
      { id: 'leg-1', type: 'PE', action: 'SELL', strikeType: 'OTM_2', strikeOffset: 0, lots: 1 },
      { id: 'leg-2', type: 'CE', action: 'SELL', strikeType: 'OTM_1', strikeOffset: 0, lots: 1 },
      { id: 'leg-3', type: 'CE', action: 'BUY', strikeType: 'OTM_3', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    name: 'Long Straddle (2 Legs)',
    category: 'Directional',
    description: 'High volatility breakout strategy buying both ATM Call and ATM Put before major events (e.g. Budget, Election results, RBI policy).',
    legs: [
      { id: 'leg-1', type: 'CE', action: 'BUY', strikeType: 'ATM', strikeOffset: 0, lots: 1 },
      { id: 'leg-2', type: 'PE', action: 'BUY', strikeType: 'ATM', strikeOffset: 0, lots: 1 },
    ],
  },
];
