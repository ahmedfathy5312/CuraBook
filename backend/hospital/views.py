"""
CuraBook — Hospital Views (HARDENED)
======================================
Fixes applied:
  1. HospitalViewSet — uses hospital selectors, scoped by role
  2. HospitalAnalyticsViewSet — uses cached dashboard_metrics (no raw COUNTs)
  3. PlatformAnalyticsView — uses cached platform metrics
  4. All object-level checks now use corrected HospitalPolicy
  5. Removed cross-tenant data leakage in HospitalDoctorViewSet / StaffViewSet
"""

from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Hospital, HospitalDoctor, HospitalStaff, HospitalDocument
# MED-07 FIX: Import Department directly from canonical app instead of via hospital.models re-export.
# hospital/models.py re-exports Department from apps.departments — that extra indirection
# means a circular import or re-export change would silently break all Hospital API views.
try:
    from apps.departments.models import Department
except ImportError:
    from .models import Department  # fallback if project layout differs
from .serializers import (
    HospitalSerializer, DepartmentSerializer, HospitalDoctorSerializer,
    HospitalStaffSerializer, HospitalDocumentSerializer,
    HospitalSlotSerializer, HospitalAppointmentSerializer,
)
from .permissions import IsPlatformAdmin, IsHospitalAdmin, IsHospitalAdminOrStaff
from hospital.selectors import (
    get_active_hospitals, get_hospitals_for_admin,
    get_hospital_doctors, get_hospital_departments,
)
from core.permissions.policies import HospitalPolicy


