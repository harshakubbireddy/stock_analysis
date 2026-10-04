import xml.etree.ElementTree as ET

from fastapi import HTTPException

from app.schemas.thirteenf import Holding

MAX_HOLDINGS = 50


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


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
