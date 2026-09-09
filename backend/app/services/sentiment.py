from datetime import datetime, timezone

import httpx
import pandas as pd
import yfinance as yf

from app.schemas.sentiment import (
    FngComparison,
    FngDetailResponse,
    SentimentCard,
    SentimentOverviewResponse,
    SentimentPoint,
)

CRYPTO_FNG_URL = "https://api.alternative.me/fng/"
CRYPTO_FNG_LIMIT = 30
CRYPTO_FNG_DETAIL_LIMIT = 365
CNN_FNG_DETAIL_PERIOD = "12m"
VIX_SPARKLINE_PERIOD = "5d"


def _fng_rating(score: float) -> str:
    if score < 25:
        return "Extreme Fear"
    if score < 45:
        return "Fear"
    if score < 55:
        return "Neutral"
    if score < 75:
        return "Greed"
    return "Extreme Greed"


def _cnn_fear_greed() -> SentimentCard:
    try:
        import fear_greed
    except ImportError:
        return SentimentCard(
            label="CNN Fear & Greed",
            rating="Unavailable",
            source="CNN",
            error="fear-greed package not installed",
        )

    try:
        snapshot = fear_greed.get()
        score = float(snapshot.get("score", 0))
        rating = str(snapshot.get("rating", "—")).title()

        history: list[SentimentPoint] = []
        for point in fear_greed.get_history(last=f"{CRYPTO_FNG_LIMIT}d"):
            date_str = point.date.strftime("%Y-%m-%d") if hasattr(point.date, "strftime") else str(point.date)
            history.append(SentimentPoint(date=date_str, score=float(point.score)))

        return SentimentCard(
            label="CNN Fear & Greed",
            value=round(score, 1),
            rating=rating,
            source="CNN",
            history=history,
        )
    except Exception as exc:
        return SentimentCard(
            label="CNN Fear & Greed",
            rating="Unavailable",
            source="CNN",
            error=str(exc),
        )