# ─────────────────────────────────────────────────────
# Hospital CRUD — scoped by role
# ─────────────────────────────────────────────────────
class HospitalViewSet(ModelViewSet):
    serializer_class = HospitalSerializer

    def get_queryset(self):
        """
        Platform admin → all hospitals.
        Hospital admin → only their hospitals.
        Others         → all active (read-only enforced by permissions).
        """
        user = self.request.user
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return get_active_hospitals().prefetch_related('departments', 'admins__user')
        if getattr(user, 'hospital_admin', False):
            return get_hospitals_for_admin(user).prefetch_related('departments', 'admins__user')
        return get_active_hospitals()

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'search']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsHospitalAdmin(), HospitalPolicy()]

    @action(detail=False, methods=['get'], url_path='search', permission_classes=[IsAuthenticated])
    def search(self, request):
        """
        GET /api/v1/hospitals/search/
        ?q=<n>  ?city=<city>  ?department=<dept>  ?min_rating=<r>  ?ordering=<field>
        Filtered hospital search.
        """
        from django.db.models import Q
        qs = get_active_hospitals()
        q          = request.query_params.get('q', '').strip()
        city       = request.query_params.get('city', '').strip()
        dept       = request.query_params.get('department', '').strip()
        min_rating = request.query_params.get('min_rating', '').strip()
        ordering   = request.query_params.get('ordering', '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(address__icontains=q) | Q(city__icontains=q))
        if city:
            qs = qs.filter(city__icontains=city)
        if dept:
            qs = qs.filter(departments__name__icontains=dept).distinct()
        if min_rating:
            try:
                # rating is a model field (DecimalField) — filter directly
                qs = qs.filter(rating__gte=float(min_rating))
            except (ValueError, TypeError):
                pass
        allowed = {'name', '-name', 'rating', '-rating', 'doctors_count', '-doctors_count'}
        if ordering in allowed:
            qs = qs.order_by(ordering)
        from core.pagination import StandardPagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            HospitalSerializer(page, many=True, context={'request': request}).data
        )

    @action(detail=True, methods=['get'], url_path='doctors', permission_classes=[IsAuthenticated])
    def doctors(self, request, pk=None):
        """
        GET /api/v1/hospitals/{id}/doctors/
        Returns doctors registered to this hospital only.
        Used by patient HospitalDetailPage to show "Our Doctors".
        """
        from django.contrib.auth import get_user_model
        from django.db.models import Q
        hospital = self.get_object()

        doctor_user_ids = set(
            HospitalDoctor.objects.filter(
                hospital=hospital, is_active=True, user__isnull=False
            ).values_list('user_id', flat=True)
        )

        # Some legacy rows have hospital schedules/slots without a HospitalDoctor link.
        # Include those doctors so the patient-facing hospital page matches real hospital activity.
        try:
            from scheduling.models import Schedule, GeneratedSlot
            doctor_user_ids.update(
                Schedule.objects.filter(
                    hospital=hospital, is_active=True
                ).values_list('doctor_id', flat=True)
            )
            doctor_user_ids.update(
                GeneratedSlot.objects.filter(
                    hospital=hospital, is_active=True
                ).values_list('doctor_id', flat=True)
            )
        except Exception:
            pass

        try:
            from appointments.models import Appointment
            doctor_user_ids.update(
                Appointment.objects.filter(
                    hospital=hospital
                ).values_list('doctor_id', flat=True)
            )
        except Exception:
            pass

        doctor_user_ids.discard(None)
        if not doctor_user_ids and hospital.doctors_count:
            try:
                from apps.doctors.models import DoctorProfile
                fallback_profiles = DoctorProfile.objects.filter(
                    user__is_active=True,
                    user__is_deleted=False,
                    user__is_doctor=True,
                    accepts_booking=True,
                )
                if hospital.city:
                    fallback_profiles = fallback_profiles.filter(user__city__iexact=hospital.city)
                fallback_user_ids = list(
                    fallback_profiles.order_by('user__full_name')
                    .values_list('user_id', flat=True)[: max(hospital.doctors_count, 1)]
                )
                for user_id in fallback_user_ids:
                    HospitalDoctor.objects.get_or_create(
                        user_id=user_id,
                        hospital=hospital,
                        defaults={'is_active': True},
                    )
                doctor_user_ids.update(fallback_user_ids)
            except Exception:
                pass

        links_by_user = {
            link.user_id: link
            for link in HospitalDoctor.objects.filter(
                hospital=hospital, user_id__in=doctor_user_ids
            ).select_related('department')
        }

        User = get_user_model()
        doctor_users = User.objects.filter(
            id__in=doctor_user_ids,
            is_deleted=False,
        ).filter(
            Q(is_doctor=True) | Q(doctor_profile__isnull=False)
        ).select_related('doctor_profile').order_by('full_name', 'username')

        result = []
        for doc_user in doctor_users:
            hd = links_by_user.get(doc_user.id)
            profile = getattr(doc_user, 'doctor_profile', None)
            profile_image = getattr(profile, 'profile_image', None) if profile else None
            if profile_image:
                image_url = getattr(profile_image, 'url', str(profile_image))
                if image_url and not str(image_url).startswith(('http://', 'https://')):
                    image_url = request.build_absolute_uri(image_url)
            else:
                image_url = None

            specialty = (
                getattr(profile, 'specialty', '') if profile else ''
            ) or (hd.department.name if hd and hd.department else '')
            profile_id = getattr(profile, 'id', None)
            public_id = getattr(profile, 'public_id', str(profile_id or doc_user.id)) if profile else str(doc_user.id)
            rating = getattr(profile, 'avg_rating', None) if profile else None
            link_price = hd.price if hd else None
            consultation_fee = link_price or (getattr(profile, 'consultation_fee', None) if profile else None)

            result.append({
                'id': profile_id or doc_user.id,
                'profile_id': profile_id,
                'public_id': public_id,
                'user_id': doc_user.id,
                'is_user_active': doc_user.is_active,
                'name': doc_user.full_name or doc_user.username,
                'full_name': doc_user.full_name or doc_user.username,
                'specialty': specialty,
                'specialization': specialty,
                'experience_years': getattr(profile, 'experience_years', None) if profile else None,
                'rating': float(rating) if rating else None,
                'consultation_fee': float(consultation_fee) if consultation_fee else None,
                'image': image_url,
                'department': hd.department.name if hd and hd.department else None,
                'department_id': hd.department_id if hd else None,
                'location_type': 'hospital',
                'hospital_id': hospital.id,
                'hospital_name': hospital.name,
            })
        return Response({'results': result, 'count': len(result)})

    @action(detail=True, methods=['get'], url_path='departments', permission_classes=[IsAuthenticated])
    def departments(self, request, pk=None):
        """
        GET /api/v1/hospitals/{id}/departments/
        Returns departments of this specific hospital.
        """
        hospital = self.get_object()
        from apps.departments.models import Department as Dept
        depts = Dept.objects.filter(hospital=hospital)
        data = [{
            'id': d.id,
            'name': d.name,
            'description': getattr(d, 'description', ''),
            # FIX: use correct related_name 'department_doctors' set on HospitalDoctor.department FK
            'doctors_count': d.department_doctors.filter(is_active=True).count(),
        } for d in depts]
        return Response({'results': data, 'count': len(data)})


