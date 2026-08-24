import os
import django
import random
from decimal import Decimal
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User
from academics.models import Term, GradeLevel, Subject, Section, SubjectTeacher
from sis.models import StudentProfile, StudentEnrollment
from grades.models import Assignment, Grade, TermGrade

def seed_data():
    print("Starting seeding process...")

    active_term = Term.objects.filter(is_active=True).first()
    if not active_term:
        print("No active term found. Please create one.")
        return

    teachers = list(User.objects.filter(role='TEACHER'))
    if not teachers:
        print("No teachers found.")
        return

    subjects = list(Subject.objects.all())
    sections = list(Section.objects.all())

    if not subjects or not sections:
        print("No subjects or sections found.")
        return

    print("Assigning teachers to courses...")
    # For every section and subject, ensure there is a SubjectTeacher
    for section in sections:
        for subject in subjects:
            if not SubjectTeacher.objects.filter(section=section, subject=subject).exists():
                teacher = random.choice(teachers)
                SubjectTeacher.objects.create(
                    teacher=teacher,
                    subject=subject,
                    section=section
                )
    print("Teacher assignment complete.")

    print("Seeding Semester 1 Marks...")
    # For every section, create an assignment for every subject
    enrollments = StudentEnrollment.objects.filter(term=active_term, status='ACTIVE').select_related('student', 'section')
    
    # Group enrollments by section
    section_students = {}
    for e in enrollments:
        if e.section not in section_students:
            section_students[e.section] = []
        section_students[e.section].append(e.student)

    for section, students in section_students.items():
        for subject in subjects:
            # Create a 100-mark assignment
            assignment, created = Assignment.objects.get_or_create(
                name="Semester 1 Mark",
                subject=subject,
                section=section,
                term=active_term,
                defaults={
                    'max_score': Decimal('100.00'),
                    'weight': Decimal('1.00'),
                    'date': date.today()
                }
            )

            for student in students:
                score = Decimal(str(random.randint(60, 100)))
                
                # Create Grade
                Grade.objects.update_or_create(
                    student=student,
                    assignment=assignment,
                    defaults={'score': score, 'comment': 'Seeded grade'}
                )

                # Compute Letter
                final_score = float(score)
                letter = 'F'
                if final_score >= 90: letter = 'A+'
                elif final_score >= 85: letter = 'A'
                elif final_score >= 80: letter = 'A-'
                elif final_score >= 75: letter = 'B+'
                elif final_score >= 70: letter = 'B'
                elif final_score >= 65: letter = 'B-'
                elif final_score >= 60: letter = 'C+'
                elif final_score >= 55: letter = 'C'
                elif final_score >= 50: letter = 'C-'
                elif final_score >= 45: letter = 'D'

                # Create TermGrade
                TermGrade.objects.update_or_create(
                    student=student,
                    subject=subject,
                    term=active_term,
                    defaults={
                        'section': section,
                        'final_score': score,
                        'letter_grade': letter
                    }
                )

    print("Seeding complete.")

if __name__ == '__main__':
    seed_data()
