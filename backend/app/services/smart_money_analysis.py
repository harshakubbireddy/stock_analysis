"""Cross-source smart-money analysis for the AI chat tool.

Reuses the existing 13F (SEC EDGAR) and congressional-trade services,
then aggregates them into a summary, key points, conviction signals,
and per-fund activity. Each source degrades gracefully (try/except per
fund/trader) so one EDGAR failure doesn't kill the whole answer.
"""
from collections import defaultdict

from app.core.cache import cached_model, store_model
from app.schemas.smart_money import (
    BatchAction,
    CongressSummary,
    ConvictionSignal,
    FundActivity,
    SmartMoneyAnalysisResponse,
)
from app.services.congress import TRADERS, get_trades
from app.services.thirteenf import FUNDS, get_latest_transactions

CACHE_TTL_SECONDS = 3600

# Curated subset of famous managers (all available in FUNDS) so the first
# uncached call stays manageable — each fund is 3 SEC EDGAR requests.
ANALYSIS_FUNDS = [
    "Berkshire Hathaway",
    "Bridgewater Associates",
    "Citadel Advisors",
    "Renaissance Technologies",
    "ARK Investment Management",
    "Soros Fund Management",
]

ACTION_LABELS = {
    "new_buy": "new position",
    "add": "added to",
    "trim": "trimmed",
    "exit": "exited",
}

TOP_MOVES_PER_FUND = 3
MAX_SIGNALS = 6
MAX_RECENT_TRADES = 5


def _usd(value: int | float) -> str:
    """Human money: 1234567000 -> '1.23B' (negative stays negative)."""
    sign = "-" if value < 0 else ""
    value = abs(value)
    if value >= 1e9:
        return f"{sign}${value / 1e9:.1f}B"
    if value >= 1e6:
        return f"{sign}${value / 1e6:.0f}M"
    return f"{sign}${value / 1e3:.0f}K"


# ---------------------------------------------------------------- congressional
def _congress_summary() -> tuple[CongressSummary, list[str]]:
    summary = CongressSummary()
    points: list[str] = []
    recent: list[dict] = []
    ticker_values: dict[str, list[int]] = defaultdict(lambda: [0, 0])

    for trader in TRADERS:
        try:
            trades = get_trades(trader.last_name).trades
        except Exception:
            continue
        for trade in trades:
            mid = ((trade.amount_min or 0) + (trade.amount_max or 0)) / 2
            millions = mid / 1e6
            if trade.transaction_type.startswith("purchase"):
                summary.buys += 1
                summary.approx_buy_millions += millions
                ticker_values[trade.ticker or trade.asset][0] += millions
            else:
                summary.sells += 1
                summary.approx_sell_millions += millions
                ticker_values[trade.ticker or trade.asset][1] += millions
            if len(recent) < MAX_RECENT_TRADES:
                recent.append(
                    {
                        "politician": trade.politician,
                        "action": trade.transaction_type,
                        "ticker": trade.ticker,
                        "asset": trade.asset,
                        "amount": trade.amount_label,
                        "date": trade.transaction_date,
                    }
                )

    summary.approx_buy_millions = round(summary.approx_buy_millions, 1)
    summary.approx_sell_millions = round(summary.approx_sell_millions, 1)
    summary.net_millions = round(
        summary.approx_buy_millions - summary.approx_sell_millions, 1
    )
    if ticker_values:
        summary.top_buy = max(ticker_values, key=lambda t: ticker_values[t][0])
        summary.top_sell = max(ticker_values, key=lambda t: ticker_values[t][1])
    summary.recent = recent

    if summary.buys or summary.sells:
        direction = "net buying" if summary.net_millions >= 0 else "net selling"
        points.append(
            f"Capitol Hill is {direction}: ~${abs(summary.net_millions):.0f}M "
            f"across {summary.buys} buys vs {summary.sells} sells tracked."
        )
    return summary, points


