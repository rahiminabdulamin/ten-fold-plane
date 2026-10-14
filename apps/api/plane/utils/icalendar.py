"""Small RFC5545 publisher. Dates stay dates; aware instants are exported in UTC."""

from collections.abc import Mapping
from datetime import date, datetime, timezone
from typing import Any


def _text(value: str | None) -> str:
    return (value or "").replace("\\", "\\\\").replace("\r\n", "\n").replace("\r", "\n").replace(
        "\n", "\\n"
    ).replace(";", "\\;").replace(",", "\\,")


def _line(value: str) -> bytes:
    # RFC5545 counts octets, including the continuation space, not characters.
    parts = []
    current = bytearray()
    for char in value:
        encoded = char.encode("utf-8")
        if len(current) + len(encoded) > 75:
            parts.append(bytes(current))
            current = bytearray(b" ")
        current.extend(encoded)
    parts.append(bytes(current))
    return b"\r\n".join(parts) + b"\r\n"


def _instant(value: datetime) -> str:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("An explicit timezone is required for timestamps")
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _date_property(name: str, value: date | datetime) -> str:
    if isinstance(value, datetime):
        return f"{name}:{_instant(value)}"
    return f"{name};VALUE=DATE:{value.strftime('%Y%m%d')}"


def calendar_header(name: str) -> bytes:
    return b"".join(_line(line) for line in (
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ten-Fold//Calendar Feed//EN",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH", f"X-WR-CALNAME:{_text(name)}",
    ))


def calendar_footer() -> bytes:
    return b"END:VCALENDAR\r\n"


def serialize_event(event: Mapping[str, Any]) -> bytes:
    if event["status"] not in {"CONFIRMED", "CANCELLED", "TENTATIVE"}:
        raise ValueError("Invalid event status")
    if not isinstance(event["sequence"], int) or event["sequence"] < 0:
        raise ValueError("Invalid event sequence")
    if isinstance(event["start"], datetime) != isinstance(event["end"], datetime):
        raise ValueError("Event start and end must use the same value type")
    if event["end"] <= event["start"]:
        raise ValueError("Event end must follow start")
    return b"".join(_line(line) for line in (
        "BEGIN:VEVENT", f"UID:{_text(event['uid'])}",
        f"DTSTAMP:{_instant(event['modified'])}",
        f"SUMMARY:{_text(event['title'])}", f"DESCRIPTION:{_text(event['description'])}",
        f"LOCATION:{_text(event.get('location'))}",
        _date_property("DTSTART", event["start"]), _date_property("DTEND", event["end"]),
        f"CREATED:{_instant(event['created'])}", f"LAST-MODIFIED:{_instant(event['modified'])}",
        f"SEQUENCE:{event['sequence']}", f"STATUS:{event['status']}", "END:VEVENT",
    ))