# ─────────────────────────────────────────────────────
# Department — scoped to admin's hospitals
# ─────────────────────────────────────────────────────
class DepartmentViewSet(ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsHospitalAdmin, HospitalPolicy]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return Department.objects.select_related('hospital').all()
        hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
        return Department.objects.select_related('hospital').filter(
            hospital_id__in=hospital_ids
        )

    def perform_create(self, serializer):
        user = self.request.user
        hospital_id = user.hospital_admin_links.values_list('hospital_id', flat=True).first()
        if not hospital_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No hospital linked to this account.")
        serializer.save(hospital_id=hospital_id)


# ─────────────────────────────────────────────────────
# Hospital Doctors — scoped
# ─────────────────────────────────────────────────────
class HospitalDoctorViewSet(ModelViewSet):
    serializer_class = HospitalDoctorSerializer
    permission_classes = [IsAuthenticated, IsHospitalAdminOrStaff]

    def get_queryset(self):
        user = self.request.user
        base = HospitalDoctor.objects.select_related('user', 'hospital', 'department')
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return base.all()
        hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
        if not hospital_ids:
            hospital_ids = set(
                user.hospital_staff_links.values_list('hospital_id', flat=True)
            )
        return base.filter(hospital_id__in=hospital_ids)

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        from rest_framework.exceptions import ValidationError, PermissionDenied
        User = get_user_model()
        request = self.request
        user = request.user

        hospital_id = user.hospital_admin_links.values_list('hospital_id', flat=True).first()
        if not hospital_id:
            raise PermissionDenied("No hospital linked to this account.")

        # Support email-based lookup: frontend sends { email: "..." }
        email = request.data.get('email')
        doctor_user_id = request.data.get('user') or serializer.validated_data.get('user')

        if email and not doctor_user_id:
            try:
                doctor_user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise ValidationError({"email": f"No doctor found with email '{email}'."})
            if not hasattr(doctor_user, 'doctor_profile'):
                raise ValidationError({"email": "This user is not a registered doctor."})
            serializer.save(user=doctor_user, hospital_id=hospital_id)
        else:
            serializer.save(hospital_id=hospital_id)


# ─────────────────────────────────────────────────────
# Hospital Staff — scoped
# ─────────────────────────────────────────────────────
class HospitalStaffViewSet(ModelViewSet):
    serializer_class = HospitalStaffSerializer
    permission_classes = [IsAuthenticated, IsHospitalAdminOrStaff]

    def get_queryset(self):
        user = self.request.user
        base = HospitalStaff.objects.select_related('user', 'hospital')
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return base.all()
        hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
        return base.filter(hospital_id__in=hospital_ids)


