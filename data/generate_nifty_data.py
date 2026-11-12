#!/usr/bin/env python3
"""
Generates rich, realistic historical daily data for Nifty 50 Index from 2021 to 2024.
Reflects realistic market cycles:
- 2021 bull rally from 14,000 to ~18,500
- 2022 consolidation and Ukraine/rate shock pullback (15,200 to 18,800)
- 2023 steady grinding rally from 17,000 to 21,700
- 2024 all-time highs to 26,000+, election volatility spike in June
- Weekly expiry dates (Thursdays)
- India VIX daily readings
"""
import json
import math
import os
from datetime import datetime, timedelta

def generate_nifty_history():
    start_date = datetime(2021, 1, 1)
    end_date = datetime(2024, 10, 31)
    
    current_date = start_date
    current_price = 14018.5
    current_vix = 21.1
    
    # Anchor checkpoints to ensure realistic path
    checkpoints = [
        (datetime(2021, 1, 1), 14018.0, 21.0),
        (datetime(2021, 2, 16), 15314.0, 22.5),
        (datetime(2021, 4, 22), 14300.0, 23.0),
        (datetime(2021, 10, 19), 18477.0, 17.5),
        (datetime(2021, 12, 20), 16614.0, 18.0),
        (datetime(2022, 1, 18), 18300.0, 17.5),
        (datetime(2022, 3, 8), 15860.0, 28.5),
        (datetime(2022, 4, 5), 18050.0, 18.0),
        (datetime(2022, 6, 17), 15293.0, 22.8),
        (datetime(2022, 12, 1), 18812.0, 13.4),
        (datetime(2023, 3, 20), 16988.0, 16.0),
        (datetime(2023, 7, 20), 19979.0, 11.5),
        (datetime(2023, 10, 26), 18857.0, 11.0),
        (datetime(2023, 12, 28), 21778.0, 15.0),
        (datetime(2024, 2, 15), 21910.0, 15.2),
        (datetime(2024, 5, 27), 23110.0, 24.2),
        (datetime(2024, 6, 4), 21884.0, 26.8), # Lok Sabha election day dip
        (datetime(2024, 6, 28), 24010.0, 13.8),
        (datetime(2024, 9, 27), 26216.0, 12.0),
        (datetime(2024, 10, 31), 24205.0, 15.5),
    ]

    # Pre-interpolate target prices
    days = []
    
    # Simple deterministic pseudo-random generator based on date
    def pseudo_rand(seed):
        s = math.sin(seed * 12.9898 + 78.233) * 43758.5453
        return s - math.floor(s)

    # Build daily records for all trading days (excluding weekends)
    day_idx = 0
    cp_idx = 0
    
    while current_date <= end_date:
        # Skip Saturday (5) and Sunday (6)
        if current_date.weekday() < 5:
            # Find surrounding checkpoints
            while cp_idx < len(checkpoints) - 2 and current_date > checkpoints[cp_idx + 1][0]:
                cp_idx += 1
            
            c1_date, c1_price, c1_vix = checkpoints[cp_idx]
            c2_date, c2_price, c2_vix = checkpoints[min(cp_idx + 1, len(checkpoints) - 1)]
            
            total_span = max(1, (c2_date - c1_date).days)
            elapsed = (current_date - c1_date).days
            progress = max(0.0, min(1.0, elapsed / total_span))
            
            # Base trend
            base_trend_price = c1_price + (c2_price - c1_price) * progress
            base_vix = c1_vix + (c2_vix - c1_vix) * progress
            
            # Daily fluctuation
            r1 = pseudo_rand(day_idx * 3 + 1) - 0.5
            r2 = pseudo_rand(day_idx * 3 + 2) - 0.5
            
            daily_pct = (r1 * (base_vix / 16.0) * 0.013)
            current_price = base_trend_price * (1 + daily_pct)
            current_vix = max(9.5, min(34.0, base_vix + r2 * 2.2))
            
            day_high = current_price * (1 + abs(r1) * 0.007)
            day_low = current_price * (1 - abs(r2) * 0.007)
            day_open = (day_high + day_low) / 2 + r1 * (day_high - day_low) * 0.3
            day_close = current_price
            
            # Nearest Thursday for weekly expiry
            # Thursday is weekday 3
            days_until_thursday = (3 - current_date.weekday()) % 7
            if days_until_thursday == 0 and current_date.weekday() == 3:
                current_expiry = current_date.strftime("%Y-%m-%d")
            else:
                expiry_dt = current_date + timedelta(days=days_until_thursday)
                current_expiry = expiry_dt.strftime("%Y-%m-%d")

            days.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "day_name": current_date.strftime("%A"),
                "open": round(day_open, 2),
                "high": round(day_high, 2),
                "low": round(day_low, 2),
                "close": round(day_close, 2),
                "atm_strike": int(round(day_close / 50.0) * 50),
                "vix": round(current_vix, 2),
                "weekly_expiry": current_expiry,
                "is_expiry_day": (current_date.weekday() == 3)
            })
            day_idx += 1
            
        current_date += timedelta(days=1)
        
    os.makedirs("data", exist_ok=True)
    with open("data/nifty50_data.json", "w") as f:
        json.dump(days, f, indent=2)
    print(f"Generated {len(days)} trading days of Nifty50 historical data.")

if __name__ == "__main__":
    generate_nifty_history()
