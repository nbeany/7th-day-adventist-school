from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Deletes every non-superuser account and all academic/demo data "
        "(students, guardians, teachers, sections, terms, grades, "
        "attendance, invoices, announcements). Superuser accounts are kept. "
        "Run this once, before real users touch a database that was set up "
        "with seed_db.py/seed.py demo data - never against real data."
    )

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help='Skip the confirmation prompt.')

    def handle(self, *args, **options):
        User = get_user_model()
        from academics.models import Term, GradeLevel, Subject, Section
        from sis.models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment
        from timetable.models import Period, ClassSchedule
        from schools.models import Announcement
        from finance.models import FeeCategory
        from audit.models import AuditLog

        non_superusers = User.objects.exclude(is_superuser=True)

        counts = {
            'Non-superuser users (cascades to their profiles, grades, attendance, invoices...)': non_superusers.count(),
            'Sections': Section.objects.count(),
            'Subjects': Subject.objects.count(),
            'Grade levels': GradeLevel.objects.count(),
            'Terms': Term.objects.count(),
            'Periods': Period.objects.count(),
            'Class schedules': ClassSchedule.objects.count(),
            'Announcements': Announcement.objects.count(),
            'Fee categories': FeeCategory.objects.count(),
            'Audit log entries': AuditLog.objects.count(),
        }

        self.stdout.write(self.style.WARNING('This will PERMANENTLY delete:'))
        for label, count in counts.items():
            self.stdout.write(f'  {label}: {count}')
        self.stdout.write(self.style.WARNING('Superuser accounts are kept as-is.'))

        if not options['yes']:
            confirm = input("\nType 'yes' to permanently delete the above: ")
            if confirm != 'yes':
                raise CommandError('Aborted - nothing was deleted.')

        # Mirrors seed_db.py's own clear_db(), extended with the models it
        # didn't seed (Announcement, FeeCategory, AuditLog). Deleting
        # sections/subjects/terms/users cascades through everything tied to
        # them (enrollments, grades, attendance, invoices, payments), so
        # those don't need to be listed separately.
        ClassSchedule.objects.all().delete()
        Period.objects.all().delete()
        StudentGuardianRelation.objects.all().delete()
        StudentEnrollment.objects.all().delete()
        StudentProfile.objects.all().delete()
        GuardianProfile.objects.all().delete()
        Section.objects.all().delete()
        Subject.objects.all().delete()
        GradeLevel.objects.all().delete()
        Term.objects.all().delete()
        Announcement.objects.all().delete()
        FeeCategory.objects.all().delete()
        AuditLog.objects.all().delete()
        non_superusers.delete()

        self.stdout.write(self.style.SUCCESS('Done. Only superuser accounts remain.'))
