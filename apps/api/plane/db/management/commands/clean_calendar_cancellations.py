from django.core.management.base import BaseCommand
from plane.utils.calendar_feed import clean_expired_cancellations


class Command(BaseCommand):
    help = "Delete expired calendar withdrawal records in bounded batches."

    def handle(self, *args, **options):
        self.stdout.write(f"Removed {clean_expired_cancellations()} expired calendar cancellations")