# -------------------------------------------------------------- 13F institutions
def _fund_activity() -> tuple[list[FundActivity], dict[str, list[tuple[str, str, int]]]]:
    """Returns per-fund activity + issuer -> [(fund, action, value_change)] map."""
    activities: list[FundActivity] = []
    by_issuer: dict[str, list[tuple[str, str, int]]] = defaultdict(list)

    funds = [f for f in FUNDS if f.name in ANALYSIS_FUNDS]
    for fund in funds:
        try:
            tx = get_latest_transactions(fund.cik)
        except Exception:
            continue

        counts = {"new_buy": 0, "add": 0, "trim": 0, "exit": 0}
        value_in = 0
        value_out = 0
        for t in tx.transactions:
            counts[t.action] = counts.get(t.action, 0) + 1
            if t.value_change >= 0:
                value_in += t.value_change
            else:
                value_out += t.value_change
            if t.action in ("new_buy", "add"):
                by_issuer[t.issuer].append((tx.fund_name, t.action, t.value_change))

        score = round((value_in + value_out) / 1e9, 2)  # in $B, signed flow
        stance = (
            "Accumulating" if score > 0.05 else "Distributing" if score < -0.05 else "Neutral"
        )
        top_moves = sorted(
            tx.transactions, key=lambda t: abs(t.value_change), reverse=True
        )[:TOP_MOVES_PER_FUND]

        activities.append(
            FundActivity(
                fund=tx.fund_name,
                period=tx.latest_period,
                new_buys=counts["new_buy"],
                adds=counts["add"],
                trims=counts["trim"],
                exits=counts["exit"],
                flow_score=score,
                stance=stance,
                top_moves=[
                    BatchAction(
                        action=t.action,
                        issuer=t.issuer,
                        value_change=t.value_change,
                        pct_of_portfolio=t.pct_of_portfolio,
                    )
                    for t in top_moves
                ],
            )
        )
    return activities, by_issuer


def _conviction_signals(
    by_issuer: dict[str, list[tuple[str, str, int]]],
) -> list[ConvictionSignal]:
    signals: list[ConvictionSignal] = []
    for issuer, rows in by_issuer.items():
        funds = {fund for fund, _, _ in rows}
        action = "new_buy" if any(a == "new_buy" for _, a, _ in rows) else "add"
        signals.append(
            ConvictionSignal(
                issuer=issuer,
                action=action,
                fund_count=len(funds),
                combined_value_change=int(sum(value for _, _, value in rows)),
            )
        )
    signals.sort(key=lambda s: (s.fund_count, abs(s.combined_value_change)), reverse=True)
    return signals[:MAX_SIGNALS]


# ----------------------------------------------------------------- orchestration
def get_smart_money_analysis() -> SmartMoneyAnalysisResponse:
    key = "smart_money:analysis"
    hit = cached_model(key, SmartMoneyAnalysisResponse, ttl=CACHE_TTL_SECONDS)
    if hit is not None:
        return hit

    fund_activity, by_issuer = _fund_activity()
    congress, congress_points = _congress_summary()
    signals = _conviction_signals(by_issuer)

    accumulating = sum(1 for f in fund_activity if f.stance == "Accumulating")
    distributing = sum(1 for f in fund_activity if f.stance == "Distributing")

    if accumulating > distributing:
        stance = "net accumulation"
    elif distributing > accumulating:
        stance = "net distribution"
    elif accumulating == 0 and distributing == 0:
        stance = "mixed"
    else:
        stance = "split"

    verbs = {"new_buy": "opening new positions in", "add": "adding to"}
    signal_points = [
        f"{s.fund_count} fund{'s' if s.fund_count > 1 else ''} "
        f"{verbs.get(s.action, s.action + 'ing')} {s.issuer} "
        f"(~{_usd(s.combined_value_change)} combined)."
        for s in signals[:3]
    ]

    highlights = [
        f"Whales: {f.fund} is {f.stance.lower()} "
        f"({f.new_buys} new, {f.exits} exits, flow ~{_usd(f.flow_score * 1e9)})"
        for f in fund_activity
        if f.stance != "Neutral"
    ][:3]

    key_points = signal_points + highlights + congress_points

    summary = (
        f"{accumulating} of {len(fund_activity)} tracked whales are accumulating "
        f"({distributing} distributing) — overall {stance}. "
        f"Congress: {congress.buys} buys vs {congress.sells} sells "
        f"(~${abs(congress.net_millions):.0f}M {'inflow' if congress.net_millions >= 0 else 'outflow'})."
        if fund_activity
        else "Smart-money data temporarily unavailable."
    )

    result = SmartMoneyAnalysisResponse(
        summary=summary,
        institution_stance=stance,
        key_points=key_points[:6],
        signals=signals,
        fund_activity=fund_activity,
        congress=congress,
        sources={"funds": len(fund_activity), "congress_traders": len(TRADERS)},
    )
    store_model(key, result)
    return result
