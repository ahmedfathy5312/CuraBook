"""
Management command to seed Egypt governorates and major cities.
Usage: python manage.py seed_egypt_cities
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from locations.models import Governorate, City


EGYPT_DATA = [
    ("القاهرة", "Cairo", [
        ("القاهرة", "Cairo"), ("مدينة نصر", "Nasr City"), ("مصر الجديدة", "Heliopolis"),
        ("المعادي", "Maadi"), ("الزمالك", "Zamalek"), ("شبرا", "Shubra"),
        ("عين شمس", "Ain Shams"), ("المنيل", "El Manial"),
    ]),
    ("الجيزة", "Giza", [
        ("الجيزة", "Giza"), ("الدقي", "Dokki"), ("المهندسين", "Mohandessin"),
        ("6 أكتوبر", "6th of October"), ("الشيخ زايد", "Sheikh Zayed"),
        ("الهرم", "Haram"), ("فيصل", "Faisal"),
    ]),
    ("الإسكندرية", "Alexandria", [
        ("الإسكندرية", "Alexandria"), ("المنتزه", "Montaza"), ("العجمي", "Agami"),
        ("سيدي بشر", "Sidi Bishr"), ("ستانلي", "Stanley"),
    ]),
    ("الشرقية", "Sharqia", [
        ("الزقازيق", "Zagazig"), ("العاشر من رمضان", "10th of Ramadan"),
        ("بلبيس", "Belbeis"), ("أبو كبير", "Abu Kabir"),
    ]),
    ("الدقهلية", "Dakahlia", [
        ("المنصورة", "Mansoura"), ("طلخا", "Talkha"), ("ميت غمر", "Mit Ghamr"),
    ]),
    ("الغربية", "Gharbia", [
        ("طنطا", "Tanta"), ("المحلة الكبرى", "Mahalla El Kubra"),
        ("كفر الزيات", "Kafr el-Zayat"),
    ]),
    ("القليوبية", "Qalyubia", [
        ("بنها", "Banha"), ("شبرا الخيمة", "Shubra El-Kheima"),
        ("القناطر الخيرية", "Qanater El-Khayreya"),
    ]),
    ("المنوفية", "Monufia", [
        ("شبين الكوم", "Shibin El-Kom"), ("منوف", "Menouf"),
    ]),
    ("البحيرة", "Beheira", [
        ("دمنهور", "Damanhur"), ("كفر الدوار", "Kafr el-Dawwar"),
        ("رشيد", "Rosetta"),
    ]),
    ("الفيوم", "Faiyum", [
        ("الفيوم", "Faiyum"),
    ]),
    ("بني سويف", "Beni Suef", [
        ("بني سويف", "Beni Suef"),
    ]),
    ("المنيا", "Minya", [
        ("المنيا", "Minya"), ("مغاغة", "Maghagha"),
    ]),
    ("أسيوط", "Asyut", [
        ("أسيوط", "Asyut"),
    ]),
    ("سوهاج", "Sohag", [
        ("سوهاج", "Sohag"),
    ]),
    ("قنا", "Qena", [
        ("قنا", "Qena"), ("نجع حمادي", "Nag Hammadi"),
    ]),
    ("الأقصر", "Luxor", [
        ("الأقصر", "Luxor"),
    ]),
    ("أسوان", "Aswan", [
        ("أسوان", "Aswan"),
    ]),
    ("البحر الأحمر", "Red Sea", [
        ("الغردقة", "Hurghada"), ("سفاجا", "Safaga"),
    ]),
    ("بورسعيد", "Port Said", [
        ("بورسعيد", "Port Said"),
    ]),
    ("الإسماعيلية", "Ismailia", [
        ("الإسماعيلية", "Ismailia"),
    ]),
    ("السويس", "Suez", [
        ("السويس", "Suez"),
    ]),
    ("دمياط", "Damietta", [
        ("دمياط", "Damietta"),
    ]),
    ("كفر الشيخ", "Kafr El Sheikh", [
        ("كفر الشيخ", "Kafr El Sheikh"),
    ]),
    ("مطروح", "Matruh", [
        ("مرسى مطروح", "Marsa Matruh"),
    ]),
    ("شمال سيناء", "North Sinai", [
        ("العريش", "Arish"),
    ]),
    ("جنوب سيناء", "South Sinai", [
        ("شرم الشيخ", "Sharm El Sheikh"), ("طابا", "Taba"),
    ]),
    ("الوادي الجديد", "New Valley", [
        ("الخارجة", "Kharga"),
    ]),
]


class Command(BaseCommand):
    help = "Seed Egypt governorates and major cities into the database"

    def handle(self, *args, **options):
        created_gov = 0
        created_city = 0

        for order, (gov_ar, gov_en, cities) in enumerate(EGYPT_DATA):
            gov_slug = slugify(gov_en)
            gov, created = Governorate.objects.get_or_create(
                slug=gov_slug,
                defaults={"name_ar": gov_ar, "name_en": gov_en, "order": order},
            )
            if created:
                created_gov += 1

            for city_ar, city_en in cities:
                city_slug = slugify(f"{gov_en}-{city_en}")
                _, c_created = City.objects.get_or_create(
                    slug=city_slug,
                    defaults={"name_ar": city_ar, "name_en": city_en, "governorate": gov, "is_active": True},
                )
                if c_created:
                    created_city += 1

        self.stdout.write(self.style.SUCCESS(
            f"✅ Seeded {created_gov} governorates and {created_city} cities."
        ))
