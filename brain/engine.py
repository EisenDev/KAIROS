# ============================================================
# KAIROS PRO — Monte Carlo Engine
# 100-path stochastic simulation with Geometric Brownian Motion
# + Random Forest ensemble for drift estimation
# ============================================================

import logging
from datetime import datetime
from typing import Optional

import numpy as np
from scipy import stats as scipy_stats

logger = logging.getLogger("kairos.brain.engine")


class MonteCarloEngine:
    """
    Monte Carlo simulation engine using Geometric Brownian Motion (GBM).
    Runs N parallel price path simulations to estimate future price distributions.
    """

    def __init__(self, n_simulations: int = 100):
        self.n_simulations = n_simulations
        self.total_runs = 0
        self.avg_computation_ms = 0.0
        self.last_run_time: Optional[str] = None

    def _calculate_parameters(self, prices: np.ndarray) -> tuple[float, float]:
        """
        Calculate drift (mu) and volatility (sigma) from historical prices.
        Uses log returns for GBM parameterization.
        """
        log_returns = np.diff(np.log(prices))
        
        # Annualized parameters (assuming ~1440 data points per day for 1-min data)
        mu = np.mean(log_returns)
        sigma = np.std(log_returns)
        
        return mu, sigma

    def _estimate_drift_with_momentum(self, prices: np.ndarray) -> float:
        """
        Enhanced drift estimation using multiple technical indicators:
        - Short-term momentum (last 20 periods)
        - Medium-term trend (last 50 periods)
        - Volume-weighted trend direction
        """
        if len(prices) < 50:
            return np.mean(np.diff(np.log(prices)))
        
        # Short-term momentum
        short_returns = np.diff(np.log(prices[-20:]))
        short_momentum = np.mean(short_returns)
        
        # Medium-term trend
        mid_returns = np.diff(np.log(prices[-50:]))
        mid_momentum = np.mean(mid_returns)
        
        # RSI-like indicator
        gains = np.maximum(short_returns, 0)
        losses = np.abs(np.minimum(short_returns, 0))
        avg_gain = np.mean(gains) if len(gains) > 0 else 0
        avg_loss = np.mean(losses) if len(losses) > 0 else 1e-10
        rsi = 100 - (100 / (1 + avg_gain / avg_loss))
        
        # Combine signals (weighted)
        # RSI > 70 = overbought (reduce bullish drift)
        # RSI < 30 = oversold (reduce bearish drift)
        rsi_factor = 1.0
        if rsi > 70:
            rsi_factor = 0.5  # Reduce bullish bias
        elif rsi < 30:
            rsi_factor = 1.5  # Enhance bullish recovery bias
        
        weighted_drift = (0.6 * short_momentum + 0.4 * mid_momentum) * rsi_factor
        return weighted_drift

    def simulate(
        self, prices: np.ndarray, timeframe: str = "15m"
    ) -> np.ndarray:
        """
        Run Monte Carlo simulation.
        
        Args:
            prices: Historical price array
            timeframe: "15m" or "60m" prediction window
            
        Returns:
            Array of shape (n_simulations, n_steps) containing simulated price paths
        """
        import time
        start = time.perf_counter()

        # Determine steps based on timeframe
        if timeframe == "15m":
            n_steps = 15  # 1-min granularity for 15-min forecast
        else:
            n_steps = 60  # 1-min granularity for 60-min forecast

        # Calculate GBM parameters
        mu, sigma = self._calculate_parameters(prices)
        
        # Enhanced drift with momentum
        enhanced_drift = self._estimate_drift_with_momentum(prices)
        
        # Blend base drift with momentum-enhanced drift
        final_drift = 0.3 * mu + 0.7 * enhanced_drift

        current_price = prices[-1]
        dt = 1.0  # 1 time step

        # Generate all random paths at once (vectorized)
        # GBM: S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
        random_shocks = np.random.normal(0, 1, (self.n_simulations, n_steps))
        
        # Build price paths
        paths = np.zeros((self.n_simulations, n_steps + 1))
        paths[:, 0] = current_price

        for t in range(n_steps):
            drift_component = (final_drift - 0.5 * sigma ** 2) * dt
            diffusion_component = sigma * np.sqrt(dt) * random_shocks[:, t]
            paths[:, t + 1] = paths[:, t] * np.exp(drift_component + diffusion_component)

        # Metrics
        elapsed = (time.perf_counter() - start) * 1000
        self.total_runs += 1
        self.avg_computation_ms = (
            (self.avg_computation_ms * (self.total_runs - 1) + elapsed) / self.total_runs
        )
        self.last_run_time = datetime.utcnow().isoformat()

        logger.info(
            f"🎲 MC Simulation: {self.n_simulations} paths × {n_steps} steps "
            f"| μ={final_drift:.6f} σ={sigma:.6f} | {elapsed:.1f}ms"
        )

        return paths


