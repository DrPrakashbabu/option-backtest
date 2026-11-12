export type OptionType = 'CE' | 'PE';
export type LegAction = 'BUY' | 'SELL';

export type StrikeType = 
  | 'ATM' 
  | 'OTM_1' 
  | 'OTM_2' 
  | 'OTM_3' 
  | 'OTM_4' 
  | 'OTM_5' 
  | 'ITM_1' 
  | 'ITM_2' 
  | 'DELTA' 
  | 'OFFSET';

export interface StrategyLeg {
  id: string;
  type: OptionType;
  action: LegAction;
  strikeType: StrikeType;
  strikeOffset: number; // e.g. -200, +200, or delta 0.30
  strike?: number;      // resolved absolute strike (e.g. 24200)
  lots: number;
  price?: number;       // premium per share
  stopLossPercent?: number;  // optional per leg SL %
  takeProfitPercent?: number; // optional per leg TP %
}

export interface StrategyConfig {
  initialCapital: number;
  lotSize: number;
  entryDay: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'ANY';
  entryDTE: number;
  exitDTE: number;
  overallStopLoss?: number | null;
  overallTargetProfit?: number | null;
  slippagePercent: number;
  brokeragePerOrder: number;
  startDate: string;
  endDate: string;
}

export interface TradeLegResult {
  id: string;
  type: OptionType;
  action: LegAction;
  strike: number;
  qty: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

export interface TradeResult {
  id: string;
  entry_date: string;
  exit_date: string;
  expiry_date: string;
  days_held: number;
  spot_entry: number;
  spot_exit: number;
  exit_reason: string;
  gross_pnl: number;
  brokerage: number;
  slippage: number;
  net_pnl: number;
  roi_percent: number;
  legs: TradeLegResult[];
}

export interface DailyEquityPoint {
  date: string;
  capital: number;
  pnl: number;
  drawdown_pct: number;
  spot: number;
  vix: number;
}

export interface BacktestSummary {
  initial_capital: number;
  final_capital: number;
  total_pnl: number;
  total_roi_pct: number;
  cagr_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  max_drawdown_days: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  win_loss_ratio: number;
  expectancy: number;
  start_date: string;
  end_date: string;
}

export interface BacktestResponseData {
  summary: BacktestSummary;
  monthly_matrix: Record<string, Record<string, number>>;
  equity_curve: DailyEquityPoint[];
  trades: TradeResult[];
}

export interface PayoffPoint {
  spot: number;
  expiry_pnl: number;
  target_pnl: number;
}

export interface NetGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface PayoffSummary {
  net_premium: number;
  is_credit: boolean;
  max_profit: number;
  max_loss: number;
  max_profit_display: string;
  max_loss_display: string;
  risk_reward: string;
  breakevens: number[];
  pop_pct: number;
  net_greeks: NetGreeks;
}

export interface PayoffResponseData {
  summary: PayoffSummary;
  legs: any[];
  payoff_curve: PayoffPoint[];
}

export interface NiftyBar {
  date: string;
  day_name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  atm_strike: number;
  vix: number;
  weekly_expiry: string;
  is_expiry_day: boolean;
}
