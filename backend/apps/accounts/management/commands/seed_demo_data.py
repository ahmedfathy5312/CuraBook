"""
CuraBook — Demo Data Seed Command  (v4 — Extended with Hospitals)
==================================================================
Creates a FULL rich demo dataset covering every feature in the platform.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --clear    # wipe demo data first
    python manage.py seed_demo_data --minimal  # core users only

Creates:
  ─ 1  Platform Admin
  ─ 6  Doctors  (6 specialties, realistic profiles)  ← original
  ─ 2  Clinics  (each owned by its doctor)
  ─ 1  Hospital (مستشفى الأمل — 3 depts, 4 doctors)  ← original
  ─ 3  Hospitals with departments & dedicated doctors  ← NEW
       • مستشفى النيل التخصصي    (القاهرة)    — 4 أقسام، 4 دكاترة
       • مستشفى الشروق الطبي     (الإسكندرية) — 3 أقسام، 3 دكاترة
       • مستشفى السلام الدولي    (أسيوط)      — 3 أقسام، 3 دكاترة
  ─ 8  Patients (original) + 15 Patients (NEW)
  ─ 3  Assistants
  ─ Weekly schedules for every doctor
  ─ 30 Appointments (original) + 21 Hospital appointments (NEW)
  ─ 12 Reviews (for completed appointments)
  ─ 20 Notifications (per patient + per doctor)
  ─ 10 Prescriptions (for completed appointments)
  ─ 15 Chat messages (3 conversations)
  ─ Egyptian cities seed

Accounts summary (all passwords = Demo@1234, admin = Admin@1234):
  admin@curabook.demo
  doctor.cardio@curabook.demo … doctor.gp@curabook.demo   (original 6)
  dr.nile.cardio@curabook.demo  … dr.salam.psych@curabook.demo  (new 10)
  patient1@curabook.demo … patient8@curabook.demo          (original 8)
  hosp.patient1@curabook.demo … hosp.patient15@curabook.demo   (new 15)
  assistant1@curabook.demo … assistant3@curabook.demo

WARNING: Do NOT run in production.
"""

import random
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

# ─────────────────────────────────────────────────────────────────────────────
# Fixture data
# ─────────────────────────────────────────────────────────────────────────────

DEMO_PASSWORD = "Demo@1234"
ADMIN_PASSWORD = "Admin@1234"

DOCTORS = [
    {
        "username": "demo_doctor_cardio",
        "full_name": "د. أحمد محمود السيد",
        "email": "doctor.cardio@curabook.demo",
        "password": DEMO_PASSWORD,
        "city": "Cairo",
        "specialty": "Cardiology",
        "bio": "أخصائي أمراض القلب والأوعية الدموية — خبرة 15 عاماً في علاج القلب وزراعة الصمامات.",
        "consultation_fee": "350.00",
        "slot_duration": 30,
    },
    {
        "username": "demo_doctor_derma",
        "full_name": "د. سارة علي إبراهيم",
        "email": "doctor.derma@curabook.demo",
        "password": DEMO_PASSWORD,
        "city": "Alexandria",
        "specialty": "Dermatology",
        "bio": "أخصائية أمراض الجلدية والتجميل — حاصلة على بورد الجلدية الأمريكي.",
        "consultation_fee": "250.00",
        "slot_duration": 20,
    },
    {
        "username": "demo_doctor_ortho",
        "full_name": "د. خالد إبراهيم عمر",
        "email": "doctor.ortho@curabook.demo",
        "password": DEMO_PASSWORD,
        "city": "Cairo",
        "specialty": "Orthopedics",
        "bio": "جراح العظام والمفاصل — زمالة الكلية الملكية البريطانية للجراحين.",
        "consultation_fee": "400.00",
        "slot_duration": 45,
    },
    {
        "username": "demo_doctor_neuro",
        "full_name": "د. منى حسن فارس",
        "email": "doctor.neuro@curabook.demo",
        "password": DEMO_PASSWORD,
        "city": "Cairo",
        "specialty": "Neurology",
        "bio": "أستاذ مشارك علم الأعصاب — متخصص في الصداع النصفي والنوبات العصبية.",
        "consultation_fee": "500.00",
        "slot_duration": 40,
    },
    {
        "username": "demo_doctor_peds",
        "full_name": "د. طارق عبدالعزيز",
        "email": "doctor.peds@curabook.demo",
        "password": DEMO_PASSWORD,
        "city": "Giza",
        "specialty": "Pediatrics",
        "bio": "طبيب أطفال معتمد — خبرة 12 عاماً في رعاية الأطفال وحديثي الولادة.",
        "consultation_fee": "200.00",
        "slot_duration": 25,
    },
    {
        "username": "demo_doctor_gp",
        "full_name": "د. ريم صالح منصور",
        "email": "doctor.gp@curabook.demo",
        "password": DEMO_PASSWORD,
        "city": "Cairo",
        "specialty": "General Practice",
        "bio": "طبيبة عامة — متخصصة في الرعاية الأولية وإدارة الأمراض المزمنة.",
        "consultation_fee": "150.00",
        "slot_duration": 20,
    },
]

PATIENTS = [
    {"username": "demo_patient_1", "full_name": "محمد عبدالله رزق",    "email": "patient1@curabook.demo", "password": DEMO_PASSWORD, "city": "Cairo"},
    {"username": "demo_patient_2", "full_name": "فاطمة حسن علي",       "email": "patient2@curabook.demo", "password": DEMO_PASSWORD, "city": "Alexandria"},
    {"username": "demo_patient_3", "full_name": "يوسف منصور عطا",     "email": "patient3@curabook.demo", "password": DEMO_PASSWORD, "city": "Giza"},
    {"username": "demo_patient_4", "full_name": "نهى إبراهيم سعد",    "email": "patient4@curabook.demo", "password": DEMO_PASSWORD, "city": "Cairo"},
    {"username": "demo_patient_5", "full_name": "عمر طارق الجندي",    "email": "patient5@curabook.demo", "password": DEMO_PASSWORD, "city": "Cairo"},
    {"username": "demo_patient_6", "full_name": "سمر وليد الحسيني",   "email": "patient6@curabook.demo", "password": DEMO_PASSWORD, "city": "Alexandria"},
    {"username": "demo_patient_7", "full_name": "أحمد عادل مصطفى",    "email": "patient7@curabook.demo", "password": DEMO_PASSWORD, "city": "Giza"},
    {"username": "demo_patient_8", "full_name": "رانيا محمود كامل",   "email": "patient8@curabook.demo", "password": DEMO_PASSWORD, "city": "Cairo"},
]

