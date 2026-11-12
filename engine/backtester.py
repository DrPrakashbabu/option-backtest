#!/usr/bin/env python3
"""
Nifty 50 Options Multi-Leg Backtesting Engine.
Executes high-speed backtests with realistic options pricing, Greeks, transaction costs,
and risk management triggers (SL, TP, MTM SL, trailing).
"""
import sys
import json
import math
import os
from datetime import datetime, timedelta
from black_scholes import black_scholes_price, calculate_greeks, get_strike_by_delta

def load_historical_data(data_path="data/nifty50_data.json"):
    if not os.path.exists(data_path):
        # Fallback to parent path if called from engine dir
        alt_path = os.path.join(os.path.dirname(__file__), "..", data_path)
        if os.path.exists(alt_path):
            data_path = alt_path
        else:
            raise FileNotFoundError(f"Could not find historical data at {data_path}")
            
    with open(data_path, "r") as f:
        return json.load(f)

def resolve_strike(spot: float, leg: dict, dte_days: float, vix: float) -> int:
    strike_type = leg.get("strikeType", "ATM").upper()
    atm = int(round(spot / 50.0) * 50)
    opt_type = leg.get("type", "CE").upper()

    if strike_type == "ATM":
        return atm
    elif strike_type == "OFFSET":
        offset = int(leg.get("strikeOffset", 0))
        return atm + offset
    elif strike_type.startswith("OTM_"):
        try:
            steps = int(strike_type.split("_")[1])
        except Exception:
            steps = 1
        if opt_type == "CE":
            return atm + (steps * 50)
        else:
            return atm - (steps * 50)
    elif strike_type.startswith("ITM_"):
        try:
            steps = int(strike_type.split("_")[1])
        except Exception:
            steps = 1
        if opt_type == "CE":
            return atm - (steps * 50)
        else:
            return atm + (steps * 50)
    elif strike_type == "DELTA":
        target_delta = float(leg.get("strikeOffset", 0.30))
        t_years = max(0.001, dte_days / 365.0)
        return get_strike_by_delta(spot, t_years, vix / 100.0, target_delta, opt_type)
    return atm