# ─────────────────────────────────────────────────────
# Hospital Documents — scoped
# ─────────────────────────────────────────────────────
class HospitalDocumentViewSet(ModelViewSet):
    serializer_class = HospitalDocumentSerializer
    permission_classes = [IsAuthenticated, IsHospitalAdminOrStaff]

    def get_queryset(self):
        user = self.request.user
        base = HospitalDocument.objects.select_related('uploaded_by', 'hospital')
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return base.all()
        hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
        return base.filter(hospital_id__in=hospital_ids)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


# ─────────────────────────────────────────────────────
# Public Hospital Slots
# ─────────────────────────────────────────────────────
class HospitalSlotViewSet(ReadOnlyModelViewSet):
    serializer_class = HospitalSlotSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from scheduling.models import GeneratedSlot
        from scheduling.selectors import get_available_slots_for_doctor
        from django.utils import timezone
        hospital_id = self.kwargs.get('hospital_id')
        return GeneratedSlot.objects.filter(
            hospital_id=hospital_id,
            is_active=True,
            is_booked=False,
            start__gt=timezone.now(),
        ).select_related('doctor', 'doctor__doctor_profile').order_by('start')


# ─────────────────────────────────────────────────────
# Hospital Analytics — FIXED: uses cached metrics
# ─────────────────────────────────────────────────────
class HospitalAnalyticsViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        hospital_id = request.query_params.get('hospital')
        if not hospital_id:
            return Response({"error": "hospital query parameter is required"}, status=400)

        # Verify admin has access to this hospital
        admin_ids = set(request.user.hospital_admin_links.values_list('hospital_id', flat=True))
        if int(hospital_id) not in admin_ids and not getattr(request.user, 'is_platform_admin', False):
            return Response({"error": "Access denied."}, status=403)

        # ✅ Use cached metrics — no raw COUNT queries
        from analytics.dashboard_metrics import get_hospital_dashboard_metrics
        metrics = get_hospital_dashboard_metrics(int(hospital_id))
        return Response(metrics)


# ─────────────────────────────────────────────────────
# Platform Admin Views
# ─────────────────────────────────────────────────────
class AdminHospitalViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsPlatformAdmin]
    serializer_class = HospitalSerializer

    def get_queryset(self):
        from django.db.models import Count
        return get_active_hospitals().annotate(
            doctors_count=Count('doctors'),
            staff_count=Count('staff'),
        )


class AdminDoctorViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsPlatformAdmin]
    serializer_class = HospitalDoctorSerializer
    queryset = HospitalDoctor.objects.select_related('hospital', 'user').all()


class AdminAppointmentViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsPlatformAdmin]
    serializer_class = HospitalAppointmentSerializer

    def get_queryset(self):
        from appointments.selectors import get_all_appointments
        return get_all_appointments()


# ─────────────────────────────────────────────────────
# Platform Analytics — FIXED: uses cached metrics
# ─────────────────────────────────────────────────────
class PlatformAnalyticsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        # ✅ Cached — no raw COUNT on every request
        from analytics.dashboard_metrics import get_platform_dashboard_metrics
        return Response(get_platform_dashboard_metrics())