ASSISTANTS = [
    {"username": "demo_assistant_1", "full_name": "نورا سامي فريد",   "email": "assistant1@curabook.demo", "password": DEMO_PASSWORD, "city": "Cairo"},
    {"username": "demo_assistant_2", "full_name": "رامي طارق علوان",  "email": "assistant2@curabook.demo", "password": DEMO_PASSWORD, "city": "Cairo"},
    {"username": "demo_assistant_3", "full_name": "دينا عمرو بدر",    "email": "assistant3@curabook.demo", "password": DEMO_PASSWORD, "city": "Alexandria"},
]

ADMIN = {
    "username": "demo_admin",
    "full_name": "مدير المنصة",
    "email": "admin@curabook.demo",
    "password": ADMIN_PASSWORD,
}

DEMO_USERNAMES = (
    [d["username"] for d in DOCTORS]
    + [p["username"] for p in PATIENTS]
    + [a["username"] for a in ASSISTANTS]
    + [ADMIN["username"]]
)

# ─────────────────────────────────────────────────────────────────────────────
# NEW  ▸  3 Hospitals, each with its own departments and dedicated doctors
# ─────────────────────────────────────────────────────────────────────────────

NEW_HOSPITALS_DATA = [
    {
        "hospital": {
            "name":        "مستشفى النيل التخصصي",
            "city":        "Cairo",
            "address":     "٢٣ شارع التحرير، وسط البلد، القاهرة",
            "phone":       "+20224567890",
            "email":       "info@nile-hospital.eg",
            "is_verified": True,
            "rating":      4.7,
        },
        "departments_doctors": [
            {
                "department": {"name": "قسم القلب والأوعية الدموية", "description": "تشخيص وعلاج أمراض القلب والقسطرة وزراعة الصمامات"},
                "doctor": {
                    "username": "dr_nile_cardio", "full_name": "د. أحمد سالم إبراهيم",
                    "email": "dr.nile.cardio@curabook.demo", "city": "Cairo",
                    "specialty": "Cardiology", "consultation_fee": "500.00", "slot_duration": 30,
                    "bio": "استشاري أمراض القلب والأوعية الدموية، دكتوراه القاهرة وزمالة لندن.",
                    "hospital_price": "500.00",
                },
            },
            {
                "department": {"name": "قسم النساء والتوليد", "description": "متابعة الحمل والولادة الطبيعية والقيصرية"},
                "doctor": {
                    "username": "dr_nile_obgyn", "full_name": "د. منى حسن عبدالله",
                    "email": "dr.nile.obgyn@curabook.demo", "city": "Cairo",
                    "specialty": "Obstetrics & Gynecology", "consultation_fee": "400.00", "slot_duration": 30,
                    "bio": "استشارية نساء وتوليد وطب الأم والجنين، متخصصة في الحمل عالي الخطورة.",
                    "hospital_price": "400.00",
                },
            },
            {
                "department": {"name": "قسم العظام والمفاصل", "description": "جراحة العظام وتبديل المفاصل وعمليات العمود الفقري"},
                "doctor": {
                    "username": "dr_nile_ortho", "full_name": "د. عمر بدوي علي",
                    "email": "dr.nile.ortho@curabook.demo", "city": "Cairo",
                    "specialty": "Orthopedics", "consultation_fee": "450.00", "slot_duration": 30,
                    "bio": "أستاذ مساعد جراحة العظام والمفاصل، خبرة تبديل الورك والركبة.",
                    "hospital_price": "450.00",
                },
            },
            {
                "department": {"name": "قسم الجراحة العامة", "description": "جراحة المنظار والسمنة وجراحة الجهاز الهضمي"},
                "doctor": {
                    "username": "dr_nile_surgery", "full_name": "د. طارق سليمان حسن",
                    "email": "dr.nile.surgery@curabook.demo", "city": "Cairo",
                    "specialty": "General Surgery", "consultation_fee": "600.00", "slot_duration": 45,
                    "bio": "أستاذ الجراحة العامة، دكتوراه من فرنسا، خبرة في جراحة المنظار والسمنة.",
                    "hospital_price": "600.00",
                },
            },
        ],
    },
    {
        "hospital": {
            "name":        "مستشفى الشروق الطبي",
            "city":        "Alexandria",
            "address":     "١٥ شارع سيدي جابر، محطة الرمل، الإسكندرية",
            "phone":       "+20354321098",
            "email":       "info@shrouk-medical.eg",
            "is_verified": True,
            "rating":      4.5,
        },
        "departments_doctors": [
            {
                "department": {"name": "قسم الأطفال وحديثي الولادة", "description": "رعاية صحة الطفل والتطعيمات وأمراض الجهاز التنفسي"},
                "doctor": {
                    "username": "dr_shrouk_peds", "full_name": "د. كريم فؤاد مصطفى",
                    "email": "dr.shrouk.peds@curabook.demo", "city": "Alexandria",
                    "specialty": "Pediatrics", "consultation_fee": "300.00", "slot_duration": 20,
                    "bio": "طبيب أطفال وحديثي الولادة، ماجستير عين شمس، متخصص في الجهاز التنفسي.",
                    "hospital_price": "300.00",
                },
            },
            {
                "department": {"name": "قسم الجلدية والتجميل", "description": "أمراض الجلد والليزر التجميلي وعلاج البهاق وحب الشباب"},
                "doctor": {
                    "username": "dr_shrouk_derma", "full_name": "د. سارة نجيب حلمي",
                    "email": "dr.shrouk.derma@curabook.demo", "city": "Alexandria",
                    "specialty": "Dermatology", "consultation_fee": "350.00", "slot_duration": 30,
                    "bio": "استشارية أمراض الجلد والتجميل، متخصصة في البهاق والليزر التجميلي.",
                    "hospital_price": "350.00",
                },
            },
            {
                "department": {"name": "قسم طب وجراحة العيون", "description": "عمليات الليزر وإعتام عدسة العين وأمراض الشبكية"},
                "doctor": {
                    "username": "dr_shrouk_eye", "full_name": "د. رنا خليل سعد",
                    "email": "dr.shrouk.eye@curabook.demo", "city": "Alexandria",
                    "specialty": "Ophthalmology", "consultation_fee": "300.00", "slot_duration": 20,
                    "bio": "استشارية طب وجراحة العيون، متخصصة في الليزر وأمراض الشبكية.",
                    "hospital_price": "300.00",
                },
            },
        ],
    },
    {
        "hospital": {
            "name":        "مستشفى السلام الدولي",
            "city":        "Assiut",
            "address":     "٨ شارع جمال عبدالناصر، أسيوط",
            "phone":       "+20882345678",
            "email":       "contact@salam-intl.eg",
            "is_verified": True,
            "rating":      4.6,
        },
        "departments_doctors": [
            {
                "department": {"name": "قسم الباطنة والغدد الصماء", "description": "علاج السكري وأمراض الغدة الدرقية والمناعة الذاتية"},
                "doctor": {
                    "username": "dr_salam_internal", "full_name": "د. ليلى منصور راضي",
                    "email": "dr.salam.internal@curabook.demo", "city": "Assiut",
                    "specialty": "Internal Medicine", "consultation_fee": "400.00", "slot_duration": 30,
                    "bio": "أستاذ الباطنة والغدد الصماء، متخصصة في السكري والغدة الدرقية.",
                    "hospital_price": "400.00",
                },
            },
            {
                "department": {"name": "قسم الأعصاب والمخ", "description": "علاج الصرع والصداع النصفي والسكتة الدماغية"},
                "doctor": {
                    "username": "dr_salam_neuro", "full_name": "د. هاني سمير وهبة",
                    "email": "dr.salam.neuro@curabook.demo", "city": "Assiut",
                    "specialty": "Neurology", "consultation_fee": "500.00", "slot_duration": 30,
                    "bio": "استشاري أمراض المخ والأعصاب، متخصص في الصرع والسكتة الدماغية.",
                    "hospital_price": "500.00",
                },
            },
            {
                "department": {"name": "قسم الطب النفسي", "description": "العلاج النفسي والمعرفي السلوكي والقلق والاكتئاب"},
                "doctor": {
                    "username": "dr_salam_psych", "full_name": "د. ناديا زكي رمضان",
                    "email": "dr.salam.psych@curabook.demo", "city": "Assiut",
                    "specialty": "Psychiatry", "consultation_fee": "450.00", "slot_duration": 60,
                    "bio": "استشارية الطب النفسي والعلاج المعرفي السلوكي، متخصصة في القلق والاكتئاب.",
                    "hospital_price": "450.00",
                },
            },
        ],
    },
]

