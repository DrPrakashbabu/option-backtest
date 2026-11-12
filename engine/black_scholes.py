#!/usr/bin/env python3
"""
High-performance Black-Scholes Pricing & Greeks Engine for Nifty 50 Options.
Implemented with Python standard library math (zero external dependencies required).
"""
import math

SQRT_2 = math.sqrt(2.0)
SQRT_2_PI = math.sqrt(2.0 * math.pi)

def norm_cdf(x: float) -> float:
    """Standard normal cumulative distribution function."""
    return 0.5 * (1.0 + math.erf(x / SQRT_2))

def norm_pdf(x: float) -> float:
    """Standard normal probability density function."""
    return math.exp(-0.5 * x * x) / SQRT_2_PI

def calculate_d1_d2(spot: float, strike: float, time_to_expiry: float, risk_free_rate: float, iv: float):
    if time_to_expiry <= 0.00001 or iv <= 0.00001:
        return 0.0, 0.0
    vol_sqrt_t = iv * math.sqrt(time_to_expiry)
    d1 = (math.log(spot / strike) + (risk_free_rate + 0.5 * iv * iv) * time_to_expiry) / vol_sqrt_t
    d2 = d1 - vol_sqrt_t
    return d1, d2

def black_scholes_price(
    option_type: str, # "CE" or "PE"
    spot: float,
    strike: float,
    time_to_expiry: float, # in years (e.g. days / 365.0)
    risk_free_rate: float = 0.065, # 6.5% typical RBI repo rate proxy
    iv: float = 0.15 # e.g. 0.15 for 15% IV
) -> float:
    """Calculates theoretical Black-Scholes option price."""
    option_type = option_type.upper()
    if time_to_expiry <= 0.00002: # At expiry intrinsic value
        if option_type == "CE":
            return max(0.0, spot - strike)
        else:
            return max(0.0, strike - spot)

    # Extreme OTM protection
    if spot <= 0 or strike <= 0 or iv <= 0:
        if option_type == "CE":
            return max(0.0, spot - strike)
        return max(0.0, strike - spot)

    d1, d2 = calculate_d1_d2(spot, strike, time_to_expiry, risk_free_rate, iv)
    discount = math.exp(-risk_free_rate * time_to_expiry)

    if option_type == "CE":
        price = spot * norm_cdf(d1) - strike * discount * norm_cdf(d2)
    else:
        price = strike * discount * norm_cdf(-d2) - spot * norm_cdf(-d1)

    return max(0.05, price)

def calculate_greeks(
    option_type: str,
    spot: float,
    strike: float,
    time_to_expiry: float, # in years
    risk_free_rate: float = 0.065,
    iv: float = 0.15
):
    """Calculates Delta, Gamma, Theta (per day), Vega (per 1% IV)."""
    option_type = option_type.upper()
    if time_to_expiry <= 0.00002 or iv <= 0.00002:
        if option_type == "CE":
            delta = 1.0 if spot > strike else (0.5 if spot == strike else 0.0)
        else:
            delta = -1.0 if spot < strike else (-0.5 if spot == strike else 0.0)
        return {
            "delta": delta,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0
        }

    d1, d2 = calculate_d1_d2(spot, strike, time_to_expiry, risk_free_rate, iv)
    pdf_d1 = norm_pdf(d1)
    sqrt_t = math.sqrt(time_to_expiry)
    discount = math.exp(-risk_free_rate * time_to_expiry)

    # Gamma
    gamma = pdf_d1 / (spot * iv * sqrt_t) if (spot * iv * sqrt_t) > 0 else 0.0

    # Vega per 1% change in IV (0.01)
    vega = (spot * sqrt_t * pdf_d1) * 0.01

    if option_type == "CE":
        delta = norm_cdf(d1)
        # Annualized Theta
        theta_annual = -(spot * pdf_d1 * iv) / (2.0 * sqrt_t) - risk_free_rate * strike * discount * norm_cdf(d2)
    else:
        delta = norm_cdf(d1) - 1.0
        theta_annual = -(spot * pdf_d1 * iv) / (2.0 * sqrt_t) + risk_free_rate * strike * discount * norm_cdf(-d2)

    # Daily theta
    theta_daily = theta_annual / 365.0

    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta_daily, 2),
        "vega": round(vega, 2)
    }

def get_strike_by_delta(spot: float, time_to_expiry: float, iv: float, target_delta: float, option_type: str) -> int:
    """Finds strike near requested delta (e.g. 0.30 or 0.15)."""
    option_type = option_type.upper()
    atm = int(round(spot / 50.0) * 50)
    best_strike = atm
    best_diff = 999.0

    step = 50
    # Search within +- 2500 points
    for s in range(atm - 2500, atm + 2500, step):
        g = calculate_greeks(option_type, spot, s, time_to_expiry, 0.065, iv)
        d = abs(g["delta"])
        diff = abs(d - target_delta)
        if diff < best_diff:
            best_diff = diff
            best_strike = s
    return best_strike
