#!/usr/bin/env python3
"""
Multi-leg Option Strategy Payoff Calculator & Greek Aggregator.
Computes payoff curves at Expiry and at Target DTE (T+0 or target date),
calculates Breakeven points, Max Profit, Max Loss, POP, and Net Greeks.
"""
import sys
import json
import math
import os
from black_scholes import black_scholes_price, calculate_greeks, norm_cdf

def compute_strategy_payoff(payload):
    legs = payload.get("legs", [])
    spot = float(payload.get("spot", 24000.0))
    iv_pct = float(payload.get("iv", 15.0)) / 100.0
    iv_shift_pct = float(payload.get("ivShift", 0.0)) / 100.0
    adjusted_iv = max(0.01, iv_pct + iv_shift_pct)
    
    dte = float(payload.get("dte", 7.0))
    target_dte = float(payload.get("targetDte", 0.0)) # T+0 or days elapsed
    # Days left for the T+t curve
    eval_dte = max(0.0, dte - target_dte)
    t_eval = max(0.0001, eval_dte / 365.0)
    
    lot_size = int(payload.get("lotSize", 50))
    risk_free = 0.065

    if not legs:
        return {"error": "No legs provided"}

    # Calculate net premium, net Greeks at current spot
    net_premium_inflow = 0.0
    net_delta = 0.0
    net_gamma = 0.0
    net_theta = 0.0
    net_vega = 0.0
    
    parsed_legs = []
    strikes = []

    for leg in legs:
        opt_type = leg.get("type", "CE").upper()
        action = leg.get("action", "BUY").upper()
        strike = float(leg.get("strike", spot))
        lots = int(leg.get("lots", 1))
        qty = lots * lot_size
        custom_price = leg.get("price")
        
        # Calculate theoretical entry price if not explicitly given
        t_entry = max(0.0001, dte / 365.0)
        theo_price = black_scholes_price(opt_type, spot, strike, t_entry, risk_free, adjusted_iv)
        price = float(custom_price) if custom_price is not None and float(custom_price) > 0 else theo_price

        # Greeks per share
        g = calculate_greeks(opt_type, spot, strike, t_entry, risk_free, adjusted_iv)
        multiplier = 1 if action == "BUY" else -1
        
        leg_delta = g["delta"] * multiplier * qty
        leg_gamma = g["gamma"] * multiplier * qty
        leg_theta = g["theta"] * multiplier * qty
        leg_vega = g["vega"] * multiplier * qty

        net_delta += leg_delta
        net_gamma += leg_gamma
        net_theta += leg_theta
        net_vega += leg_vega

        if action == "SELL":
            net_premium_inflow += price * qty
        else:
            net_premium_inflow -= price * qty

        strikes.append(strike)
        parsed_legs.append({
            "id": leg.get("id"),
            "type": opt_type,
            "action": action,
            "strike": strike,
            "lots": lots,
            "qty": qty,
            "price": round(price, 2),
            "delta": round(leg_delta, 2),
            "gamma": round(leg_gamma, 5),
            "theta": round(leg_theta, 2),
            "vega": round(leg_vega, 2)
        })

    # Range of spot prices to evaluate payoff: from min(strikes, spot) - 1500 to max(strikes, spot) + 1500
    min_s = min(strikes + [spot])
    max_s = max(strikes + [spot])
    lower_bound = int(math.floor((min_s - 1200) / 50.0) * 50)
    upper_bound = int(math.ceil((max_s + 1200) / 50.0) * 50)
    
    step = 25
    curve = []
    
    max_profit_expiry = -999999999.0
    max_loss_expiry = 999999999.0
    breakevens = []
    prev_expiry_pnl = None
    prev_s = None

    for s in range(lower_bound, upper_bound + step, step):
        curr_s = float(s)
        expiry_pnl = 0.0
        target_pnl = 0.0

        for leg in parsed_legs:
            action = leg["action"]
            opt_type = leg["type"]
            k = leg["strike"]
            qty = leg["qty"]
            entry_px = leg["price"]

            # Expiry value
            if opt_type == "CE":
                expiry_val = max(0.0, curr_s - k)
            else:
                expiry_val = max(0.0, k - curr_s)

            # Target date value (with eval_dte left)
            if eval_dte <= 0.01:
                target_val = expiry_val
            else:
                target_val = black_scholes_price(opt_type, curr_s, k, t_eval, risk_free, adjusted_iv)

            if action == "BUY":
                expiry_pnl += (expiry_val - entry_px) * qty
                target_pnl += (target_val - entry_px) * qty
            else: # SELL
                expiry_pnl += (entry_px - expiry_val) * qty
                target_pnl += (entry_px - target_val) * qty

        if expiry_pnl > max_profit_expiry:
            max_profit_expiry = expiry_pnl
        if expiry_pnl < max_loss_expiry:
            max_loss_expiry = expiry_pnl

        # Breakeven detection (sign crossing)
        if prev_expiry_pnl is not None and prev_s is not None:
            if (prev_expiry_pnl < 0 and expiry_pnl >= 0) or (prev_expiry_pnl >= 0 and expiry_pnl < 0):
                # Linear interpolation for zero crossing
                fraction = abs(prev_expiry_pnl) / (abs(prev_expiry_pnl) + abs(expiry_pnl))
                be = prev_s + fraction * (curr_s - prev_s)
                breakevens.append(round(be, 1))

        prev_expiry_pnl = expiry_pnl
        prev_s = curr_s

        curve.append({
            "spot": curr_s,
            "expiry_pnl": round(expiry_pnl, 2),
            "target_pnl": round(target_pnl, 2)
        })

    # Probability of profit (POP) estimation using log-normal distribution
    # If breakevens exist, calculate probability of ending in profitable zone
    pop = 50.0
    if len(breakevens) == 2:
        be_low = min(breakevens)
        be_high = max(breakevens)
        # Prob between be_low and be_high
        t_years = max(0.001, dte / 365.0)
        vol_term = adjusted_iv * math.sqrt(t_years)
        
        d2_high = (math.log(spot / be_high) + (risk_free - 0.5 * adjusted_iv * adjusted_iv) * t_years) / vol_term
        d2_low = (math.log(spot / be_low) + (risk_free - 0.5 * adjusted_iv * adjusted_iv) * t_years) / vol_term
        
        prob_inside = abs(norm_cdf(d2_low) - norm_cdf(d2_high)) * 100.0
        
        # Check if center ATM is profitable (e.g. Iron Condor / Short Straddle) or unprofitable (Long Straddle)
        atm_pnl = next((c["expiry_pnl"] for c in curve if abs(c["spot"] - spot) <= 25), 0.0)
        if atm_pnl > 0:
            pop = round(prob_inside, 1)
        else:
            pop = round(100.0 - prob_inside, 1)
    elif len(breakevens) == 1:
        be = breakevens[0]
        t_years = max(0.001, dte / 365.0)
        vol_term = adjusted_iv * math.sqrt(t_years)
        d2 = (math.log(spot / be) + (risk_free - 0.5 * adjusted_iv * adjusted_iv) * t_years) / vol_term
        
        # If bullish (call/bull spread)
        if curve[-1]["expiry_pnl"] > 0:
            pop = round(norm_cdf(d2) * 100.0, 1)
        else:
            pop = round((1.0 - norm_cdf(d2)) * 100.0, 1)

    # Detect unlimited profit / loss
    left_slope = curve[1]["expiry_pnl"] - curve[0]["expiry_pnl"]
    right_slope = curve[-1]["expiry_pnl"] - curve[-2]["expiry_pnl"]
    
    is_unlimited_profit = (left_slope < -0.1 or right_slope > 0.1)
    is_unlimited_loss = (left_slope > 0.1 or right_slope < -0.1)

    max_profit_str = "Unlimited" if is_unlimited_profit else f"₹{round(max_profit_expiry, 2):,.2f}"
    max_loss_str = "Unlimited" if is_unlimited_loss else f"₹{abs(round(max_loss_expiry, 2)):,.2f}"
    
    rr_ratio = "N/A"
    if not is_unlimited_profit and not is_unlimited_loss and abs(max_loss_expiry) > 0.1:
        rr_ratio = f"1 : {round(max_profit_expiry / abs(max_loss_expiry), 2)}"

    return {
        "summary": {
            "net_premium": round(net_premium_inflow, 2),
            "is_credit": net_premium_inflow >= 0,
            "max_profit": round(max_profit_expiry, 2),
            "max_loss": round(max_loss_expiry, 2),
            "max_profit_display": max_profit_str,
            "max_loss_display": max_loss_str,
            "risk_reward": rr_ratio,
            "breakevens": sorted(breakevens),
            "pop_pct": pop,
            "net_greeks": {
                "delta": round(net_delta, 2),
                "gamma": round(net_gamma, 5),
                "theta": round(net_theta, 2), # ₹ decay per day
                "vega": round(net_vega, 2)    # ₹ change per 1% IV
            }
        },
        "legs": parsed_legs,
        "payoff_curve": curve
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
            # Test Iron Condor
            payload = {
                "spot": 24200.0,
                "iv": 14.5,
                "dte": 7.0,
                "targetDte": 0.0,
                "lotSize": 50,
                "legs": [
                    {"id": "leg-1", "type": "PE", "action": "BUY", "strike": 23800, "lots": 1},
                    {"id": "leg-2", "type": "PE", "action": "SELL", "strike": 24000, "lots": 1},
                    {"id": "leg-3", "type": "CE", "action": "SELL", "strike": 24400, "lots": 1},
                    {"id": "leg-4", "type": "CE", "action": "BUY", "strike": 24600, "lots": 1}
                ]
            }
        else:
            payload = json.loads(input_data)

        result = compute_strategy_payoff(payload)
        print(json.dumps(result))
    except Exception as e:
        import traceback
        err = {"error": str(e), "traceback": traceback.format_exc()}
        print(json.dumps(err), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
