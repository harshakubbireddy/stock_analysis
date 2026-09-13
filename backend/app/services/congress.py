import io
import re
import zipfile
from datetime import date, datetime

import httpx
import pdfplumber
from fastapi import HTTPException

from app.core.cache import cached_model, get_raw, set_raw, store_model
from app.schemas.congress import CongressTrade, CongressTradesResponse, Trader

INDEX_URL = "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}FD.zip"
PDF_URL = "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{year}/{doc_id}.pdf"

CACHE_TTL_SECONDS = 6 * 3600
MAX_FILINGS = 5

TRADERS: list[Trader] = [
    Trader(name="Nancy Pelosi", last_name="Pelosi"),
    Trader(name="Josh Gottheimer", last_name="Gottheimer"),
    Trader(name="Dan Crenshaw", last_name="Crenshaw"),
    Trader(name="Marjorie Taylor Greene", last_name="Greene"),
    Trader(name="Daniel Goldman", last_name="Goldman"),
]

ROW_RE = re.compile(
    r"(?:(?P<owner>SP|JT|DC)\s+)?"
    r"(?P<asset_a>.+?)\s+"
    r"(?P<tx>P|S(?: \(partial\))?|E)\s+"
    r"(?P<date>\d{2}/\d{2}/\d{4})\s+"
    r"\d{2}/\d{2}/\d{4}\s+"
    r"(?P<min>\$[\d,]+)\s*-\s*"
    r"(?P<asset_b>.*?)"
    r"(?P<max>\$[\d,]+)"
)
TICKER_RE = re.compile(r"\(([A-Z][A-Z.]{0,9})\)\s*\[([A-Z]{2})\]")
DESC_RE = re.compile(r"D\s*:\s*(.+)")
DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")

TX_LABELS = {"P": "purchase", "S": "sale", "S (partial)": "sale_partial", "E": "exchange"}

HEADERS = {"User-Agent": "StockAnalysisApp contact@example.com"}

_index_key = "congress:index:{year}"
_pdf_key = "congress:pdf:{doc_id}"
_trades_key = "congress:trades:{name}"


def _parse_amount(value: str | None) -> int | None:
    if not value:
        return None
    digits = re.sub(r"[^\d]", "", value)
    return int(digits) if digits else None


def _to_iso(us_date: str | None) -> str | None:
    if not us_date:
        return None
    return datetime.strptime(us_date, "%m/%d/%Y").date().isoformat()


def _fetch_index(year: int) -> list[dict]:
    key = _index_key.format(year=year)
    cached = get_raw(key, ttl=CACHE_TTL_SECONDS)
    if cached is not None:
        return cached

    try:
        response = httpx.get(INDEX_URL.format(year=year), headers=HEADERS, timeout=30.0)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch House filings index: {exc}"
        ) from exc

    rows: list[dict] = []
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        with archive.open(f"{year}FD.txt") as index_file:
            for line in io.TextIOWrapper(index_file, encoding="latin-1"):
                parts = line.rstrip("\n").split("\t")
                if len(parts) < 9 or parts[4] != "P":
                    continue
                rows.append(
                    {
                        "name": f"{parts[2]} {parts[1]}".strip(),
                        "last": parts[1].strip(),
                        "state_district": parts[5],
                        "filing_date": parts[7],
                        "doc_id": parts[8],
                        "year": year,
                    }
                )
    set_raw(key, rows)
    return rows


def _parse_pdf(content: bytes) -> list[dict]:
    trades: list[dict] = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    joined = re.sub(
                        r"\s+", " ", " ".join(cell for cell in row if cell)
                    ).replace("\x00", "")
                    desc = DESC_RE.search(joined)
                    if not DATE_RE.search(joined):
                        if desc and trades:
                            previous = trades[-1]["desc"]
                            trades[-1]["desc"] = (
                                f"{previous} {desc.group(1)}" if previous else desc.group(1)
                            )
                        continue
                    match = ROW_RE.search(joined)
                    if not match:
                        continue
                    asset = re.sub(
                        r"\s+", " ", f"{match['asset_a']} {match['asset_b']}"
                    ).strip(" -")
                    ticker = TICKER_RE.search(asset)
                    trades.append(
                        {
                            "owner": match["owner"],
                            "asset": asset,
                            "ticker": ticker.group(1) if ticker else None,
                            "asset_type": ticker.group(2) if ticker else None,
                            "tx": match["tx"],
                            "date": match["date"],
                            "amount_min": _parse_amount(match["min"]),
                            "amount_max": _parse_amount(match["max"]),
                            "amount_label": f"{match['min']} - {match['max']}",
                            "desc": desc.group(1) if desc else None,
                        }
                    )
    return trades


def _get_filing_trades(year: int, doc_id: str) -> list[dict]:
    key = _pdf_key.format(doc_id=doc_id)
    cached = get_raw(key, ttl=CACHE_TTL_SECONDS)
    if cached is not None:
        return cached
    try:
        response = httpx.get(
            PDF_URL.format(year=year, doc_id=doc_id), headers=HEADERS, timeout=30.0
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch PTR filing {doc_id}: {exc}"
        ) from exc
    trades = _parse_pdf(response.content)
    set_raw(key, trades)
    return trades


def get_traders() -> list[Trader]:
    return TRADERS


def get_trades(name: str) -> CongressTradesResponse:
    query = name.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Name is required")

    key = _trades_key.format(name=query.lower())
    hit = cached_model(key, CongressTradesResponse, ttl=CACHE_TTL_SECONDS)
    if hit is not None:
        return hit

    current_year = date.today().year
    filings: list[dict] = []
    for year in (current_year, current_year - 1):
        filings.extend(
            row for row in _fetch_index(year) if query.lower() in row["last"].lower()
        )

    if not filings:
        raise HTTPException(
            status_code=404, detail=f"No House PTR filings found for '{query}'"
        )

    filings.sort(
        key=lambda row: datetime.strptime(row["filing_date"], "%m/%d/%Y"),
        reverse=True,
    )
    filings = filings[:MAX_FILINGS]

    trades: list[CongressTrade] = []
    for filing in filings:
        pdf_url = PDF_URL.format(year=filing["year"], doc_id=filing["doc_id"])
        for raw in _get_filing_trades(filing["year"], filing["doc_id"]):
            trades.append(
                CongressTrade(
                    politician=filing["name"],
                    owner=raw["owner"],
                    asset=raw["asset"],
                    ticker=raw["ticker"],
                    asset_type=raw["asset_type"],
                    transaction_type=TX_LABELS.get(raw["tx"], raw["tx"]),
                    transaction_date=_to_iso(raw["date"]),
                    amount_min=raw["amount_min"],
                    amount_max=raw["amount_max"],
                    amount_label=raw["amount_label"],
                    description=raw["desc"],
                    filing_date=_to_iso(filing["filing_date"]) or filing["filing_date"],
                    pdf_url=pdf_url,
                )
            )

    trades.sort(key=lambda trade: trade.transaction_date or "", reverse=True)
    filer = next(
        (t.name for t in TRADERS if t.last_name.lower() == query.lower()),
        filings[0]["name"],
    )
    result = CongressTradesResponse(query=query, filer=filer, trades=trades)
    store_model(key, result)
    return result