def run_backtest(config_dict, historical_bars):
    legs_config = config_dict.get("legs", [])
    strat_cfg = config_dict.get("strategyConfig", {})
    
    initial_capital = float(strat_cfg.get("initialCapital", 500000))
    lot_size = int(strat_cfg.get("lotSize", 50))
    slippage_pct = float(strat_cfg.get("slippagePercent", 0.5)) / 100.0
    brokerage_per_order = float(strat_cfg.get("brokeragePerOrder", 20.0))
    
    start_date_str = strat_cfg.get("startDate", "2021-01-01")
    end_date_str = strat_cfg.get("endDate", "2024-10-31")
    
    entry_day = strat_cfg.get("entryDay", "ANY").upper() # MONDAY, THURSDAY, ANY
    entry_dte = int(strat_cfg.get("entryDTE", 7))
    exit_dte = int(strat_cfg.get("exitDTE", 0))
    
    overall_sl = strat_cfg.get("overallStopLoss")
    if overall_sl is not None and str(overall_sl).strip() != "":
        overall_sl = float(overall_sl)
    else:
        overall_sl = None

    overall_tp = strat_cfg.get("overallTargetProfit")
    if overall_tp is not None and str(overall_tp).strip() != "":
        overall_tp = float(overall_tp)
    else:
        overall_tp = None

    # Filter bars by date
    bars = [b for b in historical_bars if start_date_str <= b["date"] <= end_date_str]
    if not bars:
        return {"error": "No historical data in selected date range"}

    current_capital = initial_capital
    peak_capital = initial_capital
    max_drawdown = 0.0
    max_dd_duration = 0
    current_dd_duration = 0
    
    daily_equity_curve = []
    trades = []
    
    active_position = None
    trade_counter = 1

    for bar_idx, bar in enumerate(bars):
        bar_date = bar["date"]
        bar_spot = bar["close"]
        bar_vix = bar["vix"]
        bar_day = bar["day_name"].upper()
        expiry_date_str = bar["weekly_expiry"]
        
        # Calculate DTE in calendar days
        dt_curr = datetime.strptime(bar_date, "%Y-%m-%d")
        dt_exp = datetime.strptime(expiry_date_str, "%Y-%m-%d")
        current_dte = max(0, (dt_exp - dt_curr).days)
        
        # Manage active trade if open
        if active_position is not None:
            # Mark to market and check exits
            pos = active_position
            pos_days_held = (dt_curr - datetime.strptime(pos["entry_date"], "%Y-%m-%d")).days
            pos_dte = max(0, (datetime.strptime(pos["expiry_date"], "%Y-%m-%d") - dt_curr).days)
            
            # Reprice active legs on today's close
            mtm_pnl = 0.0
            t_years = max(0.0001, pos_dte / 365.0)
            
            legs_current = []
            leg_stop_hit = False
            
            for leg_state in pos["legs"]:
                opt_type = leg_state["type"]
                strike = leg_state["strike"]
                action = leg_state["action"]
                qty = leg_state["qty"]
                entry_px = leg_state["entry_price"]
                
                # Black-scholes pricing or intrinsic at expiry
                if pos_dte == 0:
                    curr_px = max(0.0, bar_spot - strike) if opt_type == "CE" else max(0.0, strike - bar_spot)
                else:
                    curr_px = black_scholes_price(opt_type, bar_spot, strike, t_years, 0.065, bar_vix / 100.0)
                
                # Leg P&L
                if action == "SELL":
                    leg_pnl = (entry_px - curr_px) * qty
                    # Check per-leg stop loss
                    sl_pct = leg_state.get("stopLossPercent")
                    if sl_pct and sl_pct > 0 and curr_px >= entry_px * (1 + sl_pct / 100.0):
                        leg_stop_hit = True
                    tp_pct = leg_state.get("takeProfitPercent")
                    if tp_pct and tp_pct > 0 and curr_px <= entry_px * (1 - tp_pct / 100.0):
                        leg_stop_hit = True
                else: # BUY
                    leg_pnl = (curr_px - entry_px) * qty
                    sl_pct = leg_state.get("stopLossPercent")
                    if sl_pct and sl_pct > 0 and curr_px <= entry_px * (1 - sl_pct / 100.0):
                        leg_stop_hit = True
                    tp_pct = leg_state.get("takeProfitPercent")
                    if tp_pct and tp_pct > 0 and curr_px >= entry_px * (1 + tp_pct / 100.0):
                        leg_stop_hit = True

                mtm_pnl += leg_pnl
                legs_current.append({
                    **leg_state,
                    "current_price": round(curr_px, 2),
                    "pnl": round(leg_pnl, 2)
                })

            # Check exit conditions
            exit_reason = None
            if pos_dte <= exit_dte:
                exit_reason = "Expiry Reach" if pos_dte == 0 else "Exit DTE Reached"
            elif overall_sl is not None and mtm_pnl <= -abs(overall_sl):
                exit_reason = f"Strategy SL Triggered (-₹{abs(overall_sl):,.0f})"
            elif overall_tp is not None and mtm_pnl >= abs(overall_tp):
                exit_reason = f"Target Profit Triggered (+₹{abs(overall_tp):,.0f})"
            elif leg_stop_hit:
                exit_reason = "Leg Stop Loss / Target Hit"
            elif bar_idx == len(bars) - 1:
                exit_reason = "End of Backtest Period"

            if exit_reason is not None:
                # Close position
                total_brokerage = brokerage_per_order * len(pos["legs"]) * 2
                slippage_cost = 0.0
                for l in legs_current:
                    slippage_cost += l["current_price"] * l["qty"] * slippage_pct
                
                net_pnl = mtm_pnl - total_brokerage - slippage_cost
                current_capital += net_pnl
                
                trades.append({
                    "id": f"T-{trade_counter:03d}",
                    "entry_date": pos["entry_date"],
                    "exit_date": bar_date,
                    "expiry_date": pos["expiry_date"],
                    "days_held": pos_days_held,
                    "spot_entry": pos["spot_entry"],
                    "spot_exit": bar_spot,
                    "exit_reason": exit_reason,
                    "gross_pnl": round(mtm_pnl, 2),
                    "brokerage": round(total_brokerage, 2),
                    "slippage": round(slippage_cost, 2),
                    "net_pnl": round(net_pnl, 2),
                    "roi_percent": round((net_pnl / pos["margin_required"]) * 100.0, 2) if pos["margin_required"] > 0 else 0.0,
                    "legs": legs_current
                })
                trade_counter += 1
                active_position = None

        # Check entry condition if no active trade
        if active_position is None and bar_idx < len(bars) - 1:
            day_matches = (entry_day == "ANY" or entry_day == bar_day)
            
            # Determine target expiry date and DTE
            if bar["is_expiry_day"] and entry_dte > 0:
                # Entering on Thursday for next week's expiry
                target_expiry_dt = dt_curr + timedelta(days=7)
                target_expiry_str = target_expiry_dt.strftime("%Y-%m-%d")
                trade_dte = 7
            else:
                target_expiry_str = expiry_date_str
                trade_dte = current_dte

            dte_matches = (trade_dte <= entry_dte and trade_dte >= exit_dte)
            
            if day_matches and dte_matches:
                # Enter new trade
                legs_entered = []
                total_entry_premium_inflow = 0.0
                t_years = max(0.001, trade_dte / 365.0)
                
                for leg in legs_config:
                    strike = resolve_strike(bar_spot, leg, current_dte, bar_vix)
                    opt_type = leg["type"].upper()
                    action = leg["action"].upper()
                    qty = int(leg.get("lots", 1)) * lot_size
                    
                    price = black_scholes_price(opt_type, bar_spot, strike, t_years, 0.065, bar_vix / 100.0)
                    # Apply entry slippage
                    if action == "BUY":
                        exec_px = price * (1.0 + slippage_pct)
                        total_entry_premium_inflow -= exec_px * qty
                    else:
                        exec_px = price * (1.0 - slippage_pct)
                        total_entry_premium_inflow += exec_px * qty
                        
                    legs_entered.append({
                        "id": leg.get("id", f"{opt_type}-{strike}"),
                        "type": opt_type,
                        "action": action,
                        "strike": strike,
                        "qty": qty,
                        "entry_price": round(exec_px, 2),
                        "stopLossPercent": leg.get("stopLossPercent"),
                        "takeProfitPercent": leg.get("takeProfitPercent")
                    })
                
                # Approximate margin requirement for multi-leg Nifty strategy (SEBI span + exposure)
                # Typically ~₹1,20,000 for straddle/strangle, ~₹50,000 for spread/condor
                sell_legs = sum(1 for l in legs_entered if l["action"] == "SELL")
                buy_legs = sum(1 for l in legs_entered if l["action"] == "BUY")
                
                if sell_legs > 0 and buy_legs > 0:
                    margin_req = max(40000, 60000 * sell_legs * (lot_size / 50.0))
                elif sell_legs > 0:
                    margin_req = max(80000, 110000 * sell_legs * (lot_size / 50.0))
                else:
                    margin_req = max(15000, abs(total_entry_premium_inflow))

                active_position = {
                    "entry_date": bar_date,
                    "expiry_date": target_expiry_str,
                    "spot_entry": bar_spot,
                    "vix_entry": bar_vix,
                    "legs": legs_entered,
                    "margin_required": margin_req
                }

        # Track daily equity & drawdown
        if current_capital > peak_capital:
            peak_capital = current_capital
            current_dd_duration = 0
        else:
            current_dd_duration += 1
            
        drawdown_val = peak_capital - current_capital
        drawdown_pct = (drawdown_val / peak_capital) * 100.0 if peak_capital > 0 else 0.0
        
        if drawdown_pct > max_drawdown:
            max_drawdown = drawdown_pct
        if current_dd_duration > max_dd_duration:
            max_dd_duration = current_dd_duration

        daily_equity_curve.append({
            "date": bar_date,
            "capital": round(current_capital, 2),
            "pnl": round(current_capital - initial_capital, 2),
            "drawdown_pct": round(drawdown_pct, 2),
            "spot": bar_spot,
            "vix": bar_vix
        })

    # Close any open trade at end
    if active_position is not None:
        pos = active_position
        total_brokerage = brokerage_per_order * len(pos["legs"]) * 2
        net_pnl = 0.0 - total_brokerage
        current_capital += net_pnl
        trades.append({
            "id": f"T-{trade_counter:03d}",
            "entry_date": pos["entry_date"],
            "exit_date": bars[-1]["date"],
            "expiry_date": pos["expiry_date"],
            "days_held": (datetime.strptime(bars[-1]["date"], "%Y-%m-%d") - datetime.strptime(pos["entry_date"], "%Y-%m-%d")).days,
            "spot_entry": pos["spot_entry"],
            "spot_exit": bars[-1]["close"],
            "exit_reason": "End of Backtest Period",
            "gross_pnl": 0.0,
            "brokerage": total_brokerage,
            "slippage": 0.0,
            "net_pnl": round(net_pnl, 2),
            "roi_percent": 0.0,
            "legs": pos["legs"]
        })

    # Compute comprehensive metrics
    total_trades = len(trades)
    winning_trades = [t for t in trades if t["net_pnl"] > 0]
    losing_trades = [t for t in trades if t["net_pnl"] < 0]
    
    total_pnl = current_capital - initial_capital
    total_roi = (total_pnl / initial_capital) * 100.0
    
    win_rate = (len(winning_trades) / total_trades * 100.0) if total_trades > 0 else 0.0
    gross_profit = sum(t["net_pnl"] for t in winning_trades)
    gross_loss = abs(sum(t["net_pnl"] for t in losing_trades))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)
    
    avg_win = (gross_profit / len(winning_trades)) if winning_trades else 0.0
    avg_loss = (gross_loss / len(losing_trades)) if losing_trades else 0.0
    win_loss_ratio = (avg_win / avg_loss) if avg_loss > 0 else 0.0
    expectancy = (total_pnl / total_trades) if total_trades > 0 else 0.0
    
    # CAGR calculation
    days_span = max(1, (datetime.strptime(bars[-1]["date"], "%Y-%m-%d") - datetime.strptime(bars[0]["date"], "%Y-%m-%d")).days)
    years_span = days_span / 365.25
    if years_span > 0 and current_capital > 0:
        cagr = (math.pow(current_capital / initial_capital, 1.0 / years_span) - 1.0) * 100.0
    else:
        cagr = 0.0

    # Daily returns volatility and Sharpe
    daily_returns = []
    for i in range(1, len(daily_equity_curve)):
        prev_cap = daily_equity_curve[i-1]["capital"]
        ret = (daily_equity_curve[i]["capital"] - prev_cap) / prev_cap if prev_cap > 0 else 0.0
        daily_returns.append(ret)
        
    if daily_returns:
        mean_ret = sum(daily_returns) / len(daily_returns)
        var = sum((r - mean_ret) ** 2 for r in daily_returns) / len(daily_returns)
        std_ret = math.sqrt(var)
        annualized_ret = mean_ret * 252.0
        annualized_vol = std_ret * math.sqrt(252.0)
        risk_free = 0.065
        sharpe = ((annualized_ret - risk_free) / annualized_vol) if annualized_vol > 0 else 0.0
        
        # Sortino
        neg_rets = [r for r in daily_returns if r < 0]
        downside_var = sum(r ** 2 for r in neg_rets) / len(daily_returns) if neg_rets else 0.0001
        downside_std = math.sqrt(downside_var) * math.sqrt(252.0)
        sortino = ((annualized_ret - risk_free) / downside_std) if downside_std > 0 else 0.0
    else:
        sharpe = 0.0
        sortino = 0.0

    # Monthly breakdown matrix
    monthly_pnl = {}
    for t in trades:
        exit_dt = datetime.strptime(t["exit_date"], "%Y-%m-%d")
        y = str(exit_dt.year)
        m = exit_dt.strftime("%b") # Jan, Feb...
        if y not in monthly_pnl:
            monthly_pnl[y] = {}
        monthly_pnl[y][m] = monthly_pnl[y].get(m, 0.0) + t["net_pnl"]

    # Round monthly pnl
    for y in monthly_pnl:
        for m in monthly_pnl[y]:
            monthly_pnl[y][m] = round(monthly_pnl[y][m], 2)

    return {
        "summary": {
            "initial_capital": initial_capital,
            "final_capital": round(current_capital, 2),
            "total_pnl": round(total_pnl, 2),
            "total_roi_pct": round(total_roi, 2),
            "cagr_pct": round(cagr, 2),
            "sharpe_ratio": round(sharpe, 2),
            "sortino_ratio": round(sortino, 2),
            "max_drawdown_pct": round(max_drawdown, 2),
            "max_drawdown_days": max_dd_duration,
            "total_trades": total_trades,
            "winning_trades": len(winning_trades),
            "losing_trades": len(losing_trades),
            "win_rate_pct": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "win_loss_ratio": round(win_loss_ratio, 2),
            "expectancy": round(expectancy, 2),
            "start_date": bars[0]["date"],
            "end_date": bars[-1]["date"]
        },
        "monthly_matrix": monthly_pnl,
        "equity_curve": daily_equity_curve,
        "trades": trades
    }