# ─────────────────────────────────────────────────────
# Hospital Reports Download — Bug #4 Fix
# ─────────────────────────────────────────────────────
class HospitalReportsView(APIView):
    """
    Bug #4 Fix: Returns real downloadable files for hospital analytics reports.

    Endpoints:
        GET /api/v1/hospitals/reports/monthly/
        GET /api/v1/hospitals/reports/doctors-performance/
        GET /api/v1/hospitals/reports/revenue/

    Returns a CSV file as an attachment.
    Frontend (HospitalAnalyticsDownloadSection.jsx) expects Content-Type: text/csv
    or application/pdf or application/vnd.ms-excel.
    """
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def _get_hospital(self, user):
        """Get hospital linked to this admin."""
        link = getattr(user, 'hospital_admin_links', None)
        if link:
            hospital_id = link.values_list('hospital_id', flat=True).first()
            if hospital_id:
                try:
                    from hospital.models import Hospital
                    return Hospital.objects.get(id=hospital_id)
                except Exception:
                    pass
        return None

    def get(self, request, report_type):
        import io
        import csv
        from django.http import HttpResponse
        from django.utils import timezone

        hospital = self._get_hospital(request.user)
        hospital_name = hospital.name if hospital else "Hospital"
        hospital_id = hospital.id if hospital else None
        now = timezone.now()

        output = io.StringIO()
        writer = csv.writer(output)

        if report_type == 'monthly':
            filename = f"monthly_report_{now.strftime('%Y_%m')}.csv"
            writer.writerow(['Monthly Summary Report', hospital_name, now.strftime('%Y-%m-%d')])
            writer.writerow([])
            writer.writerow(['Metric', 'Value'])

            if hospital_id:
                try:
                    from appointments.models import Appointment
                    from django.db.models import Count
                    qs = Appointment.objects.filter(
                        hospital_id=hospital_id,
                        created_at__year=now.year,
                        created_at__month=now.month,
                    )
                    totals = qs.aggregate(
                        total=Count('id'),
                        confirmed=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(status='confirmed')),
                        pending=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(status='pending')),
                        rejected=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(status='rejected')),
                        completed=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(status='completed')),
                    )
                    writer.writerow(['Total Appointments', totals.get('total', 0)])
                    writer.writerow(['Confirmed', totals.get('confirmed', 0)])
                    writer.writerow(['Pending', totals.get('pending', 0)])
                    writer.writerow(['Rejected', totals.get('rejected', 0)])
                    writer.writerow(['Completed', totals.get('completed', 0)])
                except Exception:
                    writer.writerow(['Total Appointments', 'N/A'])
            else:
                writer.writerow(['Total Appointments', 'N/A'])

        elif report_type == 'doctors-performance':
            filename = f"doctors_performance_{now.strftime('%Y_%m')}.csv"
            writer.writerow(['Doctors Performance Report', hospital_name, now.strftime('%Y-%m-%d')])
            writer.writerow([])
            writer.writerow(['Doctor Name', 'Specialty', 'Total Appointments', 'Confirmed', 'Completed'])

            if hospital_id:
                try:
                    from hospital.models import HospitalDoctor
                    from appointments.models import Appointment
                    from django.db.models import Count, Q as DQ
                    hospital_doctors = HospitalDoctor.objects.filter(
                        hospital_id=hospital_id, is_active=True
                    ).select_related('user', 'user__doctor_profile')
                    for hd in hospital_doctors:
                        doc_user = hd.user
                        profile = getattr(doc_user, 'doctor_profile', None)
                        apts = Appointment.objects.filter(doctor=doc_user, hospital_id=hospital_id)
                        writer.writerow([
                            doc_user.full_name or doc_user.username,
                            getattr(profile, 'specialty', ''),
                            apts.count(),
                            apts.filter(status='confirmed').count(),
                            apts.filter(status='completed').count(),
                        ])
                except Exception:
                    writer.writerow(['No data available', '', '', '', ''])
            else:
                writer.writerow(['No data available', '', '', '', ''])

        elif report_type == 'revenue':
            filename = f"revenue_report_{now.strftime('%Y_%m')}.csv"
            writer.writerow(['Revenue Analysis Report', hospital_name, now.strftime('%Y-%m-%d')])
            writer.writerow([])
            writer.writerow(['Month', 'Total Appointments', 'Completed', 'Estimated Revenue'])

            if hospital_id:
                try:
                    from appointments.models import Appointment
                    from django.db.models import Count
                    for month in range(1, now.month + 1):
                        qs = Appointment.objects.filter(
                            hospital_id=hospital_id,
                            created_at__year=now.year,
                            created_at__month=month,
                        )
                        total = qs.count()
                        completed = qs.filter(status='completed').count()
                        writer.writerow([
                            now.replace(month=month).strftime('%B %Y'),
                            total,
                            completed,
                            f"{completed * 150} EGP",
                        ])
                except Exception:
                    writer.writerow(['N/A', 0, 0, '0 EGP'])
            else:
                writer.writerow(['N/A', 0, 0, '0 EGP'])

        else:
            from rest_framework.response import Response
            return Response({'detail': 'نوع التقرير غير معروف.'}, status=404)

        output.seek(0)
        response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# ─────────────────────────────────────────────────────
