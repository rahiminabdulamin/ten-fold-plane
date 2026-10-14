from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

import pytest
from icalendar import Calendar


def entry(**changes):
    return dict(
        uid="event-123@ten-fold.app", title="Planning; Q4, next\\year",
        description="First\nSecond\r\nBEGIN:VEVENT", location="",
        start=date(2026, 11, 1), end=date(2026, 11, 3),
        created=datetime(2026, 10, 10, 10, tzinfo=timezone.utc),
        modified=datetime(2026, 10, 14, 12, tzinfo=timezone.utc),
        sequence=4, status="CONFIRMED", **changes,
    )


def serialize(value):
    from plane.utils.icalendar import calendar_header, calendar_footer, serialize_event
    return calendar_header("Marketing") + serialize_event(value) + calendar_footer()


def test_all_day_calendar_round_trips_without_injection():
    raw = serialize(entry())
    parsed = Calendar.from_ical(raw)
    events = parsed.walk("VEVENT")
    assert len(events) == 1
    event = events[0]
    assert str(event["uid"]) == "event-123@ten-fold.app"
    assert str(event["summary"]) == "Planning; Q4, next\\year"
    assert str(event["description"]) == "First\nSecond\nBEGIN:VEVENT"
    assert event.decoded("dtstart") == date(2026, 11, 1)
    assert event.decoded("dtend") == date(2026, 11, 3)
    assert event.decoded("sequence") == 4
    assert event.decoded("dtstamp") == datetime(2026, 10, 14, 12, tzinfo=timezone.utc)
    assert b"METHOD:PUBLISH\r\n" in raw
    assert b"LOCATION:\r\n" in raw
    assert raw.endswith(b"END:VCALENDAR\r\n")


def test_utf8_folding_preserves_multibyte_characters():
    value = entry()
    value["title"] = "计划😀é" * 80
    raw = serialize(value)
    assert all(len(line) <= 75 for line in raw.split(b"\r\n"))
    raw.decode("utf-8")
    assert str(Calendar.from_ical(raw).walk("VEVENT")[0]["summary"]) == value["title"]


@pytest.mark.parametrize("zone, hour, want", [
    ("Asia/Brunei", 9, "20261101T010000Z"),
    ("Asia/Singapore", 9, "20261101T010000Z"),
    ("Europe/London", 9, "20261101T090000Z"),
])
def test_iana_times_normalize_to_utc(zone, hour, want):
    value = entry()
    value.update(start=datetime(2026, 11, 1, hour, tzinfo=ZoneInfo(zone)),
                 end=datetime(2026, 11, 1, hour + 1, tzinfo=ZoneInfo(zone)))
    assert f"DTSTART:{want}\r\n".encode() in serialize(value)


def test_dst_fold_remains_an_unambiguous_instant():
    value = entry()
    value.update(start=datetime(2026, 10, 25, 1, 30, fold=1, tzinfo=ZoneInfo("Europe/London")),
                 end=datetime(2026, 10, 25, 2, 30, tzinfo=ZoneInfo("Europe/London")))
    assert b"DTSTART:20261025T013000Z\r\n" in serialize(value)


def test_naive_timestamp_is_rejected():
    value = entry()
    value["modified"] = datetime(2026, 1, 1)
    with pytest.raises(ValueError, match="timezone"):
        serialize(value)