# Flat list of new doctor usernames (for --clear)
NEW_DOCTOR_USERNAMES = [
    dd["doctor"]["username"]
    for h in NEW_HOSPITALS_DATA
    for dd in h["departments_doctors"]
]

NEW_PATIENTS = [
    {"username": "hosp_patient_01", "full_name": "محمود علي عبدالرحمن",  "email": "hosp.patient1@curabook.demo",  "city": "Cairo"},
    {"username": "hosp_patient_02", "full_name": "فاطمة عمر إبراهيم",    "email": "hosp.patient2@curabook.demo",  "city": "Alexandria"},
    {"username": "hosp_patient_03", "full_name": "يوسف ناجي سليم",       "email": "hosp.patient3@curabook.demo",  "city": "Assiut"},
    {"username": "hosp_patient_04", "full_name": "هبة عادل مصطفى",       "email": "hosp.patient4@curabook.demo",  "city": "Cairo"},
    {"username": "hosp_patient_05", "full_name": "مصطفى طه عبدالله",     "email": "hosp.patient5@curabook.demo",  "city": "Giza"},
    {"username": "hosp_patient_06", "full_name": "دعاء حسن محمود",       "email": "hosp.patient6@curabook.demo",  "city": "Cairo"},
    {"username": "hosp_patient_07", "full_name": "إسلام فاروق علي",      "email": "hosp.patient7@curabook.demo",  "city": "Alexandria"},
    {"username": "hosp_patient_08", "full_name": "نور سعد أحمد",         "email": "hosp.patient8@curabook.demo",  "city": "Cairo"},
    {"username": "hosp_patient_09", "full_name": "عمرو وحيد رمضان",      "email": "hosp.patient9@curabook.demo",  "city": "Assiut"},
    {"username": "hosp_patient_10", "full_name": "سالي كمال فتحي",       "email": "hosp.patient10@curabook.demo", "city": "Cairo"},
    {"username": "hosp_patient_11", "full_name": "أحمد رمضان حسين",      "email": "hosp.patient11@curabook.demo", "city": "Giza"},
    {"username": "hosp_patient_12", "full_name": "أسماء فؤاد يوسف",      "email": "hosp.patient12@curabook.demo", "city": "Alexandria"},
    {"username": "hosp_patient_13", "full_name": "وليد مجدي عثمان",      "email": "hosp.patient13@curabook.demo", "city": "Cairo"},
    {"username": "hosp_patient_14", "full_name": "مريم عزت كمال",        "email": "hosp.patient14@curabook.demo", "city": "Assiut"},
    {"username": "hosp_patient_15", "full_name": "خالد نور الدين سيد",   "email": "hosp.patient15@curabook.demo", "city": "Cairo"},
]

NEW_PATIENT_USERNAMES = [p["username"] for p in NEW_PATIENTS]

# Hospital appointments fixture  (doctor_username, patient_index, status, visit_type, reason, fee)
HOSP_APPOINTMENT_REASONS = [
    "آلام في الصدر",     "متابعة حالة مزمنة", "متابعة الحمل",
    "ألم في المفاصل",   "استشارة جراحية",    "نمو الأطفال",
    "كحة وزكام",        "بقع جلدية",         "فحص عيون",
    "متابعة السكري",    "صداع مستمر",        "تشنجات",
    "قلق وتوتر",        "اضطراب في النوم",   "مراجعة التحاليل",
    "تشويش في الرؤية",  "آلام في البطن",     "فحص دوري",
    "ارتفاع ضغط الدم",  "استشارة نفسية",     "فحص عام",
]