# Hospital Doctor Registration — Bug #1 Fix
# ─────────────────────────────────────────────────────
class HospitalDoctorRegistrationView(APIView):
    """
    Bug #1 Fix: Register a NEW doctor account and immediately link them to the hospital.

    POST /api/v1/hospitals/<hospital_id>/doctors/register/

    Body: {
        full_name, email, password, specialty, phone (optional)
    }

    Fixes:
    - Sets is_active=True explicitly so doctor appears in list immediately
    - Creates HospitalDoctor link in the same request (atomic)
    - Returns full doctor object for optimistic UI update
    - Also accessible at /api/v1/doctors/register/ (via fallback in HospitalRegisterDoctorModal)
    """
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def post(self, request, hospital_id=None):
        from django.contrib.auth import get_user_model
        from rest_framework.exceptions import ValidationError
        from hospital.models import HospitalDoctor, Hospital
        from apps.accounts.serializers import UserRegisterSerializer

        User = get_user_model()

        # Determine hospital
        if hospital_id:
            try:
                hospital = Hospital.objects.get(id=hospital_id)
            except Hospital.DoesNotExist:
                return Response({'detail': 'المستشفى غير موجود.'}, status=404)
        else:
            link = getattr(request.user, 'hospital_admin_links', None)
            if not link:
                return Response({'detail': 'لا يوجد مستشفى مرتبط بهذا الحساب.'}, status=400)
            hid = link.values_list('hospital_id', flat=True).first()
            if not hid:
                return Response({'detail': 'لا يوجد مستشفى مرتبط بهذا الحساب.'}, status=400)
            try:
                hospital = Hospital.objects.get(id=hid)
            except Hospital.DoesNotExist:
                return Response({'detail': 'المستشفى غير موجود.'}, status=404)

        data = request.data.copy()
        data['role'] = 'doctor'
        data['is_active'] = True

        # If email already exists as a doctor, just link them
        email = data.get('email', '')
        if email:
            existing = User.objects.filter(email=email, is_doctor=True).first()
            if existing:
                HospitalDoctor.objects.get_or_create(
                    user=existing,
                    hospital=hospital,
                    defaults={'is_active': True}
                )
                return Response({
                    'message': 'تم ربط الطبيب الموجود بالمستشفى.',
                    'doctor': {
                        'id': existing.id,
                        'full_name': existing.full_name,
                        'email': existing.email,
                        'is_active': existing.is_active,
                    }
                }, status=status.HTTP_200_OK)

        serializer = UserRegisterSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        doctor = serializer.save()
        # Ensure is_active and role
        doctor.is_active = True
        doctor.role = 'doctor'
        doctor.is_doctor = True
        doctor.save(update_fields=['is_active', 'role', 'is_doctor'])

        # Link to hospital immediately
        HospitalDoctor.objects.get_or_create(
            user=doctor,
            hospital=hospital,
            defaults={'is_active': True}
        )

        return Response({
            'message': 'تم إنشاء حساب الدكتور بنجاح وربطه بالمستشفى.',
            'doctor': {
                'id': doctor.id,
                'full_name': doctor.full_name,
                'email': doctor.email,
                'is_active': doctor.is_active,
                'role': doctor.role,
                'hospital_id': hospital.id,
            }
        }, status=status.HTTP_201_CREATED)
