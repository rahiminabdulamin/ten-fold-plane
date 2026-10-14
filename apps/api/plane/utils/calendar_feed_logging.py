"""Redact secret URLs in Django, application, and ASGI/WSGI access logs."""

import logging
import re

FEED_PATH = re.compile(r"/ics/[^\s?\"']+")


class CalendarFeedLogFilter(logging.Filter):
    def filter(self, record):
        def redact(value):
            if isinstance(value, str):
                return FEED_PATH.sub("/ics/[redacted]", value)
            if isinstance(value, tuple):
                return tuple(redact(item) for item in value)
            if isinstance(value, dict):
                return {key: redact(item) for key, item in value.items()}
            return value

        record.msg = redact(record.msg)
        record.args = redact(record.args)
        if hasattr(record, "path"):
            record.path = redact(record.path)
        return True


def install_feed_log_filters():
    for name in ("django.request", "django.server", "uvicorn.access", "gunicorn.access", "plane.api", "plane.api.request"):
        logging.getLogger(name).addFilter(CalendarFeedLogFilter())