REVIEW_COMMENTS = [
    "طبيب ممتاز ومتفهم — الخدمة كانت راقية جداً.",
    "تشخيص دقيق وسريع، شرح الحالة بوضوح.",
    "أنصح به بشدة، تعامل محترم والعيادة نظيفة.",
    "خبرة عالية في التخصص، استفدت كثيراً.",
    "مواعيد منتظمة ولا انتظار طويل.",
    "أفضل طبيب في المنطقة — لا أذهب لغيره.",
    "شرح الحالة بالتفصيل وأجاب على كل أسئلتي.",
    "متابعة ممتازة بعد الزيارة عبر التطبيق.",
]

APPOINTMENT_REASONS = [
    "فحص دوري",
    "ألم في الصدر",
    "مشكلة جلدية مستمرة",
    "ألم في الركبة",
    "صداع متكرر",
    "حمى وكحة",
    "متابعة علاج سابق",
    "استشارة قبل العملية",
    "فحص ضغط الدم",
    "أعراض إرهاق مستمر",
]

PRESCRIPTION_DIAGNOSES = [
    "ارتفاع ضغط الدم — يستلزم متابعة شهرية.",
    "التهاب جلدي تحسسي — يوصى بتجنب المثيرات.",
    "وهن في غضروف الركبة — علاج طبيعي مطلوب.",
    "صداع التوتر — تحسين نمط النوم ضروري.",
    "التهاب الحلق البكتيري — مضادات حيوية لمدة 7 أيام.",
]

PRESCRIPTION_NOTES = [
    "تناول الدواء بعد الأكل مباشرة. تجنب القهوة.",
    "الراحة التامة لمدة 3 أيام. شرب سوائل كافية.",
    "تمارين إعادة التأهيل مرتين أسبوعياً.",
    "المتابعة بعد أسبوعين لتقييم الاستجابة.",
    "لا تتوقف عن الدواء قبل انتهاء الجرعة الكاملة.",
]

CHAT_MESSAGES = [
    ("patient", "السلام عليكم دكتور، عندي سؤال عن التقرير"),
    ("doctor",  "أهلاً وسهلاً، تفضل بسؤالك"),
    ("patient", "النتايج طلعت — الضغط 140/90 هل ده طبيعي؟"),
    ("doctor",  "الضغط ارتفع قليلاً — نحتاج مراجعة الأدوية. هل أنت آخذ الدواء بانتظام؟"),
    ("patient", "أيوه بآخده يومياً بدون انقطاع"),
    ("doctor",  "ممتاز. احجز موعد الأسبوع القادم ونراجع معاً."),
    ("patient", "شكراً جزيلاً دكتور"),
]

NOTIFICATION_DATA = [
    ("NEW_APPOINTMENT",       "حجز موعد جديد",              "تم حجز موعدك مع الدكتور بنجاح"),
    ("APPOINTMENT_CONFIRMED", "تأكيد الموعد",                "تم تأكيد موعدك في العيادة"),
    ("APPOINTMENT_REMINDER",  "تذكير بالموعد",               "موعدك غداً الساعة 10 صباحاً"),
    ("APPOINTMENT_COMPLETED", "اكتملت الزيارة",              "شكراً لزيارتك — نتمنى لك الشفاء"),
    ("SYSTEM",                "مرحباً بك في CuraBook",       "اكتشف آلاف الأطباء في مصر"),
    ("SYSTEM",                "تحديث التطبيق",               "نسخة جديدة متاحة بميزات محسّنة"),
]


