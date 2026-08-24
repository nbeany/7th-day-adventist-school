import os
import django
import random
from datetime import date, timedelta, time

# Initialize Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User
from sis.models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment
from academics.models import Term, GradeLevel, Subject, Section
from timetable.models import Period, ClassSchedule

# Data to use for random generation
FIRST_NAMES = ["Abebe", "Kebede", "Aster", "Mulu", "Chala", "Tola", "Ayalew", "Dawit", "Saba", "Helen", "Bekele", "Tesfaye", "Alemu", "Tigist", "Selam", "Kidist", "Elias", "Abdi", "Hawa", "Fatuma", "Hirut", "Zenebe", "Dereje", "Mekdes", "Biniam", "Yonas", "Fasika", "Tsige", "Rahel", "Genet", "Mahlet", "Meron", "Abel", "Bereket", "Girma", "Hagos", "Solomon", "Samuel", "Tadesse", "Zewdu"]
LAST_NAMES = ["Tilahun", "Haile", "Bekele", "Alemu", "Kebede", "Desta", "Worku", "Mekonnen", "Getachew", "Tesfaye", "Tadesse", "Assefa", "Demissie", "Kassa", "Ayele", "Girma", "Tessema", "Bizuayehu", "Fikru", "Guta", "Tolosa", "Balcha", "Abera", "Woldemariam", "Nigussie", "Tadesse", "Zewde"]
SUBJECTS = [("Mathematics", "MATH"), ("English", "ENG"), ("Amharic", "AMH"), ("Science", "SCI"), ("Social Studies", "SOC"), ("Physical Education", "PE"), ("Art", "ART"), ("Music", "MUS")]

def generate_username(first, last, role):
    base = f"{first.lower()}.{last.lower()}"
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1
    return username

def clear_db():
    print("Clearing existing data...")
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
    User.objects.exclude(is_superuser=True).delete()

