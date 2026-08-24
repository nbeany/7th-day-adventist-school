from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Avg
from .models import Assignment, Grade, TermGrade
from .serializers import AssignmentSerializer, GradeSerializer, BulkGradeSerializer, TermGradeSerializer

class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all().select_related('subject', 'section', 'term')
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        section = self.request.query_params.get('section')
        subject = self.request.query_params.get('subject')
        term = self.request.query_params.get('term')
        student = self.request.query_params.get('student')
        if section:
            queryset = queryset.filter(section_id=section)
        if subject:
            queryset = queryset.filter(subject_id=subject)
        if term:
            queryset = queryset.filter(term_id=term)
        if student:
            from sis.models import StudentEnrollment
            enrollments = StudentEnrollment.objects.filter(student_id=student)
            if term:
                enrollments = enrollments.filter(term_id=term)
            enrolled_sections = enrollments.values_list('section_id', flat=True)
            queryset = queryset.filter(section_id__in=enrolled_sections)
            
        return queryset

class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all().select_related('student__user', 'assignment')
    serializer_class = GradeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
            
        if user.role == 'STUDENT':
            from sis.models import StudentProfile
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            from sis.models import StudentGuardianRelation, GuardianProfile
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()
                
        assignment = self.request.query_params.get('assignment')
        student = self.request.query_params.get('student')
        if assignment:
            queryset = queryset.filter(assignment_id=assignment)
        if student:
            queryset = queryset.filter(student_id=student)
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        serializer = BulkGradeSerializer(data=request.data)
        if serializer.is_valid():
            assignment_id = serializer.validated_data['assignment_id']
            grades_data = serializer.validated_data['grades']

            with transaction.atomic():
                for entry in grades_data:
                    student_id = entry.get('student_id')
                    score = entry.get('score')
                    comment = entry.get('comment', '')

                    if student_id is not None and score is not None:
                        Grade.objects.update_or_create(
                            student_id=student_id,
                            assignment_id=assignment_id,
                            defaults={'score': score, 'comment': comment}
                        )
            return Response({"message": "Grades saved successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TermGradeViewSet(viewsets.ModelViewSet):
    queryset = TermGrade.objects.all().select_related('student__user', 'subject', 'section', 'term')
    serializer_class = TermGradeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
            
        if user.role == 'STUDENT':
            from sis.models import StudentProfile
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            from sis.models import StudentGuardianRelation, GuardianProfile
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()
        student = self.request.query_params.get('student')
        term = self.request.query_params.get('term')
        section = self.request.query_params.get('section')
        if student:
            queryset = queryset.filter(student_id=student)
        if term:
            queryset = queryset.filter(term_id=term)
        if section:
            queryset = queryset.filter(section_id=section)
        return queryset

    @action(detail=False, methods=['post'])
    def compute(self, request):
        """Compute term grades from individual assignment grades."""
        section_id = request.data.get('section_id')
        subject_id = request.data.get('subject_id')
        term_id = request.data.get('term_id')

        if not all([section_id, subject_id, term_id]):
            return Response({"error": "section_id, subject_id, and term_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        assignments = Assignment.objects.filter(section_id=section_id, subject_id=subject_id, term_id=term_id)
        if not assignments.exists():
            return Response({"error": "No assignments found"}, status=status.HTTP_404_NOT_FOUND)

        # Get all students who have grades in these assignments
        student_ids = Grade.objects.filter(assignment__in=assignments).values_list('student_id', flat=True).distinct()

        results = []
        with transaction.atomic():
            for sid in student_ids:
                # Calculate weighted average
                total_weighted = 0
                total_weight = 0
                for assignment in assignments:
                    grade = Grade.objects.filter(student_id=sid, assignment=assignment).first()
                    if grade:
                        percentage = (grade.score / assignment.max_score) * 100
                        total_weighted += percentage * float(assignment.weight)
                        total_weight += float(assignment.weight)

                final_score = total_weighted / total_weight if total_weight > 0 else 0

                # Determine letter grade
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

                term_grade, _ = TermGrade.objects.update_or_create(
                    student_id=sid,
                    subject_id=subject_id,
                    term_id=term_id,
                    defaults={
                        'section_id': section_id,
                        'final_score': round(final_score, 2),
                        'letter_grade': letter
                    }
                )
                results.append({
                    'student_id': sid,
                    'final_score': round(final_score, 2),
                    'letter_grade': letter
                })

        return Response({"message": f"Computed term grades for {len(results)} students", "results": results})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        student_id = request.query_params.get('student_id')
        term_id = request.query_params.get('term_id')

        if not student_id or not term_id:
            return Response({"error": "student_id and term_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        term_grades = TermGrade.objects.filter(student_id=student_id, term_id=term_id)
        if not term_grades.exists():
            return Response({"overall_average": None, "rank": None, "total_students": 0})

        section_id = term_grades.first().section_id

        # Calculate rank
        all_section_grades = TermGrade.objects.filter(term_id=term_id, section_id=section_id)
        student_averages = {}
        for g in all_section_grades:
            if g.student_id not in student_averages:
                student_averages[g.student_id] = []
            student_averages[g.student_id].append(float(g.final_score))

        student_avgs_computed = {sid: sum(scores)/len(scores) for sid, scores in student_averages.items()}
        sorted_students = sorted(student_avgs_computed.items(), key=lambda x: x[1], reverse=True)

        rank = None
        for i, (sid, avg) in enumerate(sorted_students):
            if str(sid) == str(student_id):
                rank = i + 1
                break

        my_avg = student_avgs_computed.get(int(student_id))

        return Response({
            "overall_average": round(my_avg, 2) if my_avg else None,
            "rank": rank,
            "total_students": len(sorted_students)
        })

    @action(detail=False, methods=['get'])
    def generate_report_card(self, request):
        student_id = request.query_params.get('student_id')
        term_id = request.query_params.get('term_id')

        if not student_id or not term_id:
            return Response({"error": "student_id and term_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Security check: Does this user have permission to view this student?
        if user.role == 'STUDENT':
            from sis.models import StudentProfile
            try:
                student_profile = StudentProfile.objects.get(user=user)
                if str(student_profile.id) != str(student_id):
                    return Response({"error": "You can only view your own report card."}, status=status.HTTP_403_FORBIDDEN)
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)
        elif user.role == 'PARENT':
            from sis.models import StudentGuardianRelation, GuardianProfile
            try:
                guardian = GuardianProfile.objects.get(user=user)
                is_child = StudentGuardianRelation.objects.filter(guardian=guardian, student_id=student_id).exists()
                if not is_child:
                    return Response({"error": "You can only view report cards for your own children."}, status=status.HTTP_403_FORBIDDEN)
            except GuardianProfile.DoesNotExist:
                return Response({"error": "Guardian profile not found."}, status=status.HTTP_404_NOT_FOUND)

        term_grades = TermGrade.objects.filter(student_id=student_id, term_id=term_id).select_related('subject')
        if not term_grades.exists():
            return Response({"error": "No grades found for this student and term"}, status=status.HTTP_404_NOT_FOUND)

        student = term_grades.first().student
        term = term_grades.first().term
        section_id = term_grades.first().section_id

        # Calculate overall average
        total_score = sum(g.final_score for g in term_grades)
        overall_average = total_score / len(term_grades)
        
        # Calculate rank
        all_section_grades = TermGrade.objects.filter(term_id=term_id, section_id=section_id)
        student_averages = {}
        for g in all_section_grades:
            if g.student_id not in student_averages:
                student_averages[g.student_id] = []
            student_averages[g.student_id].append(float(g.final_score))

        student_avgs_computed = {sid: sum(scores)/len(scores) for sid, scores in student_averages.items()}
        sorted_students = sorted(student_avgs_computed.items(), key=lambda x: x[1], reverse=True)

        rank = None
        for i, (sid, avg) in enumerate(sorted_students):
            if str(sid) == str(student_id):
                rank = i + 1
                break

        # Read and encode logo and signature
        import base64
        import os
        from django.conf import settings
        from schools.models import SchoolConfig
        
        logo_path = os.path.join('/app', 'media', 'logo.png')
        logo_base64 = ''
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as image_file:
                logo_base64 = base64.b64encode(image_file.read()).decode('utf-8')

        signature_base64 = ''
        school_config = SchoolConfig.objects.first()
        if school_config and school_config.principal_signature:
            sig_path = school_config.principal_signature.path
            if os.path.exists(sig_path):
                with open(sig_path, 'rb') as sig_file:
                    signature_base64 = base64.b64encode(sig_file.read()).decode('utf-8')

        # Context for the template
        context = {
            'student': student,
            'term': term,
            'term_grades': term_grades,
            'overall_average': overall_average,
            'rank': rank,
            'total_students': len(sorted_students),
            'logo_base64': logo_base64,
            'signature_base64': signature_base64
        }

        # Render HTML
        from django.template.loader import render_to_string
        html_string = render_to_string('grades/report_card.html', context)

        # Generate PDF
        from weasyprint import HTML
        from django.http import HttpResponse
        
        html = HTML(string=html_string)
        pdf = html.write_pdf()

        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="report_card_{student.user.username}_{term.name}.pdf"'
        
        return response
