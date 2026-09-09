import time
import xml.etree.ElementTree as ET

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.thirteenf import Fund, HoldingsResponse, Holding, Transaction, TransactionsResponse

SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data/{cik}/{accession}"

CACHE_TTL_SECONDS = 3600
MAX_HOLDINGS = 50

FUNDS: list[Fund] = [
    Fund(name="Berkshire Hathaway", cik="0001067983"),
    Fund(name="Bridgewater Associates", cik="0001350694"),
    Fund(name="Renaissance Technologies", cik="0001037389"),
    Fund(name="Citadel Advisors", cik="0001423053"),
    Fund(name="ARK Investment Management", cik="0001697748"),
    Fund(name="Pershing Square Capital", cik="0001336528"),
    Fund(name="Tiger Global Management", cik="0001167483"),
    Fund(name="Soros Fund Management", cik="0001029160"),
    Fund(name="Third Point", cik="0001040273"),
    Fund(name="Appaloosa Management", cik="0001006438"),
    Fund(name="Clarium Capital Management (Peter Thiel)", cik="0001282816"),
]

_holdings_cache: dict[str, tuple[float, HoldingsResponse]] = {}


def _headers() -> dict[str, str]:
    return {"User-Agent": settings.SEC_USER_AGENT}


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _fetch_submissions(cik: str) -> dict:
    try:
        response = httpx.get(
            SUBMISSIONS_URL.format(cik=cik), headers=_headers(), timeout=15.0
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to reach SEC EDGAR: {exc}"
        ) from exc


def _find_latest_filing(submissions: dict) -> tuple[str, str | None, str | None]:
    recent = submissions.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    for index, form in enumerate(forms):
        if form.startswith("13F-HR"):
            return (
                recent["accessionNumber"][index],
                recent.get("filingDate", [None])[index],
                recent.get("reportDate", [None])[index],
            )
    raise HTTPException(status_code=404, detail="No 13F-HR filing found for this CIK")


def _fetch_infotable_xml(cik: str, accession: str) -> str:
    base = ARCHIVES_URL.format(cik=str(int(cik)), accession=accession.replace("-", ""))
    try:
        index = httpx.get(f"{base}/index.json", headers=_headers(), timeout=15.0)
        index.raise_for_status()
        names = [item["name"] for item in index.json()["directory"]["item"]]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to list filing documents: {exc}"
        ) from exc

    candidates = [
        name
        for name in names
        if name.lower().endswith(".xml")
        and name not in ("primary_doc.xml", "FilingSummary.xml")
        and not name.startswith(("R", "index"))
    ]
    preferred = [n for n in candidates if "info" in n.lower() or "table" in n.lower()]
    table_name = (preferred or candidates or [None])[0]
    if table_name is None:
        raise HTTPException(
            status_code=404, detail="Information table XML not found in filing"
        )

    try:
        xml_response = httpx.get(f"{base}/{table_name}", headers=_headers(), timeout=30.0)
        xml_response.raise_for_status()
        return xml_response.text
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch information table: {exc}"
        ) from exc