def seed_db():
    clear_db()
    print("Starting database seed...")

    # 1. Create Admin
    print("Creating Admin...")
    admin = User.objects.create_user(
        username="admin.portal",
        password="password123",
        email="admin@debreberhan.edu.et",
        first_name="Portal",
        last_name="Admin",
        role="ADMIN"
    )

    # 2. Create Grade Levels & Sections (KG to Grade 8)
    print("Creating Grades and Sections...")
    grades_info = [
        ("KG 1", 0), ("KG 2", 1), ("KG 3", 2),
        ("Grade 1", 3), ("Grade 2", 4), ("Grade 3", 5),
        ("Grade 4", 6), ("Grade 5", 7), ("Grade 6", 8),
        ("Grade 7", 9), ("Grade 8", 10)
    ]
    
    sections = []
    for name, order in grades_info:
        grade = GradeLevel.objects.create(name=name, level_order=order)
        # 1 section per grade level
        section = Section.objects.create(name=f"{name} - Section A", grade_level=grade)
        sections.append(section)

    # 3. Create Subjects
    print("Creating Subjects...")
    subject_objs = []
    for name, code in SUBJECTS:
        subject_objs.append(Subject.objects.create(name=name, code=code))

    # 4. Create Terms
    print("Creating Terms...")
    term1 = Term.objects.create(name="Semester 1", start_date=date(2026, 9, 1), end_date=date(2027, 1, 31), is_active=True)
    term2 = Term.objects.create(name="Semester 2", start_date=date(2027, 2, 1), end_date=date(2027, 6, 30), is_active=False)

    # 5. Create Teachers (28 Teachers)
    print("Creating Teachers...")
    teachers = []
    for i in range(28):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        username = generate_username(first, last, "TEACHER")
        teacher = User.objects.create_user(
            username=username,
            password="password123",
            email=f"{username}@debreberhan.edu.et",
            first_name=first,
            last_name=last,
            role="TEACHER"
        )
        teachers.append(teacher)
        
    # Assign 1 homeroom teacher per section
    print("Assigning Homeroom Teachers...")
    for i, section in enumerate(sections):
        section.homeroom_teacher = teachers[i]
        section.save()

    # 6. Create Students and Guardians (30 students per section)
    print("Creating Students and Guardians...")
    for section in sections:
        for i in range(30):
            # Student
            s_first = random.choice(FIRST_NAMES)
            s_last = random.choice(LAST_NAMES)
            s_username = generate_username(s_first, s_last, "STUDENT")
            student_user = User.objects.create_user(
                username=s_username,
                password="password123",
                email=f"{s_username}@student.debreberhan.edu.et",
                first_name=s_first,
                last_name=s_last,
                role="STUDENT"
            )
            student_profile = StudentProfile.objects.create(
                user=student_user,
                date_of_birth=date(2010, 1, 1) + timedelta(days=random.randint(0, 3650)),
                gender=random.choice(['M', 'F']),
                address="Debre Berhan, Ethiopia"
            )
            
            StudentEnrollment.objects.create(
                student=student_profile,
                section=section,
                term=term1,
                status='ACTIVE'
            )

            # Guardian (Create 1 guardian for every student to ensure data is robust)
            g_first = random.choice(FIRST_NAMES)
            # Typically shares last name but random for seed
            g_last = s_last
            g_username = generate_username(g_first, g_last, "PARENT")
            guardian_user = User.objects.create_user(
                username=g_username,
                password="password123",
                email=f"{g_username}@parent.domain.com",
                first_name=g_first,
                last_name=g_last,
                role="PARENT",
                phone_number=f"+2519{random.randint(10000000, 99999999)}"
            )
            guardian_profile = GuardianProfile.objects.create(
                user=guardian_user,
                relationship_to_student="Parent",
                emergency_contact_number=f"+2519{random.randint(10000000, 99999999)}"
            )

            # Link them
            StudentGuardianRelation.objects.create(
                student=student_profile,
                guardian=guardian_profile,
                is_primary_contact=True
            )

    # 7. Create Periods
    print("Creating Periods...")
    periods = [
        Period.objects.create(name="Period 1", start_time=time(8, 0), end_time=time(8, 45)),
        Period.objects.create(name="Period 2", start_time=time(8, 45), end_time=time(9, 30)),
        Period.objects.create(name="Break", start_time=time(9, 30), end_time=time(10, 0), is_break=True),
        Period.objects.create(name="Period 3", start_time=time(10, 0), end_time=time(10, 45)),
        Period.objects.create(name="Period 4", start_time=time(10, 45), end_time=time(11, 30)),
        Period.objects.create(name="Lunch", start_time=time(11, 30), end_time=time(12, 30), is_break=True),
        Period.objects.create(name="Period 5", start_time=time(12, 30), end_time=time(13, 15)),
        Period.objects.create(name="Period 6", start_time=time(13, 15), end_time=time(14, 0)),
    ]

    # 8. Assign Timetable (A basic generic timetable for all sections)
    print("Creating Timetables...")
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
    instruction_periods = [p for p in periods if not p.is_break]

    for section in sections:
        # Assign 1 random primary teacher for this section
        primary_teacher = random.choice(teachers)
        for day in days:
            for period in instruction_periods:
                subject = random.choice(subject_objs)
                # 80% chance it's the primary teacher, 20% it's another random teacher
                teacher = primary_teacher if random.random() < 0.8 else random.choice(teachers)
                
                # Check for conflicts
                conflict = ClassSchedule.objects.filter(teacher=teacher, day_of_week=day, period=period).exists()
                if not conflict:
                    ClassSchedule.objects.create(
                        section=section,
                        subject=subject,
                        teacher=teacher,
                        period=period,
                        day_of_week=day,
                        room_number=f"Room {section.id}"
                    )

    print("✅ Seed completed successfully!")
    print(f"Total Sections created: {len(sections)}")
    print(f"Total Students created: {StudentProfile.objects.count()}")
    print(f"Total Guardians created: {GuardianProfile.objects.count()}")
    print(f"Total Teachers created: {len(teachers)}")

if __name__ == "__main__":
    seed_db()
