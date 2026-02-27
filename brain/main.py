# ============================================================
# KAIROS PRO — The Brain
# Monte Carlo Simulation Engine + Random Forest Model
# FastAPI service for stochastic trade analysis
# ============================================================

import time
import logging
from datetime import datetime
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engine import MonteCarloEngine, TradeAnalyzer

# ─── Logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("kairos.brain")

# ─── ASCII Banner ──────────────────────────────────────────
BANNER = r"""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🧠  KAIROS BRAIN — Stochastic Prediction Engine  🧠    ║
║                                                          ║
║   Monte Carlo Paths: 100  |  Random Forest: Active       ║
║   Timeframes: 15m, 60m   |  Confidence: Statistical      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"""

# ─── Models ────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    symbol: str = Field(default="BTCUSDT", description="Trading pair symbol")
    timeframe: str = Field(default="15m", description="Prediction timeframe: 15m or 60m")
    price_data: list[float] = Field(
        ..., min_length=100, description="Historical price data (min 100 points)"
    )
    current_price: float = Field(..., gt=0, description="Current market price")


class SimulationResponse(BaseModel):
    symbol: str
    timeframe: str
    win_probability: float
    median_target_price: float
    risk_floor_price: float
    suggested_leverage: int
    suggested_direction: str
    simulation_count: int
    consensus_paths: int
    mode_target_price: float
    percentile_5_price: float
    current_price: float
    up_paths_count: int
    down_paths_count: int
    timestamp: str
    computation_ms: float


# ─── Lifespan ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(BANNER)
    logger.info("🧠 Brain engine initialized and ready.")
    yield
    logger.info("🧠 Brain engine shutting down.")


# ─── App ───────────────────────────────────────────────────

app = FastAPI(
    title="KAIROS Brain",
    description="Stochastic Monte Carlo Prediction Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Engine Instances ─────────────────────────────────────
mc_engine = MonteCarloEngine(n_simulations=100)
trade_analyzer = TradeAnalyzer()

# ─── Routes ────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "service": "kairos-brain",
        "status": "operational",
        "engine": "monte_carlo_v1",
        "simulations_per_run": 100,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/simulate", response_model=SimulationResponse)
async def simulate(req: SimulationRequest):
    """
    Run Monte Carlo simulation on provided price data.
    Returns probability distribution and trade parameters.
    """
    start = time.perf_counter()

    logger.info(f"📊 Simulation request: {req.symbol} @ {req.timeframe}")
    logger.info(f"   Price points: {len(req.price_data)} | Current: ${req.current_price:,.2f}")

    try:
        # ─── Run Monte Carlo Simulation ────────────────────
        prices = np.array(req.price_data)
        paths = mc_engine.simulate(prices, req.timeframe)

        # ─── Analyze Results ───────────────────────────────
        analysis = trade_analyzer.analyze(
            paths=paths,
            current_price=req.current_price,
            symbol=req.symbol,
            timeframe=req.timeframe,
        )

        elapsed = (time.perf_counter() - start) * 1000

        logger.info(f"✅ Simulation complete in {elapsed:.1f}ms")
        logger.info(
            f"   Probability: {analysis['win_probability']:.1f}% | "
            f"Direction: {analysis['suggested_direction']} | "
            f"Leverage: {analysis['suggested_leverage']}x"
        )

        return SimulationResponse(
            **analysis,
            computation_ms=round(elapsed, 2),
        )

    except Exception as e:
        logger.error(f"❌ Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def metrics():
    """Engine performance metrics."""
    return {
        "engine": "monte_carlo_v1",
        "total_simulations_run": mc_engine.total_runs,
        "average_computation_ms": round(mc_engine.avg_computation_ms, 2),
        "last_run": mc_engine.last_run_time,
    }