def _parse_holdings_raw(xml_text: str) -> dict[str, tuple[str, str, int, int]]:
    """Parse an infoTable XML into a dict keyed by cusip (or issuer fallback).

    Returns {key: (issuer, cusip, value_usd, shares)}.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse information table XML: {exc}"
        ) from exc

    rows: list[tuple[str, str, int, int]] = []
    for entry in root.iter():
        if _local_name(entry.tag) != "infoTable":
            continue
        fields: dict[str, str] = {}
        for node in entry.iter():
            name = _local_name(node.tag)
            if name in ("nameOfIssuer", "cusip", "value", "sshPrnamt") and node.text:
                fields.setdefault(name, node.text.strip())
        value = int(fields.get("value", "0") or 0)
        shares = int(fields.get("sshPrnamt", "0") or 0)
        rows.append((fields.get("nameOfIssuer", "Unknown"), fields.get("cusip", ""), value, shares))

    # Filings before 2023 report value in thousands; newer ones report dollars.
    if rows and all(row[2] % 1000 == 0 for row in rows):
        rows = [(issuer, cusip, value * 1000, shares) for issuer, cusip, value, shares in rows]

    merged: dict[str, tuple[str, int, int]] = {}
    for issuer, cusip, value, shares in rows:
        key = cusip or issuer
        prev = merged.get(key)
        merged[key] = (
            issuer,
            (prev[1] + value) if prev else value,
            (prev[2] + shares) if prev else shares,
        )
    return {key: (issuer, key, value, shares) for key, (issuer, value, shares) in merged.items()}


def _parse_holdings(xml_text: str) -> list[Holding]:
    raw = _parse_holdings_raw(xml_text)
    rows = list(raw.values())
    rows.sort(key=lambda row: row[2], reverse=True)
    total = sum(row[2] for row in rows) or 1
    return [
        Holding(
            rank=index + 1,
            issuer=issuer.title(),
            cusip=cusip,
            value_usd=value,
            shares=shares,
            pct_of_portfolio=round(value / total * 100, 2),
        )
        for index, (issuer, cusip, value, shares) in enumerate(rows[:MAX_HOLDINGS])
    ]


def get_funds() -> list[Fund]:
    return FUNDS


def get_latest_holdings(cik: str) -> HoldingsResponse:
    cik = cik.zfill(10)
    cached = _holdings_cache.get(cik)
    if cached and time.time() - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    fund_name = next((fund.name for fund in FUNDS if fund.cik == cik), None)
    submissions = _fetch_submissions(cik)
    fund_name = fund_name or submissions.get("name", cik)
    accession, filing_date, report_date = _find_latest_filing(submissions)
    xml_text = _fetch_infotable_xml(cik, accession)
    holdings = _parse_holdings(xml_text)

    result = HoldingsResponse(
        fund_name=fund_name,
        cik=cik,
        accession_number=accession,
        filing_date=filing_date,
        period_of_report=report_date,
        total_value_usd=sum(h.value_usd for h in holdings),
        holdings=holdings,
    )
    _holdings_cache[cik] = (time.time(), result)
    return result


_transactions_cache: dict[str, tuple[float, TransactionsResponse]] = {}


def _find_latest_two_filings(submissions: dict) -> list[tuple[str, str | None, str | None]]:
    """Return the two most recent 13F-HR filings as (accession, filingDate, reportDate)."""
    recent = submissions.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    found: list[tuple[str, str | None, str | None]] = []
    for index, form in enumerate(forms):
        if form.startswith("13F-HR"):
            found.append(
                (
                    recent["accessionNumber"][index],
                    recent.get("filingDate", [None])[index],
                    recent.get("reportDate", [None])[index],
                )
            )
            if len(found) >= 2:
                break
    return found


def get_latest_transactions(cik: str) -> TransactionsResponse:
    cik = cik.zfill(10)
    cached = _transactions_cache.get(cik)
    if cached and time.time() - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    fund_name = next((fund.name for fund in FUNDS if fund.cik == cik), None)
    submissions = _fetch_submissions(cik)
    fund_name = fund_name or submissions.get("name", cik)
    filings = _find_latest_two_filings(submissions)
    if len(filings) < 2:
        raise HTTPException(
            status_code=404,
            detail="Need at least two 13F-HR filings to compute transactions.",
        )

    latest_accession, latest_filing_date, latest_period = filings[0]
    prev_accession, prev_filing_date, prev_period = filings[1]

    latest_xml = _fetch_infotable_xml(cik, latest_accession)
    prev_xml = _fetch_infotable_xml(cik, prev_accession)

    latest_holdings = _parse_holdings_raw(latest_xml)
    prev_holdings = _parse_holdings_raw(prev_xml)

    total_latest = sum(h[2] for h in latest_holdings.values()) or 1

    transactions: list[Transaction] = []
    all_keys = set(latest_holdings.keys()) | set(prev_holdings.keys())
    for key in all_keys:
        latest = latest_holdings.get(key)
        prev = prev_holdings.get(key)

        if latest and not prev:
            action = "new_buy"
            shares_prev = 0
            shares_latest = latest[3]
            value_prev = 0
            value_latest = latest[2]
        elif latest and prev:
            shares_prev = prev[3]
            shares_latest = latest[3]
            value_prev = prev[2]
            value_latest = latest[2]
            if shares_latest > shares_prev:
                action = "add"
            elif shares_latest < shares_prev:
                action = "trim"
            else:
                continue  # no change
        elif prev and not latest:
            action = "exit"
            shares_prev = prev[3]
            shares_latest = 0
            value_prev = prev[2]
            value_latest = 0
        else:
            continue

        transactions.append(
            Transaction(
                issuer=(latest or prev)[0].title(),
                cusip=key,
                action=action,
                shares_prev=shares_prev,
                shares_latest=shares_latest,
                shares_change=shares_latest - shares_prev,
                value_prev=value_prev,
                value_latest=value_latest,
                value_change=value_latest - value_prev,
                pct_of_portfolio=round(value_latest / total_latest * 100, 2),
            )
        )

    # Sort: new buys first, then adds (by value change desc), then trims, then exits
    action_order = {"new_buy": 0, "add": 1, "trim": 2, "exit": 3}
    transactions.sort(
        key=lambda t: (action_order.get(t.action, 9), -abs(t.value_change))
    )

    result = TransactionsResponse(
        fund_name=fund_name,
        cik=cik,
        latest_filing_date=latest_filing_date,
        latest_period=latest_period,
        prev_filing_date=prev_filing_date,
        prev_period=prev_period,
        transactions=transactions[:MAX_HOLDINGS],
    )
    _transactions_cache[cik] = (time.time(), result)
    return result