def main():
    try:
        input_data = ""
        if len(sys.argv) > 1 and sys.argv[1] == "--test":
            input_data = ""
        elif len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            with open(sys.argv[1], "r") as f:
                input_data = f.read()
        elif not sys.stdin.isatty():
            input_data = sys.stdin.read()

        if not input_data.strip():
            # Default test strategy: Weekly Short Straddle with 25% SL
            config = {
                "legs": [
                    {"id": "CE-Leg", "type": "CE", "action": "SELL", "strikeType": "ATM", "strikeOffset": 0, "lots": 1, "stopLossPercent": 25},
                    {"id": "PE-Leg", "type": "PE", "action": "SELL", "strikeType": "ATM", "strikeOffset": 0, "lots": 1, "stopLossPercent": 25}
                ],
                "strategyConfig": {
                    "initialCapital": 500000,
                    "lotSize": 50,
                    "entryDay": "THURSDAY",
                    "entryDTE": 7,
                    "exitDTE": 0,
                    "slippagePercent": 0.5,
                    "brokeragePerOrder": 20,
                    "startDate": "2023-01-01",
                    "endDate": "2024-10-31"
                }
            }
        else:
            config = json.loads(input_data)

        historical = load_historical_data()
        result = run_backtest(config, historical)
        print(json.dumps(result))
    except Exception as e:
        import traceback
        err = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(err), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