# ─────────────────────────────────────────────────────────────────────────────
# Command
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed comprehensive demo data for development / staging."

    def add_arguments(self, parser):
        parser.add_argument("--clear",   action="store_true", help="Clear existing demo data first.")
        parser.add_argument("--minimal", action="store_true", help="Users only — skip clinics, appointments.")

    def handle(self, *args, **options):
        from django.conf import settings
        if settings.DEBUG is False:
            raise CommandError("❌ seed_demo_data is NOT safe for production. Set DEBUG=True first.")

        self.stdout.write(self.style.MIGRATE_HEADING("🌱 CuraBook — Seeding comprehensive demo data..."))

        with transaction.atomic():
            if options["clear"]:
                self._clear_demo_data()

            admin      = self._create_admin()
            doctors    = self._create_doctors()
            patients   = self._create_patients()
            assistants = self._create_assistants()

            if options["minimal"]:
                self.stdout.write(self.style.SUCCESS("✅ Minimal seed done."))
                return

            # ── Seed Egypt cities first ────────────────────────────────
            self._seed_cities()

            # ── Clinics: each doctor[0] and doctor[1] own their clinic ─
            clinic1, clinic2 = self._create_clinics(doctors)

            # ── Hospital with multiple departments ─────────────────────
            hospital = self._create_hospital(doctors)

            # ── Assign assistants to clinics ───────────────────────────
            self._create_assistant_assignments(assistants, clinic1, clinic2)

            # ── Weekly schedules ───────────────────────────────────────
            self._create_schedules(doctors, clinic1, clinic2, hospital)

            # ── Appointments (30), reviews (12), prescriptions (10) ───
            appointments = self._create_appointments(doctors, patients, clinic1, clinic2, hospital)

            # ── Notifications ──────────────────────────────────────────
            self._create_notifications(patients, doctors)

            # ── Chat conversations ─────────────────────────────────────
            self._create_chats(doctors, patients)

            # ── NEW ▸ 3 hospitals with departments + dedicated doctors ──
            self.stdout.write(self.style.MIGRATE_HEADING("\n🏥  Seeding new hospitals..."))
            new_hosp_doctors, new_hospitals = self._create_new_hospitals()

            # ── NEW ▸ 15 additional patients ───────────────────────────
            new_patients = self._create_new_patients()

            # ── NEW ▸ hospital appointments ────────────────────────────
            self._create_hospital_appointments(new_hosp_doctors, new_patients, new_hospitals)

        self.stdout.write(self.style.SUCCESS(
            "\n✅ Demo data seeded successfully!\n"
            f"   Admin:           {ADMIN['email']} / {ADMIN_PASSWORD}\n"
            f"   Doctor (clinic): {DOCTORS[0]['email']} / {DEMO_PASSWORD}\n"
            f"   Doctor (hospital): dr.nile.cardio@curabook.demo / {DEMO_PASSWORD}\n"
            f"   Patient (orig):  {PATIENTS[0]['email']} / {DEMO_PASSWORD}\n"
            f"   Patient (hosp):  hosp.patient1@curabook.demo / {DEMO_PASSWORD}\n"
            f"   Assistant:       {ASSISTANTS[0]['email']} / {DEMO_PASSWORD}\n"
            "   Docs:            http://localhost:8000/api/v1/docs/\n"
            "   Admin UI:        http://localhost:8000/admin/\n"
        ))

    # ──────────────────────────────────────────────────────────────────────────
    # Clear
    # ──────────────────────────────────────────────────────────────────────────

    def _clear_demo_data(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        all_usernames = DEMO_USERNAMES + NEW_DOCTOR_USERNAMES + NEW_PATIENT_USERNAMES
        deleted, _ = User.objects.filter(username__in=all_usernames).delete()
        self.stdout.write(f"   🗑  Cleared {deleted} demo users (cascade deletes related data)")
        # Clear the 3 new hospitals
        from hospital.models import Hospital
        h_deleted, _ = Hospital.objects.filter(
            name__in=[h["hospital"]["name"] for h in NEW_HOSPITALS_DATA]
        ).delete()
        if h_deleted:
            self.stdout.write(f"   🗑  Cleared {h_deleted} demo hospitals")

    # ──────────────────────────────────────────────────────────────────────────
    # Users
    # ──────────────────────────────────────────────────────────────────────────

    def _create_admin(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=ADMIN["username"],
            defaults={
                "email":             ADMIN["email"],
                "full_name":         ADMIN["full_name"],
                "is_staff":          True,
                "is_superuser":      True,
                "is_active":         True,
                "is_platform_admin": True,
            },
        )
        if created:
            user.set_password(ADMIN["password"])
            user.save()
            self.stdout.write(f"   ✅ Admin: {user.email}")
        return user

    def _create_doctors(self):
        from django.contrib.auth import get_user_model
        from apps.doctors.models import DoctorProfile  # type: ignore
        User = get_user_model()
        result = []
        for d in DOCTORS:
            user, created = User.objects.get_or_create(
                username=d["username"],
                defaults={
                    "email":     d["email"],
                    "full_name": d["full_name"],
                    "city":      d["city"],
                    "is_doctor": True,
                    "is_active": True,
                },
            )
            if created:
                user.set_password(d["password"])
                user.save()

            DoctorProfile.objects.get_or_create(
                user=user,
                defaults={
                    "specialty":        d["specialty"],
                    "bio":              d["bio"],
                    "consultation_fee": d["consultation_fee"],
                    "slot_duration":    d["slot_duration"],
                    "accepts_booking":  True,
                },
            )
            if created:
                self.stdout.write(f"   ✅ Doctor: {user.full_name} ({d['specialty']})")
            result.append(user)
        return result

    def _create_patients(self):
        from django.contrib.auth import get_user_model
        from apps.patients.models import PatientProfile  # type: ignore
        User = get_user_model()
        result = []
        for p in PATIENTS:
            user, created = User.objects.get_or_create(
                username=p["username"],
                defaults={
                    "email":      p["email"],
                    "full_name":  p["full_name"],
                    "city":       p["city"],
                    "is_patient": True,
                    "is_active":  True,
                },
            )
            if created:
                user.set_password(p["password"])
                user.save()
                try:
                    PatientProfile.objects.get_or_create(user=user)
                except Exception:
                    pass
                self.stdout.write(f"   ✅ Patient: {user.full_name}")
            result.append(user)
        return result

    def _create_assistants(self):
        from django.contrib.auth import get_user_model
        from apps.assistants.models import AssistantProfile  # type: ignore
        User = get_user_model()
        result = []
        for a in ASSISTANTS:
            user, created = User.objects.get_or_create(
                username=a["username"],
                defaults={
                    "email":        a["email"],
                    "full_name":    a["full_name"],
                    "city":         a["city"],
                    "is_assistant": True,
                    "is_active":    True,
                },
            )
            if created:
                user.set_password(a["password"])
                user.save()
                AssistantProfile.objects.get_or_create(user=user)
                self.stdout.write(f"   ✅ Assistant: {user.full_name}")
            result.append(user)
        return result

    # ──────────────────────────────────────────────────────────────────────────
    # Cities
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_cities(self):
        try:
            from django.core.management import call_command
            call_command("seed_egypt_cities", verbosity=0)
            self.stdout.write("   ✅ Egypt cities seeded")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"   ⚠  Cities skipped: {e}"))

    # ──────────────────────────────────────────────────────────────────────────
    # Clinics  — FIX: owner must be DoctorProfile (OneToOne), not User
    # ──────────────────────────────────────────────────────────────────────────

    def _create_clinics(self, doctors):
        from clinics.models import Clinic
        from apps.doctors.models import DoctorProfile  # type: ignore

        dp0 = DoctorProfile.objects.get(user=doctors[0])  # Cardiology
        dp1 = DoctorProfile.objects.get(user=doctors[1])  # Dermatology

        clinic1, c1 = Clinic.objects.get_or_create(
            name="عيادة النور للقلب والأوعية",
            defaults={
                "owner":              dp0,
                "address":            "15 شارع التحرير، وسط البلد",
                "city":               "Cairo",
                "phone":              "0220001111",
                "consultation_price": "350.00",
                "latitude":           30.0444,
                "longitude":          31.2357,
                "is_active":          True,
            },
        )
        if c1:
            self.stdout.write("   ✅ Clinic 1: عيادة النور للقلب")

        clinic2, c2 = Clinic.objects.get_or_create(
            name="مركز الإسكندرية للجلدية والتجميل",
            defaults={
                "owner":              dp1,
                "address":            "22 شارع النصر، محطة الرمل",
                "city":               "Alexandria",
                "phone":              "0320002222",
                "consultation_price": "250.00",
                "latitude":           31.2001,
                "longitude":          29.9187,
                "is_active":          True,
            },
        )
        if c2:
            self.stdout.write("   ✅ Clinic 2: مركز الإسكندرية للجلدية")

        return clinic1, clinic2

    # ──────────────────────────────────────────────────────────────────────────
    # Hospital
    # ──────────────────────────────────────────────────────────────────────────

    def _create_hospital(self, doctors):
        from hospital.models import Hospital, Department, HospitalDoctor

        hospital, created = Hospital.objects.get_or_create(
            name="مستشفى الأمل المركزي",
            defaults={
                "address":   "طريق الأوتوستراد الصحراوي، القاهرة الجديدة",
                "city":      "Cairo",
                "phone":     "0230003333",
                "is_active": True,
            },
        )

        if created:
            self.stdout.write("   ✅ Hospital: مستشفى الأمل المركزي")

        dept_names = ["قسم العظام والمفاصل", "قسم طوارئ", "قسم الأطفال"]
        depts = []
        for name in dept_names:
            dept, _ = Department.objects.get_or_create(hospital=hospital, name=name)
            depts.append(dept)

        # Link doctors[2]=Ortho, doctors[3]=Neuro, doctors[4]=Peds, doctors[5]=GP to hospital
        hospital_doctor_pairs = [
            (doctors[2], depts[0]),  # Orthopedics → Ortho dept
            (doctors[3], depts[1]),  # Neurology   → Emergency dept
            (doctors[4], depts[2]),  # Pediatrics  → Peds dept
            (doctors[5], depts[1]),  # GP          → Emergency dept
        ]
        for doc, dept in hospital_doctor_pairs:
            try:
                HospitalDoctor.objects.get_or_create(
                    hospital=hospital,
                    doctor=doc,
                    defaults={"department": dept},
                )
            except Exception:
                pass

        self.stdout.write(f"   ✅ Hospital departments and {len(hospital_doctor_pairs)} doctor links created")
        return hospital

    # ──────────────────────────────────────────────────────────────────────────
    # Assistant assignments
    # ──────────────────────────────────────────────────────────────────────────

    def _create_assistant_assignments(self, assistants, clinic1, clinic2):
        from apps.assistants.models import AssistantProfile  # type: ignore
        from clinics.models import ClinicAssistant
        try:
            ap1 = assistants[0].assistant_profile
            ap2 = assistants[1].assistant_profile
            ap3 = assistants[2].assistant_profile
            ClinicAssistant.objects.get_or_create(assistant=ap1, clinic=clinic1, defaults={"is_active": True})
            ClinicAssistant.objects.get_or_create(assistant=ap2, clinic=clinic2, defaults={"is_active": True})
            # Third assistant assigned to both clinics
            ClinicAssistant.objects.get_or_create(assistant=ap3, clinic=clinic1, defaults={"is_active": True})
            self.stdout.write("   ✅ Assistant assignments created")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"   ⚠  Assistant assignments skipped: {e}"))

    # ──────────────────────────────────────────────────────────────────────────
    # Schedules
    # ──────────────────────────────────────────────────────────────────────────

    def _create_schedules(self, doctors, clinic1, clinic2, hospital):
        from scheduling.models import Schedule

        schedule_configs = [
            # (doctor_index, clinic_or_hospital, type, days, start, end)
            (0, clinic1,   "clinic",   [1, 3],    time(9, 0),  time(13, 0)),  # Cardio: Sun/Tue
            (0, clinic1,   "clinic",   [5],       time(17, 0), time(21, 0)),  # Cardio: Thu evening
            (1, clinic2,   "clinic",   [2, 4],    time(10, 0), time(14, 0)),  # Derma: Mon/Wed
            (2, hospital,  "hospital", [4],       time(8, 0),  time(12, 0)),  # Ortho: Wed hospital
            (3, hospital,  "hospital", [1, 3],    time(14, 0), time(18, 0)),  # Neuro: Sun/Tue hospital
            (4, hospital,  "hospital", [2, 5],    time(9, 0),  time(13, 0)),  # Peds: Mon/Thu hospital
            (5, clinic1,   "clinic",   [0, 2, 4], time(8, 0),  time(11, 0)),  # GP: Sat/Mon/Wed
        ]

        created_count = 0
        for doc_idx, location, loc_type, days, start, end in schedule_configs:
            for day in days:
                kwargs = {
                    "doctor": doctors[doc_idx],
                    "day_of_week": day,
                    "defaults": {
                        "start_time": start,
                        "end_time":   end,
                        "is_active":  True,
                    },
                }
                if loc_type == "clinic":
                    kwargs["clinic"] = location
                    kwargs["hospital"] = None
                else:
                    kwargs["hospital"] = location
                    kwargs["clinic"] = None
                Schedule.objects.get_or_create(**kwargs)
                created_count += 1

        self.stdout.write(f"   ✅ {created_count} schedule entries created")

        # Generate slots for next 30 days
        try:
            from scheduling.tasks import generate_slots_for_next_30_days
            generate_slots_for_next_30_days.apply()
            self.stdout.write("   ✅ Slots generated (30 days ahead)")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"   ⚠  Slot generation skipped: {e}"))

    # ──────────────────────────────────────────────────────────────────────────
    # Appointments  (30 total, mix of statuses)
    # ──────────────────────────────────────────────────────────────────────────

    def _create_appointments(self, doctors, patients, clinic1, clinic2, hospital):
        from appointments.models import Appointment
        from scheduling.models import GeneratedSlot

        STATUS_WEIGHTS = [
            Appointment.Status.COMPLETED,
            Appointment.Status.COMPLETED,
            Appointment.Status.CONFIRMED,
            Appointment.Status.CONFIRMED,
            Appointment.Status.PENDING,
            Appointment.Status.CANCELLED,
        ]

        VISIT_TYPES = [
            Appointment.VisitType.IN_PERSON,
            Appointment.VisitType.IN_PERSON,
            Appointment.VisitType.IN_PERSON,
            Appointment.VisitType.ONLINE,
        ]

        slots = list(
            GeneratedSlot.objects
            .filter(is_booked=False, is_active=True)
            .order_by("start")[:50]
        )

        created = []
        count = 0
        for i, slot in enumerate(slots):
            if count >= 30:
                break
            patient = patients[i % len(patients)]
            status  = STATUS_WEIGHTS[i % len(STATUS_WEIGHTS)]
            vtype   = VISIT_TYPES[i % len(VISIT_TYPES)]
            reason  = APPOINTMENT_REASONS[i % len(APPOINTMENT_REASONS)]

            appt, ok = Appointment.objects.get_or_create(
                slot=slot,
                defaults={
                    "patient":    patient,
                    "doctor":     slot.doctor,
                    "clinic":     slot.clinic,
                    "hospital":   slot.hospital,
                    "status":     status,
                    "visit_type": vtype,
                    "reason":     reason,
                    "expires_at": timezone.now() + timedelta(days=7),
                },
            )
            if ok:
                slot.is_booked = True
                slot.save(update_fields=["is_booked"])
                count += 1
                created.append(appt)

                if status == Appointment.Status.COMPLETED:
                    self._create_review(appt, patient, i)
                    self._create_prescription(appt, i)

        self.stdout.write(f"   ✅ {count} appointments created")
        return created

    # ──────────────────────────────────────────────────────────────────────────
    # Reviews
    # ──────────────────────────────────────────────────────────────────────────

    def _create_review(self, appointment, patient, idx):
        from reviews.models import Review
        try:
            Review.objects.get_or_create(
                appointment=appointment,
                defaults={
                    "patient":  patient,
                    "doctor":   appointment.doctor,
                    "clinic":   appointment.clinic,
                    "hospital": appointment.hospital,
                    "rating":   random.randint(3, 5),
                    "comment":  REVIEW_COMMENTS[idx % len(REVIEW_COMMENTS)],
                },
            )
        except Exception:
            pass

    # ──────────────────────────────────────────────────────────────────────────
    # Prescriptions
    # ──────────────────────────────────────────────────────────────────────────

    def _create_prescription(self, appointment, idx):
        from prescriptions.models import Prescription
        try:
            Prescription.objects.get_or_create(
                appointment=appointment,
                defaults={
                    "doctor":    appointment.doctor,
                    "patient":   appointment.patient,
                    "diagnosis": PRESCRIPTION_DIAGNOSES[idx % len(PRESCRIPTION_DIAGNOSES)],
                    "notes":     PRESCRIPTION_NOTES[idx % len(PRESCRIPTION_NOTES)],
                    "status":    "SENT",
                },
            )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"   ⚠  Prescription skipped: {e}"))

    # ──────────────────────────────────────────────────────────────────────────
    # Notifications
    # ──────────────────────────────────────────────────────────────────────────

    def _create_notifications(self, patients, doctors):
        from notifications.models import Notification
        count = 0
        for patient in patients:
            for notif_type, title, body in NOTIFICATION_DATA:
                _, ok = Notification.objects.get_or_create(
                    user=patient,
                    type=notif_type,
                    title=title,
                    defaults={
                        "body":    body,
                        "is_read": random.choice([True, False]),
                    },
                )
                if ok:
                    count += 1

        # Doctor notifications
        for doc in doctors[:3]:
            Notification.objects.get_or_create(
                user=doc,
                type="NEW_APPOINTMENT",
                title="حجز موعد جديد",
                defaults={
                    "body":    "مريض جديد حجز موعداً في العيادة",
                    "is_read": False,
                },
            )
            count += 1

        self.stdout.write(f"   ✅ {count} notifications created")

    # ──────────────────────────────────────────────────────────────────────────
    # Chat conversations
    # ──────────────────────────────────────────────────────────────────────────

    def _create_chats(self, doctors, patients):
        from chat.models import Conversation, Message
        pairs = [
            (doctors[0], patients[0]),
            (doctors[1], patients[1]),
            (doctors[2], patients[2]),
        ]
        total = 0
        for doctor, patient in pairs:
            try:
                conv, _ = Conversation.get_or_create_for_pair(doctor, patient)
                for sender_role, text in CHAT_MESSAGES:
                    sender = doctor if sender_role == "doctor" else patient
                    Message.objects.get_or_create(
                        conversation=conv,
                        sender=sender,
                        content=text,
                        defaults={"is_read": True},
                    )
                    total += 1
                conv.last_message_at      = timezone.now()
                conv.last_message_preview = CHAT_MESSAGES[-1][1][:200]
                conv.save(update_fields=["last_message_at", "last_message_preview"])
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"   ⚠  Chat skipped for pair: {e}"))

        self.stdout.write(f"   ✅ {total} chat messages in {len(pairs)} conversations")

    # ══════════════════════════════════════════════════════════════════════════
    # NEW ▸  3 Hospitals — each with departments and dedicated doctors
    # ══════════════════════════════════════════════════════════════════════════

    def _create_new_hospitals(self):
        """
        Creates 3 new hospitals.  For each hospital:
          1. Creates Hospital row
          2. Creates Department rows linked to the hospital
          3. Creates a User (doctor) + DoctorProfile for each department
          4. Creates HospitalDoctor linking user ↔ hospital ↔ department

        Returns (doctor_user_list, hospital_list).
        """
        from django.contrib.auth import get_user_model
        from hospital.models import Hospital, HospitalDoctor
        from apps.departments.models import Department  # type: ignore
        from apps.doctors.models import DoctorProfile  # type: ignore

        User = get_user_model()
        all_doctor_users = []
        all_hospitals    = []

        for h_data in NEW_HOSPITALS_DATA:
            hd = h_data["hospital"]

            # ── Hospital ─────────────────────────────────────────────────
            hospital, h_created = Hospital.objects.get_or_create(
                name=hd["name"],
                defaults={
                    "city":        hd["city"],
                    "address":     hd["address"],
                    "phone":       hd["phone"],
                    "email":       hd["email"],
                    "is_verified": hd["is_verified"],
                    "rating":      hd["rating"],
                    "is_active":   True,
                },
            )
            all_hospitals.append(hospital)
            tag = "✅ جديد" if h_created else "⏩ موجود"
            self.stdout.write(f"   {tag}: {hospital.name} — {hospital.city}")

            # ── Departments + Doctors ─────────────────────────────────────
            for dd in h_data["departments_doctors"]:
                dept_data = dd["department"]
                doc_data  = dd["doctor"]

                # Department
                dept, _ = Department.objects.get_or_create(
                    hospital=hospital,
                    name=dept_data["name"],
                    defaults={"description": dept_data["description"], "is_active": True},
                )

                # User (doctor)
                user, u_created = User.objects.get_or_create(
                    username=doc_data["username"],
                    defaults={
                        "email":     doc_data["email"],
                        "full_name": doc_data["full_name"],
                        "city":      doc_data["city"],
                        "is_doctor": True,
                        "is_active": True,
                    },
                )
                if u_created:
                    user.set_password(DEMO_PASSWORD)
                    user.save()

                # DoctorProfile
                DoctorProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "specialty":        doc_data["specialty"],
                        "bio":              doc_data["bio"],
                        "consultation_fee": doc_data["consultation_fee"],
                        "slot_duration":    doc_data["slot_duration"],
                        "accepts_booking":  True,
                    },
                )

                # HospitalDoctor link  (model uses `user` not `doctor`)
                HospitalDoctor.objects.get_or_create(
                    user=user,
                    hospital=hospital,
                    defaults={
                        "department": dept,
                        "price":      doc_data["hospital_price"],
                        "is_active":  True,
                    },
                )

                all_doctor_users.append(user)
                u_tag = "✅" if u_created else "⏩"
                self.stdout.write(
                    f"      {u_tag} {doc_data['full_name']} → {dept.name}"
                )

        self.stdout.write(
            f"   ✅ {len(all_hospitals)} مستشفيات | "
            f"{len(all_doctor_users)} دكاترة | "
            f"{sum(len(h['departments_doctors']) for h in NEW_HOSPITALS_DATA)} أقسام"
        )
        return all_doctor_users, all_hospitals

    # ──────────────────────────────────────────────────────────────────────────
    # NEW ▸  15 additional patients
    # ──────────────────────────────────────────────────────────────────────────

    def _create_new_patients(self):
        from django.contrib.auth import get_user_model
        from apps.patients.models import PatientProfile  # type: ignore
        User = get_user_model()
        result = []
        for p in NEW_PATIENTS:
            user, created = User.objects.get_or_create(
                username=p["username"],
                defaults={
                    "email":      p["email"],
                    "full_name":  p["full_name"],
                    "city":       p["city"],
                    "is_patient": True,
                    "is_active":  True,
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
                try:
                    PatientProfile.objects.get_or_create(user=user)
                except Exception:
                    pass
                self.stdout.write(f"   ✅ Patient: {user.full_name}")
            result.append(user)
        self.stdout.write(f"   ✅ {len(result)} مرضى جدد")
        return result

    # ──────────────────────────────────────────────────────────────────────────
    # NEW ▸  Hospital appointments (21 appointments across the 3 new hospitals)
    # ──────────────────────────────────────────────────────────────────────────

    def _create_hospital_appointments(self, doctor_users, patients, hospitals):
        """
        Creates realistic appointments linking new hospital doctors to new
        patients.  Uses a simple time-slot approach without GeneratedSlot
        so it works even before the scheduler has run.
        """
        from appointments.models import Appointment
        from scheduling.models import GeneratedSlot
        from datetime import datetime, time as dtime

        if not doctor_users or not patients:
            self.stdout.write(self.style.WARNING("   ⚠  Skipping hospital appointments — no doctors/patients"))
            return

        STATUS_CYCLE = [
            Appointment.Status.COMPLETED,
            Appointment.Status.COMPLETED,
            Appointment.Status.CONFIRMED,
            Appointment.Status.CONFIRMED,
            Appointment.Status.PENDING,
            Appointment.Status.CANCELLED,
        ]
        VISIT_CYCLE = [
            Appointment.VisitType.IN_PERSON,
            Appointment.VisitType.IN_PERSON,
            Appointment.VisitType.ONLINE,
        ]

        # Build a hospital lookup: doctor_user → hospital
        doc_to_hospital = {}
        for h_data, hospital in zip(NEW_HOSPITALS_DATA, hospitals):
            for dd in h_data["departments_doctors"]:
                uname = dd["doctor"]["username"]
                for u in doctor_users:
                    if u.username == uname:
                        doc_to_hospital[u.pk] = hospital
                        break

        today = timezone.now().date()
        created_count = 0
        slot_times = [dtime(8, 0), dtime(9, 0), dtime(10, 0), dtime(11, 0),
                      dtime(14, 0), dtime(15, 0), dtime(16, 0), dtime(17, 0)]

        for i, (doctor, patient) in enumerate(
            zip(
                (doctor_users * 3)[:21],
                (patients * 2)[:21],
            )
        ):
            hospital = doc_to_hospital.get(doctor.pk)
            if not hospital:
                continue

            # date: past for COMPLETED, future for others
            status = STATUS_CYCLE[i % len(STATUS_CYCLE)]
            offset = -(i % 15 + 1) if status == Appointment.Status.COMPLETED else (i % 7 + 1)
            appt_date = today + timezone.timedelta(days=offset)
            t = slot_times[i % len(slot_times)]
            start_dt = timezone.make_aware(datetime.combine(appt_date, t))
            end_dt   = start_dt + timezone.timedelta(minutes=30)

            # Create or get a slot for this doctor at this time
            try:
                slot, _ = GeneratedSlot.objects.get_or_create(
                    doctor=doctor,
                    start=start_dt,
                    end=end_dt,
                    defaults={
                        "is_booked": True,
                        "is_active": True,
                        "hospital":  hospital,
                    },
                )
            except Exception:
                continue

            reason = HOSP_APPOINTMENT_REASONS[i % len(HOSP_APPOINTMENT_REASONS)]
            vtype  = VISIT_CYCLE[i % len(VISIT_CYCLE)]

            appt, ok = Appointment.objects.get_or_create(
                slot=slot,
                defaults={
                    "patient":          patient,
                    "doctor":           doctor,
                    "hospital":         hospital,
                    "clinic":           None,
                    "status":           status,
                    "visit_type":       vtype,
                    "reason":           reason,
                },
            )
            if ok:
                slot.is_booked = True
                slot.save(update_fields=["is_booked"])
                created_count += 1

                if status == Appointment.Status.COMPLETED:
                    self._create_review(appt, patient, i)
                    self._create_prescription(appt, i)

        self.stdout.write(f"   ✅ {created_count} مواعيد مستشفيات جديدة تم إنشاؤها")