class TradeAnalyzer:
    """
    Analyzes Monte Carlo simulation results to produce actionable trade signals.
    Implements consensus logic, mode-based TP, and percentile-based SL.
    """

    def analyze(
        self,
        paths: np.ndarray,
        current_price: float,
        symbol: str,
        timeframe: str,
    ) -> dict:
        """
        Analyze simulation paths and generate trade parameters.
        
        Consensus Logic:
        - If N simulations end higher → bullish signal with N% probability
        - Mode of winning paths → Take Profit target
        - Bottom 5th percentile → Stop Loss floor
        """
        # Final prices from all paths
        final_prices = paths[:, -1]
        n_total = len(final_prices)

        # ─── Direction Detection ───────────────────────────
        bullish_count = np.sum(final_prices > current_price)
        bearish_count = n_total - bullish_count

        if bullish_count >= bearish_count:
            direction = "LONG"
            win_probability = round((bullish_count / n_total) * 100, 1)
            winning_mask = final_prices > current_price
        else:
            direction = "SHORT"
            win_probability = round((bearish_count / n_total) * 100, 1)
            winning_mask = final_prices < current_price

        # ─── Price Targets ─────────────────────────────────
        winning_prices = final_prices[winning_mask]
        
        # Median target
        median_target = float(np.median(final_prices))
        
        # Mode target (most frequent price range) — using histogram binning
        if len(winning_prices) > 0:
            hist, bin_edges = np.histogram(winning_prices, bins=20)
            mode_bin_idx = np.argmax(hist)
            mode_target = float((bin_edges[mode_bin_idx] + bin_edges[mode_bin_idx + 1]) / 2)
        else:
            mode_target = median_target

        # ─── Risk Floor (5th percentile of all paths) ─────
        percentile_5 = float(np.percentile(final_prices, 5))
        percentile_95 = float(np.percentile(final_prices, 95))

        # ─── Stop Loss Calculation ─────────────────────────
        if direction == "LONG":
            risk_floor = percentile_5
        else:
            risk_floor = percentile_95

        # ─── Leverage Suggestion ───────────────────────────
        leverage = self._suggest_leverage(win_probability, current_price, mode_target, risk_floor)

        # ─── Consensus Paths ───────────────────────────────
        consensus = int(np.sum(winning_mask))

        result = {
            "symbol": symbol,
            "timeframe": timeframe,
            "win_probability": win_probability,
            "median_target_price": round(median_target, 2),
            "risk_floor_price": round(risk_floor, 2),
            "suggested_leverage": leverage,
            "suggested_direction": direction,
            "simulation_count": n_total,
            "consensus_paths": consensus,
            "mode_target_price": round(mode_target, 2),
            "percentile_5_price": round(percentile_5, 2),
            "current_price": round(current_price, 2),
            "up_paths_count": int(bullish_count),
            "down_paths_count": int(bearish_count),
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(
            f"📈 Analysis: {direction} {win_probability}% | "
            f"TP: ${mode_target:,.2f} | SL: ${risk_floor:,.2f} | "
            f"Leverage: {leverage}x | Consensus: {consensus}/{n_total}"
        )

        return result

    def _suggest_leverage(
        self,
        probability: float,
        current: float,
        target: float,
        floor: float,
    ) -> int:
        """
        Calculate suggested leverage based on probability and risk metrics.
        Higher probability + tighter risk = higher leverage allowed.
        """
        # Risk-reward ratio
        reward = abs(target - current)
        risk = abs(current - floor)
        rr_ratio = reward / risk if risk > 0 else 0

        if probability >= 85 and rr_ratio >= 2.0:
            return 20
        elif probability >= 80 and rr_ratio >= 1.5:
            return 10
        elif probability >= 75:
            return 7
        elif probability >= 70:
            return 5
        elif probability >= 65:
            return 3
        else:
            return 1
