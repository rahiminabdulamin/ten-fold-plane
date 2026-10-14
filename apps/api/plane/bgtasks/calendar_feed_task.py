from celery import shared_task


@shared_task
def clean_calendar_cancellations():
    from plane.utils.calendar_feed import clean_expired_cancellations
    return clean_expired_cancellations()