def _crypto_fear_greed() -> SentimentCard:
    try:
        response = httpx.get(
            CRYPTO_FNG_URL,
            params={"limit": CRYPTO_FNG_LIMIT},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json().get("data", [])

        if not payload:
            return SentimentCard(
                label="Crypto Fear & Greed",
                rating="Unavailable",
                source="alternative.me",
                error="No data returned",
            )

        latest = payload[0]
        score = float(latest.get("value", 0))
        rating = str(latest.get("value_classification", "—")).title()

        history: list[SentimentPoint] = []
        for point in payload:
            timestamp = int(point.get("timestamp", 0))
            date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d")
            history.append(SentimentPoint(date=date, score=float(point.get("value", 0))))

        return SentimentCard(
            label="Crypto Fear & Greed",
            value=round(score, 1),
            rating=rating,
            source="alternative.me",
            history=history,
        )
    except Exception as exc:
        return SentimentCard(
            label="Crypto Fear & Greed",
            rating="Unavailable",
            source="alternative.me",
            error=str(exc),
        )


def _vix() -> SentimentCard:
    try:
        data = yf.download(
            "^VIX",
            period=VIX_SPARKLINE_PERIOD,
            interval="1d",
            group_by="ticker",
            progress=False,
            auto_adjust=False,
        )
        multi = isinstance(data.columns, pd.MultiIndex)
        closes = data["^VIX"]["Close"] if multi else data["Close"]
        closes = closes.dropna()

        if len(closes) == 0:
            return SentimentCard(
                label="Volatility (VIX)",
                rating="Unavailable",
                source="Yahoo Finance",
                error="No data returned",
            )

        latest = float(closes.iloc[-1])
        rating = (
            "Low Volatility"
            if latest < 15
            else "Normal"
            if latest < 20
            else "Elevated"
            if latest < 30
            else "High Volatility"
        )

        history: list[SentimentPoint] = []
        for date, value in closes.items():
            history.append(
                SentimentPoint(
                    date=date.strftime("%Y-%m-%d"),
                    score=round(float(value), 2),
                )
            )

        return SentimentCard(
            label="Volatility (VIX)",
            value=round(latest, 2),
            rating=rating,
            source="Yahoo Finance",
            history=history,
        )
    except Exception as exc:
        return SentimentCard(
            label="Volatility (VIX)",
            rating="Unavailable",
            source="Yahoo Finance",
            error=str(exc),
        )


def get_sentiment_overview() -> SentimentOverviewResponse:
    return SentimentOverviewResponse(
        cards=[
            _vix(),
        ]
    )


def _crypto_fng_comparison(payload: list[dict], label: str, days_back: int) -> FngComparison | None:
    if len(payload) <= days_back:
        return None
    point = payload[days_back]
    timestamp = int(point.get("timestamp", 0))
    score = float(point.get("value", 0))
    return FngComparison(
        label=label,
        date=datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d"),
        score=score,
        rating=str(point.get("value_classification") or _fng_rating(score)).title(),
    )


def get_crypto_fng_detail() -> FngDetailResponse:
    try:
        response = httpx.get(
            CRYPTO_FNG_URL,
            params={"limit": CRYPTO_FNG_DETAIL_LIMIT, "format": "json"},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json().get("data", [])

        if not payload:
            return FngDetailResponse(
                rating="Unavailable",
                source="alternative.me",
                error="No data returned",
            )

        latest = payload[0]
        score = float(latest.get("value", 0))
        latest_ts = int(latest.get("timestamp", 0))

        history: list[SentimentPoint] = []
        for point in reversed(payload):
            timestamp = int(point.get("timestamp", 0))
            date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d")
            history.append(SentimentPoint(date=date, score=float(point.get("value", 0))))

        comparisons = [
            c
            for c in [
                _crypto_fng_comparison(payload, "Previous close", 1),
                _crypto_fng_comparison(payload, "1 week ago", 7),
                _crypto_fng_comparison(payload, "1 month ago", 30),
                _crypto_fng_comparison(payload, "1 year ago", 364),
            ]
            if c is not None
        ]

        return FngDetailResponse(
            value=round(score, 1),
            rating=str(latest.get("value_classification") or _fng_rating(score)).title(),
            source="alternative.me",
            last_updated=datetime.fromtimestamp(latest_ts, tz=timezone.utc).isoformat(),
            comparisons=comparisons,
            history=history,
        )
    except Exception as exc:
        return FngDetailResponse(
            rating="Unavailable",
            source="alternative.me",
            error=str(exc),
        )


def _cnn_fng_comparison(points: list, label: str, days_back: int) -> FngComparison | None:
    if len(points) <= days_back:
        return None
    point = points[days_back]
    score = float(point.score)
    return FngComparison(
        label=label,
        date=point.date.strftime("%Y-%m-%d") if hasattr(point.date, "strftime") else str(point.date),
        score=score,
        rating=str(getattr(point, "rating", "") or _fng_rating(score)).title(),
    )


def get_cnn_fng_detail() -> FngDetailResponse:
    try:
        import fear_greed
    except ImportError:
        return FngDetailResponse(
            rating="Unavailable",
            source="CNN",
            error="fear-greed package not installed",
        )

    try:
        snapshot = fear_greed.get()
        score = float(snapshot.get("score", 0))
        rating = str(snapshot.get("rating", "") or _fng_rating(score)).title()

        raw = fear_greed.get_history(last=CNN_FNG_DETAIL_PERIOD)
        points = sorted(raw, key=lambda p: p.date, reverse=True)

        history: list[SentimentPoint] = []
        for point in reversed(points):
            date_str = point.date.strftime("%Y-%m-%d") if hasattr(point.date, "strftime") else str(point.date)
            history.append(SentimentPoint(date=date_str, score=float(point.score)))

        last_idx = len(points) - 1
        comparisons = [
            c
            for c in [
                _cnn_fng_comparison(points, "Previous close", 1),
                _cnn_fng_comparison(points, "1 week ago", 5),
                _cnn_fng_comparison(points, "1 month ago", 21),
                _cnn_fng_comparison(points, "1 year ago", last_idx),
            ]
            if c is not None
        ]

        latest_date = points[0].date if points else None
        return FngDetailResponse(
            value=round(score, 1),
            rating=rating,
            source="CNN",
            last_updated=latest_date.isoformat() if hasattr(latest_date, "isoformat") else None,
            comparisons=comparisons,
            history=history,
        )
    except Exception as exc:
        return FngDetailResponse(
            rating="Unavailable",
            source="CNN",
            error=str(exc),
        )
