"""
CuraBook — seed_full_demo v4  (بيانات ضخمة وحقيقية)
6 مستشفيات | 8 عيادات مستقلة | 34 دكتور | 22 مساعد | 20 مريض
500+ موعد | جداول كاملة | شات | إشعارات | وصفات | سجلات طبية
كلمة المرور: Demo@1234  |  الأدمن: Admin@1234
"""
import random
from datetime import date, time, timedelta, datetime as dt
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

DEMO_PASSWORD  = "Demo@1234"
ADMIN_PASSWORD = "Admin@1234"
TODAY          = timezone.now().date()

HOSPITALS = [
 {
  "info":{"name":"مستشفى الشفاء الدولي","city":"Cairo","address":"١٥ شارع جامعة الدول العربية، المهندسين، القاهرة","phone":"+20223456789","email":"info@shifa-hosp.eg","is_verified":True,"rating":4.8,"doctors_count":5},
  "admin":{"username":"admin_shifa","full_name":"م. كريم عبدالرحمن حسام","email":"hosp.admin.shifa@curabook.demo","phone":"+201001112233","city":"Cairo"},
  "departments":[
   {"name":"قسم القلب والأوعية الدموية","description":"قسطرة وعلاج جراحي لأمراض القلب"},
   {"name":"قسم الجراحة العامة","description":"جراحة عامة ومنظار وجراحة السمنة"},
   {"name":"قسم الأطفال وحديثي الولادة","description":"رعاية الأطفال والخدج"},
   {"name":"قسم الباطنة والغدد","description":"السكري والغدة الدرقية والباطنة"},
   {"name":"قسم الطوارئ","description":"طوارئ 24 ساعة"},
  ],
  "doctors":[
   {"username":"dr_shifa_cardio","full_name":"د. أحمد رضا فرحات","email":"dr1@curabook.demo","phone":"+201111223344","city":"Cairo","specialty":"Cardiology","gender":"male","dob":"1978-03-15","spd":"2006-09-01","license":"MD-EG-001234","fee":"600.00","slot":30,"hp":"700.00","dept":0,"bio":"استشاري أمراض القلب والقسطرة، دكتوراه جامعة القاهرة، زمالة المملكة المتحدة. خبرة 18 عاماً.","edu":[{"degree":"MBBCh","university":"جامعة القاهرة","year":2002},{"degree":"MD القلب","university":"جامعة القاهرة","year":2006},{"degree":"Fellowship","university":"Royal College London","year":2009}],"langs":["العربية","الإنجليزية","الفرنسية"],"certs":[{"title":"Board Certified Cardiologist","issuer":"Egyptian Cardiology Society","year":2008}]},
   {"username":"dr_shifa_surgery","full_name":"د. هاني سعيد مرسي","email":"dr2@curabook.demo","phone":"+201222334455","city":"Cairo","specialty":"General Surgery","gender":"male","dob":"1975-07-22","spd":"2003-01-15","license":"MD-EG-001235","fee":"450.00","slot":45,"hp":"550.00","dept":1,"bio":"أستاذ مشارك الجراحة العامة وجراحة المنظار والسمنة. خبرة 20 عاماً.","edu":[{"degree":"MBBCh","university":"عين شمس","year":2000},{"degree":"MS جراحة","university":"عين شمس","year":2005}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Laparoscopic Surgery","issuer":"ESGE","year":2007}]},
   {"username":"dr_shifa_peds","full_name":"د. سمر علي الجبالي","email":"dr3@curabook.demo","phone":"+201333445566","city":"Cairo","specialty":"Pediatrics","gender":"female","dob":"1982-11-08","spd":"2008-06-01","license":"MD-EG-001236","fee":"300.00","slot":25,"hp":"350.00","dept":2,"bio":"استشارية طب الأطفال وحديثي الولادة. دكتوراه في طب الخدج.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":2006},{"degree":"MD الأطفال","university":"الإسكندرية","year":2010}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Neonatology Fellowship","issuer":"EPS","year":2012}]},
   {"username":"dr_shifa_internal","full_name":"د. باسم سلامة عوض","email":"dr4@curabook.demo","phone":"+201444556677","city":"Cairo","specialty":"Internal Medicine","gender":"male","dob":"1976-06-30","spd":"2002-09-01","license":"MD-EG-001240","fee":"350.00","slot":30,"hp":"400.00","dept":3,"bio":"أخصائي الباطنة والغدد الصماء. دكتوراه في السكري والغدة الدرقية.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2000},{"degree":"MD الباطنة","university":"القاهرة","year":2004}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Diabetology","issuer":"EDS","year":2007}]},
   {"username":"dr_shifa_emerg","full_name":"د. عادل كمال نصر","email":"dr5@curabook.demo","phone":"+201555667788","city":"Cairo","specialty":"Emergency Medicine","gender":"male","dob":"1980-04-10","spd":"2006-03-01","license":"MD-EG-001260","fee":"250.00","slot":20,"hp":"300.00","dept":4,"bio":"أخصائي طوارئ وعناية مركزة. خبرة 17 عاماً في الحالات الحرجة والإسعافات الأولية.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2004},{"degree":"MS طوارئ","university":"القاهرة","year":2008}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"ACLS & ATLS","issuer":"AHA","year":2010}]},
  ],
  "assistants":[
   {"username":"assist_shifa_1","full_name":"نورهان ماجد الوكيل","email":"assist1@curabook.demo","phone":"+201444556699","city":"Cairo","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":True},
   {"username":"assist_shifa_2","full_name":"محمود صلاح عمار","email":"assist2@curabook.demo","phone":"+201555667799","city":"Cairo","role":"receptionist","can_manage":True,"can_upload":False,"can_edit":False},
   {"username":"assist_shifa_3","full_name":"أسماء رمضان فتح الله","email":"assist3@curabook.demo","phone":"+201566778899","city":"Cairo","role":"supervisor","can_manage":True,"can_upload":True,"can_edit":True},
  ],
 },
 {
  "info":{"name":"مستشفى النيل التخصصي","city":"Giza","address":"٤٧ شارع الهرم، الجيزة","phone":"+20235678901","email":"info@nile-specialist.eg","is_verified":True,"rating":4.6,"doctors_count":4},
  "admin":{"username":"admin_nile","full_name":"م. وفاء ناصر الدين شريف","email":"hosp.admin.nile@curabook.demo","phone":"+201002223344","city":"Giza"},
  "departments":[
   {"name":"قسم العظام والمفاصل","description":"جراحة العظام وتبديل المفاصل"},
   {"name":"قسم النساء والتوليد","description":"الحمل والولادة والعقم"},
   {"name":"قسم الأعصاب","description":"أمراض الجهاز العصبي المركزي والطرفي"},
   {"name":"قسم أمراض الدم","description":"سرطانات الدم وأمراض التخثر"},
  ],
  "doctors":[
   {"username":"dr_nile_ortho","full_name":"د. طارق مصطفى البنا","email":"dr6@curabook.demo","phone":"+201666778899","city":"Giza","specialty":"Orthopedics","gender":"male","dob":"1972-04-18","spd":"1999-07-01","license":"MD-EG-001237","fee":"500.00","slot":45,"hp":"600.00","dept":0,"bio":"أستاذ جراحة العظام. FRCS إدنبرة. متخصص في تبديل الورك والركبة. خبرة 25 عاماً.","edu":[{"degree":"MBBCh","university":"المنصورة","year":1996},{"degree":"MS العظام","university":"المنصورة","year":2000},{"degree":"FRCS","university":"Edinburgh","year":2003}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"FRCS Ortho","issuer":"RCSEd","year":2003},{"title":"Joint Replacement","issuer":"BOA","year":2005}]},
   {"username":"dr_nile_obgyn","full_name":"د. إيمان عادل حسونة","email":"dr7@curabook.demo","phone":"+201888990011","city":"Giza","specialty":"Obstetrics & Gynecology","gender":"female","dob":"1984-01-12","spd":"2010-01-01","license":"MD-EG-001239","fee":"450.00","slot":30,"hp":"500.00","dept":1,"bio":"استشارية نساء وتوليد. خبرة 14 عاماً في الحمل عالي الخطورة والجراحة التنظيرية.","edu":[{"degree":"MBBCh","university":"عين شمس","year":2008},{"degree":"MS نساء","university":"عين شمس","year":2012}],"langs":["العربية","الإنجليزية"],"certs":[]},
   {"username":"dr_nile_neuro","full_name":"د. شريف حمدي رزق","email":"dr8@curabook.demo","phone":"+201777889922","city":"Giza","specialty":"Neurology","gender":"male","dob":"1979-06-15","spd":"2005-08-01","license":"MD-EG-001261","fee":"500.00","slot":40,"hp":"580.00","dept":2,"bio":"استشاري الجهاز العصبي. متخصص في الصرع والصداع النصفي والسكتة الدماغية. خبرة 19 عاماً.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2003},{"degree":"MD أعصاب","university":"القاهرة","year":2007}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"EEG Certificate","issuer":"ENS","year":2010}]},
   {"username":"dr_nile_hematology","full_name":"د. منال عبدالغني طه","email":"dr9@curabook.demo","phone":"+201666890033","city":"Giza","specialty":"Hematology","gender":"female","dob":"1977-09-22","spd":"2003-06-01","license":"MD-EG-001262","fee":"550.00","slot":40,"hp":"650.00","dept":3,"bio":"استشارية أمراض الدم وعلاج السرطانات الدموية. حاصلة على دكتوراه من فرنسا.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":2001},{"degree":"MD دم","university":"Sorbonne Paris","year":2005}],"langs":["العربية","الإنجليزية","الفرنسية"],"certs":[{"title":"Hematology Board","issuer":"EHS","year":2007}]},
  ],
  "assistants":[
   {"username":"assist_nile_1","full_name":"دينا رامي القاضي","email":"assist4@curabook.demo","phone":"+201100112233","city":"Giza","role":"supervisor","can_manage":True,"can_upload":True,"can_edit":True},
   {"username":"assist_nile_2","full_name":"سيد أحمد النجار","email":"assist5@curabook.demo","phone":"+201150223344","city":"Giza","role":"coordinator","can_manage":True,"can_upload":False,"can_edit":True},
  ],
 },
 {
  "info":{"name":"مستشفى الإسكندرية الطبي","city":"Alexandria","address":"٨ شارع صفية زغلول، الإسكندرية","phone":"+20345678901","email":"info@alex-medical.eg","is_verified":True,"rating":4.5,"doctors_count":4},
  "admin":{"username":"admin_alex","full_name":"م. عمرو حامد الشريف","email":"hosp.admin.alex@curabook.demo","phone":"+201003334455","city":"Alexandria"},
  "departments":[
   {"name":"قسم طب العيون","description":"جراحة الليزك وإزالة المياه البيضاء"},
   {"name":"قسم أمراض الصدر","description":"الربو والتليف الرئوي"},
   {"name":"قسم الجلدية والتجميل","description":"علاج أمراض الجلد والتجميل الطبي"},
   {"name":"قسم الأورام","description":"تشخيص وعلاج الأورام الصلبة"},
  ],
  "doctors":[
   {"username":"dr_alex_ophtha","full_name":"د. وليد حسن الديب","email":"dr10@curabook.demo","phone":"+201300334455","city":"Alexandria","specialty":"Ophthalmology","gender":"male","dob":"1979-08-14","spd":"2005-05-01","license":"MD-EG-001242","fee":"400.00","slot":30,"hp":"450.00","dept":0,"bio":"جراح العيون. متخصص في الليزك وإزالة المياه البيضاء وزراعة العدسات.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":2003},{"degree":"MS عيون","university":"الإسكندرية","year":2007}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"LASIK Surgeon","issuer":"ESCRS","year":2009}]},
   {"username":"dr_alex_pulmo","full_name":"د. علاء فريد منصور","email":"dr11@curabook.demo","phone":"+201400445566","city":"Alexandria","specialty":"Pulmonology","gender":"male","dob":"1977-12-03","spd":"2004-09-01","license":"MD-EG-001243","fee":"350.00","slot":35,"hp":"400.00","dept":1,"bio":"استشاري أمراض الصدر. متخصص في الربو والتليف الرئوي وتنظير القصبات.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":2001},{"degree":"MD صدر","university":"الإسكندرية","year":2005}],"langs":["العربية","الإنجليزية"],"certs":[]},
   {"username":"dr_alex_derma","full_name":"د. سارة وائل النحاس","email":"dr12@curabook.demo","phone":"+201200223344","city":"Alexandria","specialty":"Dermatology","gender":"female","dob":"1985-05-20","spd":"2011-01-01","license":"MD-EG-001241","fee":"300.00","slot":20,"hp":"350.00","dept":2,"bio":"استشارية الجلدية والتجميل الطبي. البورد الأمريكي. متخصصة في الليزر والبهاق.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":2009},{"degree":"MD جلدية","university":"الإسكندرية","year":2013}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"American Board Dermatology","issuer":"ABD","year":2015}]},
   {"username":"dr_alex_oncology","full_name":"د. مصطفى جمال الدين","email":"dr13@curabook.demo","phone":"+201210334566","city":"Alexandria","specialty":"Oncology","gender":"male","dob":"1971-11-30","spd":"1998-01-01","license":"MD-EG-001263","fee":"700.00","slot":50,"hp":"800.00","dept":3,"bio":"أستاذ علم الأورام بجامعة الإسكندرية. متخصص في أورام الثدي والقولون وعلاج الكيماوي.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":1995},{"degree":"MD أورام","university":"الإسكندرية","year":1999},{"degree":"Fellowship Oncology","university":"MD Anderson","year":2003}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Medical Oncology Board","issuer":"ESMO","year":2005}]},
  ],
  "assistants":[
   {"username":"assist_alex_1","full_name":"منة الله حسام الدين","email":"assist6@curabook.demo","phone":"+201500556677","city":"Alexandria","role":"coordinator","can_manage":True,"can_upload":False,"can_edit":True},
   {"username":"assist_alex_2","full_name":"كريم يوسف عبداللطيف","email":"assist7@curabook.demo","phone":"+201600667788","city":"Alexandria","role":"receptionist","can_manage":True,"can_upload":False,"can_edit":False},
  ],
 },
 {
  "info":{"name":"مستشفى أسيوط الجامعي","city":"Asyut","address":"شارع الجامعة، أسيوط","phone":"+20882345678","email":"info@assiut-univ-hosp.eg","is_verified":True,"rating":4.3,"doctors_count":3},
  "admin":{"username":"admin_assiut","full_name":"م. ليلى صبري عبدالعزيز","email":"hosp.admin.assiut@curabook.demo","phone":"+201004445566","city":"Asyut"},
  "departments":[
   {"name":"قسم الطب النفسي","description":"علاج الاكتئاب والقلق والاضطرابات النفسية"},
   {"name":"قسم الكلى وغسيل الدم","description":"أمراض الكلى المزمنة وغسيل الدم"},
   {"name":"قسم الأمراض المعدية","description":"الأمراض المعدية والحمى المدارية"},
  ],
  "doctors":[
   {"username":"dr_assiut_psych","full_name":"د. محمد نور الدين سليم","email":"dr14@curabook.demo","phone":"+201700778899","city":"Asyut","specialty":"Psychiatry","gender":"male","dob":"1970-02-28","spd":"1997-06-01","license":"MD-EG-001244","fee":"300.00","slot":60,"hp":"350.00","dept":0,"bio":"أستاذ الطب النفسي بجامعة أسيوط. متخصص في الاكتئاب والعلاج المعرفي. خبرة 27 عاماً.","edu":[{"degree":"MBBCh","university":"أسيوط","year":1994},{"degree":"MD نفسية","university":"أسيوط","year":1998}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"CBT Certified","issuer":"BABCP","year":2005}]},
   {"username":"dr_assiut_nephro","full_name":"د. أميرة زكريا الصعيدي","email":"dr15@curabook.demo","phone":"+201800889900","city":"Asyut","specialty":"Nephrology","gender":"female","dob":"1983-07-19","spd":"2009-01-01","license":"MD-EG-001245","fee":"400.00","slot":35,"hp":"450.00","dept":1,"bio":"استشارية الكلى وغسيل الدم. متخصصة في أمراض الكلى المزمنة وبروتوكولات الغسيل.","edu":[{"degree":"MBBCh","university":"أسيوط","year":2007},{"degree":"MS الكلى","university":"أسيوط","year":2011}],"langs":["العربية","الإنجليزية"],"certs":[]},
   {"username":"dr_assiut_infect","full_name":"د. حسام الدين رمضان","email":"dr16@curabook.demo","phone":"+201900990011","city":"Asyut","specialty":"Infectious Disease","gender":"male","dob":"1981-10-05","spd":"2007-09-01","license":"MD-EG-001246","fee":"250.00","slot":30,"hp":"300.00","dept":2,"bio":"أخصائي الأمراض المعدية والحمى. خبرة في التهاب الكبد الفيروسي والأمراض المدارية.","edu":[{"degree":"MBBCh","university":"أسيوط","year":2005},{"degree":"MD معدية","university":"أسيوط","year":2009}],"langs":["العربية","الإنجليزية"],"certs":[]},
  ],
  "assistants":[
   {"username":"assist_assiut_1","full_name":"هبة محمد الجمال","email":"assist8@curabook.demo","phone":"+201050001122","city":"Asyut","role":"receptionist","can_manage":True,"can_upload":False,"can_edit":False},
   {"username":"assist_assiut_2","full_name":"كريم علي السيد","email":"assist9@curabook.demo","phone":"+201055112233","city":"Asyut","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":False},
  ],
 },
 {
  "info":{"name":"مستشفى الأمل للتخصصات الدقيقة","city":"Cairo","address":"٣٢ شارع محي الدين أبوالعز، المهندسين، القاهرة","phone":"+20223998877","email":"info@amal-hospital.eg","is_verified":True,"rating":4.7,"doctors_count":3},
  "admin":{"username":"admin_amal","full_name":"م. إيهاب سمير طلعت","email":"hosp.admin.amal@curabook.demo","phone":"+201005556677","city":"Cairo"},
  "departments":[
   {"name":"قسم جراحة المخ والأعصاب","description":"جراحة الدماغ والنخاع الشوكي"},
   {"name":"قسم طب وجراحة الأوعية","description":"أمراض الشرايين والأوردة"},
   {"name":"قسم تقويم العمود الفقري","description":"علاج إصابات وأمراض العمود الفقري"},
  ],
  "doctors":[
   {"username":"dr_amal_neuro_surg","full_name":"د. أشرف يحيى عزيز","email":"dr17@curabook.demo","phone":"+201210445566","city":"Cairo","specialty":"Neurosurgery","gender":"male","dob":"1968-08-14","spd":"1995-01-01","license":"MD-EG-001264","fee":"900.00","slot":60,"hp":"1000.00","dept":0,"bio":"أستاذ جراحة المخ والأعصاب. خبرة 30 عاماً في جراحة الأورام الدماغية والشرايين المخية.","edu":[{"degree":"MBBCh","university":"القاهرة","year":1992},{"degree":"MS مخ وأعصاب","university":"القاهرة","year":1996},{"degree":"Fellowship","university":"Johns Hopkins","year":2000}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Neurosurgery Board","issuer":"ESNS","year":2002}]},
   {"username":"dr_amal_vasc","full_name":"د. عمرو صادق الطيب","email":"dr18@curabook.demo","phone":"+201220556677","city":"Cairo","specialty":"Vascular Surgery","gender":"male","dob":"1974-03-27","spd":"2001-05-01","license":"MD-EG-001265","fee":"700.00","slot":45,"hp":"800.00","dept":1,"bio":"استشاري جراحة الأوعية الدموية. متخصص في علاج دوالي الساقين والشرايين المسدودة.","edu":[{"degree":"MBBCh","university":"عين شمس","year":1998},{"degree":"MS جراحة","university":"عين شمس","year":2002}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Vascular Surgery Board","issuer":"EVS","year":2005}]},
   {"username":"dr_amal_spine","full_name":"د. هدى فؤاد السباعي","email":"dr19@curabook.demo","phone":"+201230667788","city":"Cairo","specialty":"Spine Surgery","gender":"female","dob":"1980-01-19","spd":"2007-03-01","license":"MD-EG-001266","fee":"650.00","slot":50,"hp":"750.00","dept":2,"bio":"استشارية جراحة العمود الفقري. متخصصة في الانزلاق الغضروفي وتشوهات العمود الفقري.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2004},{"degree":"MS عظام","university":"القاهرة","year":2008},{"degree":"Fellowship Spine","university":"Berlin Charité","year":2012}],"langs":["العربية","الإنجليزية","الألمانية"],"certs":[{"title":"Spine Surgery Fellowship","issuer":"EUROSPINE","year":2013}]},
  ],
  "assistants":[
   {"username":"assist_amal_1","full_name":"ريهام طارق الغزالي","email":"assist10@curabook.demo","phone":"+201240778899","city":"Cairo","role":"supervisor","can_manage":True,"can_upload":True,"can_edit":True},
   {"username":"assist_amal_2","full_name":"أحمد علاء الجزار","email":"assist11@curabook.demo","phone":"+201250889900","city":"Cairo","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":False},
  ],
 },
 {
  "info":{"name":"مستشفى المنصورة الجامعي التخصصي","city":"Mansoura","address":"شارع جامعة المنصورة، المنصورة، الدقهلية","phone":"+20502345678","email":"info@mansour-univ.eg","is_verified":True,"rating":4.4,"doctors_count":3},
  "admin":{"username":"admin_mansour","full_name":"م. رضا حسن الشرقاوي","email":"hosp.admin.mansour@curabook.demo","phone":"+201006667788","city":"Mansoura"},
  "departments":[
   {"name":"قسم الكبد والجهاز الهضمي","description":"تشخيص وعلاج أمراض الكبد والقولون"},
   {"name":"قسم الروماتيزم والمناعة","description":"أمراض المناعة الذاتية والروماتيزم"},
   {"name":"قسم الغدد الصماء والتمثيل الغذائي","description":"السكري والغدة الدرقية وهشاشة العظام"},
  ],
  "doctors":[
   {"username":"dr_mans_hepato","full_name":"د. ياسر نبيل العيسوي","email":"dr20@curabook.demo","phone":"+201260778899","city":"Mansoura","specialty":"Hepatology","gender":"male","dob":"1973-05-11","spd":"2000-09-01","license":"MD-EG-001267","fee":"500.00","slot":40,"hp":"600.00","dept":0,"bio":"أستاذ مشارك أمراض الكبد بجامعة المنصورة. متخصص في التهاب الكبد الفيروسي وتشمع الكبد.","edu":[{"degree":"MBBCh","university":"المنصورة","year":1997},{"degree":"MD كبد","university":"المنصورة","year":2001}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Hepatology Diploma","issuer":"EASL","year":2005}]},
   {"username":"dr_mans_rheum","full_name":"د. نادية فاروق الجمل","email":"dr21@curabook.demo","phone":"+201270889900","city":"Mansoura","specialty":"Rheumatology","gender":"female","dob":"1978-09-03","spd":"2005-01-01","license":"MD-EG-001268","fee":"450.00","slot":35,"hp":"520.00","dept":1,"bio":"استشارية الروماتيزم والمناعة. متخصصة في الذئبة والتهاب المفاصل الروماتويدي.","edu":[{"degree":"MBBCh","university":"المنصورة","year":2002},{"degree":"MD روماتيزم","university":"المنصورة","year":2006}],"langs":["العربية","الإنجليزية"],"certs":[]},
   {"username":"dr_mans_endo","full_name":"د. وائل صبحي إبراهيم","email":"dr22@curabook.demo","phone":"+201280990011","city":"Mansoura","specialty":"Endocrinology","gender":"male","dob":"1976-12-25","spd":"2003-06-01","license":"MD-EG-001269","fee":"480.00","slot":35,"hp":"550.00","dept":2,"bio":"أخصائي الغدد الصماء والتمثيل الغذائي. متخصص في السكري وهشاشة العظام والغدة الدرقية.","edu":[{"degree":"MBBCh","university":"المنصورة","year":2000},{"degree":"MD غدد","university":"المنصورة","year":2004}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Endocrinology Diploma","issuer":"ESE","year":2007}]},
  ],
  "assistants":[
   {"username":"assist_mans_1","full_name":"نسرين عاطف حمدان","email":"assist12@curabook.demo","phone":"+201290001122","city":"Mansoura","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":True},
  ],
 },
]
CLINIC_DOCTORS = [
 {"doctor":{"username":"dr_c_gp","full_name":"د. نهى سعيد القاضي","email":"dr23@curabook.demo","phone":"+201080334455","city":"Cairo","specialty":"General Practice","gender":"female","dob":"1988-03-11","spd":"2014-01-01","license":"MD-EG-001247","fee":"150.00","slot":20,"bio":"طبيبة عامة. متخصصة في الرعاية الأولية وإدارة الأمراض المزمنة للأسرة.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2012}],"langs":["العربية","الإنجليزية"],"certs":[]},"clinic":{"name":"عيادة د. نهى القاضي للطب العام — مدينة نصر","address":"٧ شارع عباس العقاد، مدينة نصر، القاهرة","city":"Cairo","phone":"+20222111333","price":"150.00","lat":"30.063600","lng":"31.338700"},"assistant":{"username":"assist_c_gp","full_name":"ياسمين خالد الطيب","email":"assist13@curabook.demo","phone":"+201090445566","city":"Cairo","role":"receptionist","can_manage":True,"can_upload":True,"can_edit":False}},
 {"doctor":{"username":"dr_c_cardio","full_name":"د. أحمد وائل الخولي","email":"dr24@curabook.demo","phone":"+201081445566","city":"Cairo","specialty":"Cardiology","gender":"male","dob":"1975-06-20","spd":"2002-09-01","license":"MD-EG-001248","fee":"600.00","slot":30,"bio":"استشاري أمراض القلب والقسطرة التشخيصية. دكتوراه القاهرة وفلوشيب Cleveland. خبرة 22 عاماً.","edu":[{"degree":"MBBCh","university":"القاهرة","year":1999},{"degree":"MD قلب","university":"القاهرة","year":2003},{"degree":"Fellowship","university":"Cleveland Clinic","year":2007}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Interventional Cardiology","issuer":"ACC","year":2008}]},"clinic":{"name":"عيادة د. أحمد الخولي لأمراض القلب — مصر الجديدة","address":"١٢ شارع الثورة، الدور الثاني، مصر الجديدة، القاهرة","city":"Cairo","phone":"+20224556677","price":"650.00","lat":"30.086800","lng":"31.328100"},"assistant":{"username":"assist_c_cardio","full_name":"رامي عبدالكريم الحلواني","email":"assist14@curabook.demo","phone":"+201060112233","city":"Cairo","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":True}},
 {"doctor":{"username":"dr_c_neuro","full_name":"د. رانيا محفوظ عثمان","email":"dr25@curabook.demo","phone":"+201082556677","city":"Giza","specialty":"Neurology","gender":"female","dob":"1980-09-25","spd":"2007-03-15","license":"MD-EG-001249","fee":"550.00","slot":40,"bio":"استشارية علم الأعصاب. دكتوراه من ألمانيا. متخصصة في الصداع النصفي والصرع.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2004},{"degree":"MD أعصاب","university":"Heidelberg","year":2009}],"langs":["العربية","الإنجليزية","الألمانية"],"certs":[{"title":"EEG Certificate","issuer":"ENS","year":2011}]},"clinic":{"name":"عيادة د. رانيا عثمان للأعصاب — الدقي","address":"٣ شارع التحرير، الدور الأول، الدقي، الجيزة","city":"Giza","phone":"+20237889900","price":"600.00","lat":"30.037700","lng":"31.211800"},"assistant":{"username":"assist_c_neuro","full_name":"إيناس فتحي الباز","email":"assist15@curabook.demo","phone":"+201070223344","city":"Giza","role":"supervisor","can_manage":True,"can_upload":True,"can_edit":True}},
 {"doctor":{"username":"dr_c_derma","full_name":"د. منار صلاح السيد","email":"dr26@curabook.demo","phone":"+201083667788","city":"Alexandria","specialty":"Dermatology","gender":"female","dob":"1986-02-14","spd":"2012-04-01","license":"MD-EG-001250","fee":"350.00","slot":20,"bio":"طبيبة جلدية وتجميل. بورد أوروبي. متخصصة في الليزر وعلاج التصبغات وحب الشباب.","edu":[{"degree":"MBBCh","university":"الإسكندرية","year":2010},{"degree":"MD جلدية","university":"الإسكندرية","year":2014}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"European Board Dermatology","issuer":"UEMS","year":2016}]},"clinic":{"name":"عيادة د. منار السيد للجلدية والتجميل — الإسكندرية","address":"٩ شارع النبي دانيال، الدور الثاني، الإسكندرية","city":"Alexandria","phone":"+20345667788","price":"380.00","lat":"31.197500","lng":"29.910200"},"assistant":{"username":"assist_c_derma","full_name":"نجلاء وائل المغربي","email":"assist16@curabook.demo","phone":"+201085778899","city":"Alexandria","role":"receptionist","can_manage":True,"can_upload":False,"can_edit":False}},
 {"doctor":{"username":"dr_c_ortho","full_name":"د. محمد فاروق الشناوي","email":"dr27@curabook.demo","phone":"+201084778899","city":"Cairo","specialty":"Orthopedics","gender":"male","dob":"1974-11-05","spd":"2001-01-01","license":"MD-EG-001251","fee":"500.00","slot":45,"bio":"استشاري جراحة العظام والمفاصل. FRCS. متخصص في إصابات الملاعب وجراحة الركبة التنظيرية.","edu":[{"degree":"MBBCh","university":"القاهرة","year":1998},{"degree":"MS عظام","university":"القاهرة","year":2002},{"degree":"FRCS","university":"Glasgow","year":2006}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"FRCS Ortho","issuer":"RCSGlasg","year":2006}]},"clinic":{"name":"عيادة د. محمد الشناوي للعظام والمفاصل — مدينة نصر","address":"٤٥ شارع بغداد، مدينة نصر، القاهرة","city":"Cairo","phone":"+20222889977","price":"550.00","lat":"30.066400","lng":"31.340700"},"assistant":{"username":"assist_c_ortho","full_name":"علاء الدين حسن مراد","email":"assist17@curabook.demo","phone":"+201086889900","city":"Cairo","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":True}},
 {"doctor":{"username":"dr_c_ped","full_name":"د. هالة وجدي الشرقاوي","email":"dr28@curabook.demo","phone":"+201087990011","city":"Giza","specialty":"Pediatrics","gender":"female","dob":"1984-07-18","spd":"2010-09-01","license":"MD-EG-001252","fee":"250.00","slot":20,"bio":"استشارية طب الأطفال. متخصصة في أمراض الجهاز التنفسي عند الأطفال واللقاحات.","edu":[{"degree":"MBBCh","university":"عين شمس","year":2008},{"degree":"MD أطفال","university":"عين شمس","year":2012}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Pediatric Pulmonology","issuer":"ERS","year":2015}]},"clinic":{"name":"عيادة د. هالة الشرقاوي لطب الأطفال — المهندسين","address":"١٨ شارع إبراهيم الهلباوي، المهندسين، الجيزة","city":"Giza","phone":"+20233778899","price":"280.00","lat":"30.058200","lng":"31.199100"},"assistant":{"username":"assist_c_ped","full_name":"سناء جمال الزيات","email":"assist18@curabook.demo","phone":"+201088001122","city":"Giza","role":"receptionist","can_manage":True,"can_upload":False,"can_edit":False}},
 {"doctor":{"username":"dr_c_psych","full_name":"د. سامح عبدالفتاح غنيم","email":"dr29@curabook.demo","phone":"+201089112233","city":"Cairo","specialty":"Psychiatry","gender":"male","dob":"1977-04-22","spd":"2004-06-01","license":"MD-EG-001253","fee":"400.00","slot":60,"bio":"استشاري الطب النفسي والعلاج المعرفي السلوكي. متخصص في الاكتئاب والقلق واضطرابات النوم.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2001},{"degree":"MD نفسية","university":"القاهرة","year":2005}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"CBT Advanced","issuer":"BABCP","year":2008},{"title":"Sleep Medicine Diploma","issuer":"ESRS","year":2012}]},"clinic":{"name":"عيادة د. سامح غنيم للطب النفسي والعلاج السلوكي — الزمالك","address":"٦ شارع البطل أحمد عبدالعزيز، الزمالك، القاهرة","city":"Cairo","phone":"+20227788990","price":"450.00","lat":"30.066800","lng":"31.222300"},"assistant":{"username":"assist_c_psych","full_name":"مروة أيمن عثمان","email":"assist19@curabook.demo","phone":"+201091223344","city":"Cairo","role":"coordinator","can_manage":True,"can_upload":True,"can_edit":True}},
 {"doctor":{"username":"dr_c_gastro","full_name":"د. تامر إبراهيم العوضي","email":"dr30@curabook.demo","phone":"+201092334455","city":"Cairo","specialty":"Gastroenterology","gender":"male","dob":"1976-08-30","spd":"2003-01-01","license":"MD-EG-001254","fee":"500.00","slot":35,"bio":"استشاري أمراض الجهاز الهضمي والكبد. متخصص في المنظار العلاجي وأمراض القولون الالتهابية.","edu":[{"degree":"MBBCh","university":"القاهرة","year":2000},{"degree":"MD جهاز هضمي","university":"القاهرة","year":2004},{"degree":"Fellowship Endoscopy","university":"Erasmus Rotterdam","year":2008}],"langs":["العربية","الإنجليزية"],"certs":[{"title":"Therapeutic Endoscopy","issuer":"ESGE","year":2009}]},"clinic":{"name":"عيادة د. تامر العوضي للجهاز الهضمي والمناظير — وسط البلد","address":"٢٢ شارع طلعت حرب، الدور الخامس، وسط البلد، القاهرة","city":"Cairo","phone":"+20223456001","price":"550.00","lat":"30.044700","lng":"31.235500"},"assistant":{"username":"assist_c_gastro","full_name":"ولاء محمد البحيري","email":"assist20@curabook.demo","phone":"+201093445566","city":"Cairo","role":"supervisor","can_manage":True,"can_upload":True,"can_edit":True}},
]

PATIENTS = [
 {"username":"pat1","full_name":"محمد عبدالله رزق","email":"pat1@curabook.demo","phone":"+201090000001","city":"Cairo","gender":"male","dob":"1985-04-12","bt":"A+","alg":"بنسلين","chr":"ارتفاع ضغط الدم"},
 {"username":"pat2","full_name":"فاطمة حسن علي","email":"pat2@curabook.demo","phone":"+201090000002","city":"Alexandria","gender":"female","dob":"1990-09-25","bt":"B+","alg":"لا يوجد","chr":"سكري نوع 2"},
 {"username":"pat3","full_name":"يوسف منصور عطا","email":"pat3@curabook.demo","phone":"+201090000003","city":"Giza","gender":"male","dob":"1978-07-03","bt":"O+","alg":"سلفا","chr":"ربو"},
 {"username":"pat4","full_name":"نهى إبراهيم سعد","email":"pat4@curabook.demo","phone":"+201090000004","city":"Cairo","gender":"female","dob":"1995-11-18","bt":"AB+","alg":"لا يوجد","chr":"لا يوجد"},
 {"username":"pat5","full_name":"عمر طارق الجندي","email":"pat5@curabook.demo","phone":"+201090000005","city":"Cairo","gender":"male","dob":"1982-02-28","bt":"A-","alg":"أسبرين","chr":"التهاب مفاصل"},
 {"username":"pat6","full_name":"سمر وليد الحسيني","email":"pat6@curabook.demo","phone":"+201090000006","city":"Alexandria","gender":"female","dob":"1993-06-14","bt":"B-","alg":"لا يوجد","chr":"قصور الغدة الدرقية"},
 {"username":"pat7","full_name":"أحمد عادل مصطفى","email":"pat7@curabook.demo","phone":"+201090000007","city":"Giza","gender":"male","dob":"1975-12-01","bt":"O-","alg":"مورفين","chr":"سكري وضغط"},
 {"username":"pat8","full_name":"رانيا محمود كامل","email":"pat8@curabook.demo","phone":"+201090000008","city":"Cairo","gender":"female","dob":"1988-08-20","bt":"A+","alg":"لا يوجد","chr":"لا يوجد"},
 {"username":"pat9","full_name":"خالد عصام بدوي","email":"pat9@curabook.demo","phone":"+201090000009","city":"Asyut","gender":"male","dob":"1970-03-15","bt":"B+","alg":"كودين","chr":"فشل كلوي مزمن"},
 {"username":"pat10","full_name":"هبة يحيى الشامي","email":"pat10@curabook.demo","phone":"+201090000010","city":"Asyut","gender":"female","dob":"1998-10-08","bt":"O+","alg":"لا يوجد","chr":"لا يوجد"},
 {"username":"pat11","full_name":"إبراهيم سامي فؤاد","email":"pat11@curabook.demo","phone":"+201090000011","city":"Cairo","gender":"male","dob":"1960-05-22","bt":"AB-","alg":"بيتا بلوكر","chr":"أمراض قلب وضغط"},
 {"username":"pat12","full_name":"منى رفعت صادق","email":"pat12@curabook.demo","phone":"+201090000012","city":"Giza","gender":"female","dob":"1987-01-30","bt":"A+","alg":"لا يوجد","chr":"أنيميا"},
 {"username":"pat13","full_name":"زياد فاروق العزب","email":"pat13@curabook.demo","phone":"+201090000013","city":"Alexandria","gender":"male","dob":"2000-07-11","bt":"B+","alg":"لا يوجد","chr":"لا يوجد"},
 {"username":"pat14","full_name":"أميرة حمدي القط","email":"pat14@curabook.demo","phone":"+201090000014","city":"Cairo","gender":"female","dob":"1975-04-05","bt":"O+","alg":"سلفا","chr":"ضغط دم مرتفع"},
 {"username":"pat15","full_name":"مصطفى علي الرافعي","email":"pat15@curabook.demo","phone":"+201090000015","city":"Cairo","gender":"male","dob":"1992-09-17","bt":"A+","alg":"لا يوجد","chr":"لا يوجد"},
 {"username":"pat16","full_name":"ولاء صبري فريد","email":"pat16@curabook.demo","phone":"+201090000016","city":"Giza","gender":"female","dob":"1983-12-28","bt":"B+","alg":"بنسلين","chr":"سكري وغدة"},
 {"username":"pat17","full_name":"تامر حلمي الوزير","email":"pat17@curabook.demo","phone":"+201090000017","city":"Alexandria","gender":"male","dob":"1967-06-06","bt":"O-","alg":"لا يوجد","chr":"ضغط وكولسترول"},
 {"username":"pat18","full_name":"ريم سعد الخولي","email":"pat18@curabook.demo","phone":"+201090000018","city":"Asyut","gender":"female","dob":"2002-03-21","bt":"A-","alg":"لا يوجد","chr":"لا يوجد"},
 {"username":"pat19","full_name":"حسام جمال نبيل","email":"pat19@curabook.demo","phone":"+201090000019","city":"Cairo","gender":"male","dob":"1979-11-14","bt":"AB+","alg":"أسبرين","chr":"نقرس وضغط"},
 {"username":"pat20","full_name":"دنيا أشرف زيدان","email":"pat20@curabook.demo","phone":"+201090000020","city":"Alexandria","gender":"female","dob":"1996-08-02","bt":"B+","alg":"لا يوجد","chr":"لا يوجد"},
]
PLATFORM_ADMIN={"username":"platform_admin","full_name":"مدير منصة CuraBook","email":"admin@curabook.demo","phone":"+201000000000"}

VISIT_REASONS=["فحص دوري شامل","ألم في الصدر متكرر","ضيق تنفس عند المجهود","صداع نصفي مزمن","ارتفاع ضغط الدم","متابعة مرض السكري","ألم في مفصل الركبة","طفح جلدي مستمر","دوخة وطنين","تعب عام وإجهاد","مراجعة نتائج التحاليل","ألم في أسفل الظهر","مشكلة في الرؤية","سعال مزمن","اضطراب النوم","حمى مستمرة","ألم حاد في البطن","غثيان وقيء","إسهال مزمن","فقدان الوزن","تورم في القدمين","خفقان القلب","ألم في الرقبة","حرقة المعدة","متابعة ما بعد الجراحة","ألم عند التبول","تنميل في الأطراف","آلام الطمث","كحة مع بلغم","ألم في الكتف","احمرار في العين","قلق ونوبات هلع","اكتئاب","فحص وظائف الكلى","بقعة جلدية مشبوهة","التهاب في الحلق","فحص الغدة الدرقية","متابعة علاج الضغط","ضعف عام وشحوب","ألم عند التنفس"]
DIAGNOSES=["ارتفاع ضغط الدم الأولي — يستجيب للعلاج","الذبحة الصدرية المستقرة","الصداع النصفي مع أورة","هشاشة العظام المبكرة","التهاب المفاصل الروماتويدي","داء السكري النوع الثاني — حسن الضبط","قصور الغدة الدرقية — تحت العلاج","الربو القصبي المعتدل","التهاب الجلد التأتبي","فقر الدم بعوز الحديد","الارتجاع المريئي الحمضي","انزلاق غضروفي L4-L5","التهاب الرئة الجرثومي","قرحة المعدة الهضمية","متلازمة القولون العصبي","داء السكري النوع الأول","الصرع الجزئي — تحت السيطرة","التهاب الكبد C المزمن","قصور القلب الاحتقاني — مستقر","متلازمة توقف التنفس أثناء النوم","الاكتئاب الاكلينيكي المتوسط","اضطراب القلق العام","نقص فيتامين D الحاد","فرط نشاط الغدة الدرقية","الصداع التوتري المزمن","التهاب الجيوب الأنفية","التهاب اللوزتين المتكرر","تكيسات المبيض","الصدفية المزمنة","التهاب المثانة المتكرر"]
DRUGS=[
 {"n":"أملوديبين","d":"5mg","f":"مرة يومياً","dur":"شهر","i":"مع أو بدون طعام"},
 {"n":"ميتفورمين","d":"500mg","f":"مرتين يومياً","dur":"شهران","i":"أثناء الوجبات"},
 {"n":"أتورفاستاتين","d":"20mg","f":"مرة يومياً","dur":"شهران","i":"في المساء"},
 {"n":"أوميبرازول","d":"20mg","f":"مرة يومياً","dur":"أسبوعان","i":"قبل الإفطار بـ30د"},
 {"n":"أسبرين","d":"100mg","f":"مرة يومياً","dur":"مستمر","i":"مع الطعام"},
 {"n":"باراسيتامول","d":"500mg","f":"عند الحاجة","dur":"أسبوع","i":"لا تتجاوز 4g يومياً"},
 {"n":"إيبوبروفين","d":"400mg","f":"3 مرات يومياً","dur":"10 أيام","i":"بعد الطعام"},
 {"n":"ليفوثيروكسين","d":"100mcg","f":"مرة يومياً","dur":"مستمر","i":"قبل الإفطار بـ30د"},
 {"n":"سالبوتامول","d":"100mcg","f":"عند الضيق","dur":"عند الحاجة","i":"جهاز استنشاق"},
 {"n":"أموكسيسيلين","d":"500mg","f":"3 مرات يومياً","dur":"7 أيام","i":"أكمل الجرعة"},
 {"n":"ديكلوفيناك","d":"75mg","f":"مرتين يومياً","dur":"5 أيام","i":"مع الطعام"},
 {"n":"سيرترالين","d":"50mg","f":"مرة يومياً","dur":"شهران","i":"في الصباح"},
 {"n":"بيزوبرولول","d":"5mg","f":"مرة يومياً","dur":"مستمر","i":"في الصباح مع الطعام"},
 {"n":"رامبريل","d":"5mg","f":"مرة يومياً","dur":"مستمر","i":"في أي وقت"},
 {"n":"فيتامين D3","d":"5000IU","f":"مرة يومياً","dur":"3 أشهر","i":"مع وجبة دهنية"},
 {"n":"كالسيوم كربونات","d":"500mg","f":"مرتين يومياً","dur":"مستمر","i":"مع الطعام"},
 {"n":"غابابنتين","d":"300mg","f":"3 مرات يومياً","dur":"شهر","i":"مع أو بدون طعام"},
 {"n":"دولوكستين","d":"60mg","f":"مرة يومياً","dur":"شهران","i":"مع الطعام"},
 {"n":"أزيثرومايسين","d":"500mg","f":"مرة يومياً","dur":"3 أيام","i":"ساعة قبل الأكل"},
 {"n":"بانتوبرازول","d":"40mg","f":"مرة يومياً","dur":"شهر","i":"قبل الإفطار"},
 {"n":"بريدنيزون","d":"20mg","f":"مرة يومياً","dur":"5 أيام","i":"مع الإفطار"},
 {"n":"كلوبيدوجريل","d":"75mg","f":"مرة يومياً","dur":"مستمر","i":"مع أو بدون طعام"},
 {"n":"ميتوبرولول","d":"50mg","f":"مرتين يومياً","dur":"مستمر","i":"مع الطعام"},
 {"n":"فوروسيميد","d":"40mg","f":"مرة يومياً","dur":"أسبوعان","i":"في الصباح الباكر"},
 {"n":"ألوبيورينول","d":"300mg","f":"مرة يومياً","dur":"مستمر","i":"مع الإفطار"},
]
REVIEWS=[
 {"r":5,"c":"دكتور ممتاز، شرح حالتي بتفصيل وكان صبور جداً. بشكر الجميع على الاهتمام الرائع."},
 {"r":5,"c":"من أحسن الأطباء اللي اتعاملت معاهم. دقيق في التشخيص ومتابعته مستمرة ومش بيترك المريض."},
 {"r":5,"c":"دكتورة محترمة جداً وعندها خبرة واسعة. شعرت بالأمان من أول جلسة وما ترددتش أرجعلها."},
 {"r":5,"c":"الحجز كان سهل والدكتور في ميعاده بالظبط. خدمة ممتازة وكلام واضح وبسيط."},
 {"r":5,"c":"شفيت بعد ما يأست من كتير من الأطباء. ربنا يكرمك يا دكتور ويجعله في ميزان حسناتك."},
 {"r":5,"c":"العيادة نظيفة ومرتبة جداً والدكتورة بتتعامل بكل احترام واهتمام مع كل المرضى."},
 {"r":5,"c":"أنا متابع عند الدكتور من 3 سنين والحمد لله دايماً عنده الحل الصح لكل مشكلة."},
 {"r":4,"c":"دكتور كويس جداً ومتمكن في تخصصه، بس الانتظار كان طويل شوية. هارجعله تاني بكل تأكيد."},
 {"r":4,"c":"التشخيص كان صح والدواء أثّر معايا كويس خلال أسبوع. شكراً دكتور على المتابعة."},
 {"r":4,"c":"دكتورة محترمة ومتابعة. بس وقت الكشف كان قصير شوية. عموماً تجربة كويسة وهأجيلها تاني."},
 {"r":4,"c":"المستشفى نظيف والطاقم محترم جداً. الدكتور شاطر في تخصصه وشرح كل حاجة بالتفصيل."},
 {"r":3,"c":"الدكتور كويس بس كان مشغول جداً وما اتكلمناش كتير. هأجرب مرة تانية وأشوف."},
 {"r":3,"c":"الانتظار كان طويل شوية. الكشف نفسه كان كويس والدكتور فاهم مشكلتي."},
 {"r":2,"c":"الانتظار تجاوز الساعتين وما حسيتش بالاهتمام الكافي. أتمنى يتحسن الوضع."},
]
CHAT_PD=[
 [("p","السلام عليكم دكتور، عندي سؤال بخصوص الدواء اللي وصفته."),("d","أهلاً، تفضل."),("p","هل أقدر آخد أملوديبين مع الأسبرين في نفس الوقت؟"),("d","أيوه مفيش تداخل. بس خليك تاخد الأسبرين بعد الأكل."),("p","وهل أوقفه لو حسيت بتحسن؟"),("d","لأ أبداً، كمل الجرعة. وقفه فجأة ممكن يرجع الضغط أعلى."),("p","حاضر يا دكتور، شكراً جزيلاً!")],
 [("p","دكتور، الضغط عندي وصل 150/95 الصبح ده."),("d","ده ارتفاع محتاج متابعة. هتتحمل زيادة جرعة الدواء؟"),("p","أيوه، مفيش مشكلة."),("d","تمام، زود الجرعة لـ 10mg وراجعني بعد أسبوع بقراءات الضغط اليومية."),("p","حاضر يا دكتور، هسجل القراءات يومياً وهبعتهالك.")],
 [("p","صباح الخير دكتورة، شوفتي نتيجة التحليل اللي بعتهولك؟"),("d","صباح النور. أيوه شفته. النتيجة كويسة والحمد لله مفيش حاجة مقلقة."),("p","الحمد لله! وإيه الخطوة الجاية؟"),("d","نعمل تحليل HbA1c بعد شهر ونشوف الصورة الكاملة. وكمل الدواء بانتظام."),("p","حاضر يا دكتورة. شكراً على المتابعة."),("d","العفو. لو حسيت بأي حاجة غريبة بلغني فوراً.")],
 [("p","دكتور، عندي ألم في الركبة بعد التمرين امبارح."),("d","ده طبيعي بعد أول جلسة. العضلات بتتأقلم. هيروح في يومين."),("p","وهل أوقف التمارين؟"),("d","لأ، استمر بس بشكل أخف. وحط جليد 15 دقيقة مرتين في اليوم."),("p","تمام. وهل أحتاج مسكن؟"),("d","لو الألم شديد تقدر تاخد إيبوبروفين مع الأكل. بس مش لازم في الغالب.")],
 [("p","دكتورة، قلقانة من نتيجة تحليل السكر اللي طلع 200."),("d","لا تقلقيش. الرقم ده لوحده مش كافي. ممكن يكون بعد أكل."),("p","إزاي أعرف؟"),("d","هنعمل تحليل سكر صيام وHbA1c. هما اللي بيحددوا الصورة الحقيقية."),("p","وامتى أعملهم؟"),("d","الصيام بكرة الصبح وأنت صايم 8 ساعات. والتاني في أي وقت."),("p","حاضر، شكراً دكتورة، اطمنيت كتير.")],
 [("p","دكتور، عندي صداع شديد من 3 أيام مش بيروح بالمسكنات."),("d","ده محتاج فحص. أحكيلي أكتر: فين بالظبط الألم وبييجي امتى؟"),("p","في جنب الرأس الشمال وبييجي في الصبح مع غثيان."),("d","ده يشبه الصداع النصفي. هنعمل لك MRI عشان نتأكد ونبدأ علاج مناسب."),("p","هل ده خطير؟"),("d","غالباً لأ، بس لازم نستبعد أسباب تانية. ميعادك الأسبوع الجاي.")],
 [("p","دكتورة، ابني عنده حرارة 38.5 من امبارح الليل."),("d","عمره كام وفيه أي أعراض تانية؟"),("p","5 سنين وعنده رشح وكحة خفيفة."),("d","ده غالباً فيروسي وهيخف في 3-5 أيام. دي باراسيتامول كل 6 ساعات لو الحرارة فوق 38."),("p","وهل أروح الطوارئ؟"),("d","لو الحرارة زادت عن 39.5 أو ظهر طفح جلدي أو صعوبة تنفس، روح فوراً. غير كده هو بخير.")],
 [("p","دكتور، ناوي أسافر الشهر الجاي. فيه حاجة لازم أعملها؟"),("d","لو سفر خارجي، محتاج تراجع لقاحاتك وتاخد معاك أدويتك بكميات كافية."),("p","السفر إلى أوروبا لأسبوعين."),("d","تمام. خليك تاخد الأدوية الزيادة وأعمل تأمين طبي. ولو في أزمة، روح أقرب طوارئ."),("p","حاضر يا دكتور. وهل أغير مواعيد الدواء بسبب فارق التوقيت؟"),("d","خليك على مواعيدك المحلية الأول وبعدين تدرج التغيير. مش فرق كبير لأسبوعين.")],
]
CHAT_AD=[
 [("a","دكتور، في مريض طلب تغيير موعده من الخميس للأحد. موافق؟"),("d","الأحد ممتلئ. اقترح عليه الثلاثاء الساعة 11."),("a","حاضر، هتصل بيه دلوقتي."),("d","تمام."),("a","وافق على الثلاثاء. تم التعديل."),("d","ممتاز، شكراً!")],
 [("a","دكتورة، عندي 7 مرضى محجوزين بكرة. هل الجدول تمام؟"),("d","أيوه، بس خليهم يجوا ميعادهم بالظبط."),("a","وفي مريض جديد طلب موعد عاجل عنده ألم صدر حاد."),("d","ده محتاج يروح طوارئ مباشرة! وجهيه دلوقتي."),("a","تم. هو في الطريق للطوارئ."),("d","كويس. وسجل الحادثة في النظام.")],
 [("a","دكتور، فيه شكوى من مريضة إنها استنت ساعة ونص."),("d","أنا عارف، الحالة قبلها كانت طارئة. اعتذر منها وديلها خصم 20% على الكشف الجاي."),("a","حاضر. هتكلم معها دلوقتي."),("d","شكراً. وحاول تبقى فيه وقت احتياطي بين الكشوفات."),("a","تم. وضعت 15 دقيقة احتياطي في الجدول.")],
 [("a","دكتورة، في مريضة حامل في الشهر 7 بتحجز موعد طارئ."),("d","خليها تيجي دلوقتي. إيه المشكلة؟"),("a","بتقول إنها حاسة بضغط في البطن من الصبح."),("d","ده محتاج فحص عاجل. خليها تيجي في أقرب وقت."),("a","حاضر، هتصل بيها دلوقتي وهقولها تيجي فوراً.")],
]

class Command(BaseCommand):
    help = "CuraBook v4 — بيانات ضخمة وحقيقية مع فصل تام"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true")

    def handle(self, *args, **options):
        if options["clear"]:
            self._clear()
        with transaction.atomic():
            self.stdout.write("=" * 60)
            self.stdout.write("  CuraBook v4 — seed ضخم وحقيقي")
            self.stdout.write("=" * 60)
            self._create_admin()
            patients = [self._make_patient(p) for p in PATIENTS]
            hospitals, h_docs, h_assists = [], [], []
            for hd in HOSPITALS:
                hosp, docs, assists = self._build_hospital(hd)
                hospitals.append(hosp)
                h_docs.extend(docs)
                h_assists.extend(assists)
            c_docs, c_assists, clinic_map = [], [], {}
            for cd in CLINIC_DOCTORS:
                doc, clinic, assist = self._build_clinic(cd)
                c_docs.append(doc)
                c_assists.append(assist)
                clinic_map[doc.email] = clinic
            self._make_hosp_appointments(h_docs, patients, hospitals)
            self._make_clinic_appointments(c_docs, patients, clinic_map)
            self._make_schedules(h_docs, hospitals, {})
            self._make_schedules(c_docs, [], clinic_map)
            self._make_hosp_shifts(h_assists, hospitals)
            self._make_clinic_shifts(c_assists)
            all_docs = h_docs + c_docs
            all_assists = h_assists + c_assists
            self._make_reports(patients, all_docs)
            self._make_notifications(all_docs, patients, all_assists)
            self._make_chat(all_docs, patients, all_assists)
            self._make_reviews(all_docs, patients, hospitals)
            self._make_video_sessions()
            self._summary(hospitals, clinic_map, all_assists)

    def _clear(self):
        from apps.accounts.models import User
        emails = [p["email"] for p in PATIENTS] + [PLATFORM_ADMIN["email"]]
        for h in HOSPITALS:
            emails += [h["admin"]["email"]] + [d["email"] for d in h["doctors"]] + [a["email"] for a in h["assistants"]]
        for c in CLINIC_DOCTORS:
            emails += [c["doctor"]["email"], c["assistant"]["email"]]
        n, _ = User.objects.filter(email__in=emails).delete()
        self.stdout.write(f"  حُذف {n} مستخدم")

    def _create_admin(self):
        from apps.accounts.models import User
        d = PLATFORM_ADMIN
        u, c = User.objects.get_or_create(email=d["email"], defaults={"username":d["username"],"full_name":d["full_name"],"phone":d["phone"],"role":"admin","is_platform_admin":True,"is_staff":True,"is_superuser":True,"is_active":True})
        if c: u.set_password(ADMIN_PASSWORD); u.save()
        self.stdout.write(f"  ✓ Admin: {u.email}")

    def _build_hospital(self, hd):
        from hospital.models import Hospital, HospitalAdmin as HA, HospitalDoctor, HospitalAssistant
        from apps.departments.models import Department
        from apps.accounts.models import User
        from apps.doctors.models import DoctorProfile
        from apps.assistants.models import AssistantProfile
        hi = hd["info"]
        hosp, _ = Hospital.objects.get_or_create(email=hi["email"], defaults={"name":hi["name"],"city":hi["city"],"address":hi["address"],"phone":hi["phone"],"is_verified":hi["is_verified"],"rating":hi.get("rating",4.0),"doctors_count":hi.get("doctors_count",0),"is_active":True})
        self.stdout.write(f"  ✓ مستشفى: {hosp.name}")
        depts = []
        for dd in hd["departments"]:
            dept, _ = Department.objects.get_or_create(hospital=hosp, name=dd["name"], defaults={"description":dd.get("description","")})
            depts.append(dept)
        ad = hd["admin"]
        au, c = User.objects.get_or_create(email=ad["email"], defaults={"username":ad["username"],"full_name":ad["full_name"],"phone":ad.get("phone",""),"city":ad.get("city",""),"role":"hospital_admin","hospital_admin":True,"is_active":True})
        if c: au.set_password(DEMO_PASSWORD); au.save()
        HA.objects.get_or_create(user=au, hospital=hosp)
        docs = []
        for dd in hd["doctors"]:
            u, c = User.objects.get_or_create(email=dd["email"], defaults={"username":dd["username"],"full_name":dd["full_name"],"phone":dd.get("phone",""),"city":dd.get("city",""),"role":"doctor","is_doctor":True,"is_active":True})
            if c: u.set_password(DEMO_PASSWORD); u.save()
            dob = dd.get("dob"); spd = dd.get("spd")
            DoctorProfile.objects.get_or_create(user=u, defaults={"specialty":dd["specialty"],"bio":dd.get("bio",""),"consultation_fee":Decimal(dd["fee"]),"slot_duration":dd["slot"],"gender":dd.get("gender","male"),"date_of_birth":date.fromisoformat(dob) if dob else None,"start_of_practice_date":date.fromisoformat(spd) if spd else None,"license_number":dd.get("license"),"education":dd.get("edu",[]),"languages":dd.get("langs",["العربية"]),"certificates":dd.get("certs",[]),"accepts_booking":True,"profile_completed":True})
            di = dd.get("dept", 0)
            dept = depts[di] if di < len(depts) else None
            HospitalDoctor.objects.get_or_create(user=u, hospital=hosp, defaults={"department":dept,"price":Decimal(dd.get("hp","200.00")),"is_active":True})
            docs.append(u)
            self.stdout.write(f"    ✓ Dr(H): {u.full_name} — {dd['specialty']}")
        assists = []
        for ad2 in hd["assistants"]:
            u, c = User.objects.get_or_create(email=ad2["email"], defaults={"username":ad2["username"],"full_name":ad2["full_name"],"phone":ad2.get("phone",""),"city":ad2.get("city",""),"role":"assistant","is_assistant":True,"is_active":True})
            if c: u.set_password(DEMO_PASSWORD); u.save()
            ap, _ = AssistantProfile.objects.get_or_create(user=u, defaults={"can_manage_appointments":ad2.get("can_manage",True),"can_upload_documents":ad2.get("can_upload",False),"can_edit_schedule":ad2.get("can_edit",False)})
            HospitalAssistant.objects.get_or_create(assistant=ap, hospital=hosp, defaults={"role":ad2["role"],"is_active":True})
            assists.append((u, ap, hosp))
            self.stdout.write(f"    ✓ Asst(H): {u.full_name} ← {hosp.name}")
        return hosp, docs, assists

    def _build_clinic(self, cd):
        from apps.accounts.models import User
        from apps.doctors.models import DoctorProfile
        from apps.assistants.models import AssistantProfile
        from clinics.models import Clinic, ClinicAssistant
        dd = cd["doctor"]
        u, c = User.objects.get_or_create(email=dd["email"], defaults={"username":dd["username"],"full_name":dd["full_name"],"phone":dd.get("phone",""),"city":dd.get("city",""),"role":"doctor","is_doctor":True,"is_active":True})
        if c: u.set_password(DEMO_PASSWORD); u.save()
        dob = dd.get("dob"); spd = dd.get("spd")
        prof, _ = DoctorProfile.objects.get_or_create(user=u, defaults={"specialty":dd["specialty"],"bio":dd.get("bio",""),"consultation_fee":Decimal(dd["fee"]),"slot_duration":dd["slot"],"gender":dd.get("gender","male"),"date_of_birth":date.fromisoformat(dob) if dob else None,"start_of_practice_date":date.fromisoformat(spd) if spd else None,"license_number":dd.get("license"),"education":dd.get("edu",[]),"languages":dd.get("langs",["العربية"]),"certificates":dd.get("certs",[]),"accepts_booking":True,"profile_completed":True})
        ci = cd["clinic"]
        base = slugify(ci["name"]) or "clinic"; slug = base; n = 1
        while True:
            from clinics.models import Clinic as C2
            if not C2.objects.filter(slug=slug).exists(): break
            slug = f"{base}-{n}"; n += 1
        clinic, _ = Clinic.objects.get_or_create(owner=prof, name=ci["name"], defaults={"slug":slug,"address":ci.get("address",""),"city":ci.get("city",""),"phone":ci.get("phone",""),"consultation_price":Decimal(ci.get("price","200.00")),"latitude":ci.get("lat"),"longitude":ci.get("lng"),"is_active":True})
        self.stdout.write(f"  ✓ عيادة: {clinic.name}")
        ai = cd["assistant"]
        au, c = User.objects.get_or_create(email=ai["email"], defaults={"username":ai["username"],"full_name":ai["full_name"],"phone":ai.get("phone",""),"city":ai.get("city",""),"role":"assistant","is_assistant":True,"is_active":True})
        if c: au.set_password(DEMO_PASSWORD); au.save()
        ap, _ = AssistantProfile.objects.get_or_create(user=au, defaults={"can_manage_appointments":ai.get("can_manage",True),"can_upload_documents":ai.get("can_upload",False),"can_edit_schedule":ai.get("can_edit",False)})
        role = ai["role"] if ai["role"] in {"receptionist","coordinator","supervisor"} else "receptionist"
        ClinicAssistant.objects.get_or_create(assistant=ap, clinic=clinic, defaults={"role":role,"is_active":True})
        self.stdout.write(f"    ✓ Asst(C): {au.full_name} ← {clinic.name}")
        return u, clinic, (au, ap, clinic)

    def _make_patient(self, p):
        from apps.accounts.models import User
        from apps.patients.models import PatientProfile
        u, c = User.objects.get_or_create(email=p["email"], defaults={"username":p["username"],"full_name":p["full_name"],"phone":p.get("phone",""),"city":p.get("city",""),"role":"patient","is_patient":True,"is_active":True})
        if c: u.set_password(DEMO_PASSWORD); u.save()
        PatientProfile.objects.get_or_create(user=u, defaults={"dob":date.fromisoformat(p["dob"]) if p.get("dob") else None,"gender":p.get("gender",""),"notes":f"فصيلة: {p.get('bt','')} | حساسية: {p.get('alg','لا')} | أمراض: {p.get('chr','لا')}"})
        return u

    def _slot_and_appt(self, doc, pat, place, is_clinic, d, t, status):
        from appointments.models import Appointment
        from scheduling.models import GeneratedSlot
        try:
            with transaction.atomic():
                prof = doc.doctor_profile
                sa = timezone.make_aware(dt.combine(d, t))
                ea = sa + timedelta(minutes=prof.slot_duration)
                if is_clinic:
                    slot, _ = GeneratedSlot.objects.get_or_create(doctor=doc, start=sa, defaults={"end":ea,"clinic":place,"hospital":None,"is_booked":False,"is_active":True})
                else:
                    slot, _ = GeneratedSlot.objects.get_or_create(doctor=doc, start=sa, defaults={"end":ea,"hospital":place,"clinic":None,"is_booked":False,"is_active":True})
                if Appointment.objects.filter(slot=slot).exists(): return None
                kw = {"doctor":doc,"patient":pat,"slot":slot,"status":status,"visit_type":random.choice([Appointment.VisitType.IN_PERSON,Appointment.VisitType.ONLINE]),"reason":random.choice(VISIT_REASONS)}
                if is_clinic: kw["clinic"]=place; kw["hospital"]=None
                else: kw["hospital"]=place; kw["clinic"]=None
                appt = Appointment.objects.create(**kw)
                slot.is_booked = True; slot.save(update_fields=["is_booked"])
                return appt
        except Exception:
            return None

    def _rx_record(self, appt, doc, pat, d):
        pd = next((p for p in PATIENTS if p["email"]==pat.email), {})
        BT = {"A+":"A+","A-":"A-","B+":"B+","B-":"B-","AB+":"AB+","AB-":"AB-","O+":"O+","O-":"O-"}
        bt = BT.get(pd.get("bt",""), "UNKNOWN")
        try:
            from apps.patients.models import PatientRecord
            with transaction.atomic():
                PatientRecord.objects.create(patient=pat,doctor=doc,appointment=appt,chief_complaint=appt.reason or "مراجعة عامة",diagnosis=random.choice(DIAGNOSES),treatment_plan="خطة علاجية تشمل الدواء والمتابعة الدورية شهرياً.",notes="المريض يستجيب للعلاج جيداً. يُنصح بالنظام الغذائي والرياضة.",blood_type=bt,allergies=pd.get("alg",""),chronic_diseases=pd.get("chr",""),visit_date=d)
        except Exception: pass
        drugs = random.sample(DRUGS, random.randint(2,4))
        txt = "\n".join(f"- {x['n']} {x['d']} | {x['f']} | {x['dur']} | {x['i']}" for x in drugs)
        try:
            from prescriptions.models import Prescription
            with transaction.atomic():
                Prescription.objects.create(doctor=doc,patient=pat,appointment=appt,diagnosis=random.choice(DIAGNOSES),notes=txt,status=random.choice(["SENT","SENT","DRAFT"]),sent_at=timezone.now() if random.random()>0.3 else None)
        except Exception: pass

    def _make_hosp_appointments(self, doctors, patients, hospitals):
        from appointments.models import Appointment
        from hospital.models import HospitalDoctor
        TIMES = [time(8,0),time(8,30),time(9,0),time(9,30),time(10,0),time(10,30),time(11,0),time(11,30),time(12,0),time(13,0),time(14,0),time(14,30),time(15,0),time(15,30),time(16,0),time(16,30),time(17,0)]
        ST=[Appointment.Status.COMPLETED,Appointment.Status.CONFIRMED,Appointment.Status.PENDING,Appointment.Status.CANCELLED,Appointment.Status.NO_SHOW]
        W=[35,25,20,10,10]
        cnt = 0
        for _ in range(350):
            doc=random.choice(doctors); pat=random.choice(patients)
            hd=HospitalDoctor.objects.filter(user=doc,is_active=True).first()
            if not hd: continue
            off=random.randint(-200,90); d=TODAY+timedelta(days=off); t=random.choice(TIMES)
            st=(random.choice([Appointment.Status.PENDING,Appointment.Status.CONFIRMED]) if off>0 else random.choices(ST,weights=W)[0])
            appt=self._slot_and_appt(doc,pat,hd.hospital,False,d,t,st)
            if appt:
                cnt+=1
                if st==Appointment.Status.COMPLETED: self._rx_record(appt,doc,pat,d)
        self.stdout.write(f"  ✓ مواعيد مستشفيات: {cnt}")

    def _make_clinic_appointments(self, doctors, patients, clinic_map):
        from appointments.models import Appointment
        TIMES=[time(16,0),time(16,30),time(17,0),time(17,30),time(18,0),time(18,30),time(19,0),time(19,30),time(9,0),time(9,30),time(10,0),time(10,30),time(11,0)]
        ST=[Appointment.Status.COMPLETED,Appointment.Status.CONFIRMED,Appointment.Status.PENDING,Appointment.Status.CANCELLED,Appointment.Status.NO_SHOW]
        W=[35,25,20,10,10]
        cnt = 0
        for _ in range(200):
            doc=random.choice(doctors); clinic=clinic_map.get(doc.email)
            if not clinic: continue
            pat=random.choice(patients)
            off=random.randint(-180,60); d=TODAY+timedelta(days=off); t=random.choice(TIMES)
            st=(random.choice([Appointment.Status.PENDING,Appointment.Status.CONFIRMED]) if off>0 else random.choices(ST,weights=W)[0])
            appt=self._slot_and_appt(doc,pat,clinic,True,d,t,st)
            if appt:
                cnt+=1
                if st==Appointment.Status.COMPLETED: self._rx_record(appt,doc,pat,d)
        self.stdout.write(f"  ✓ مواعيد عيادات: {cnt}")

    def _make_schedules(self, doctors, hospitals, clinic_map):
        from scheduling.models import Schedule, GeneratedSlot
        from hospital.models import HospitalDoctor
        WORK=[(0,5),(1,6),(2,0),(3,1),(4,2)]
        sc=sl=0
        for doc in doctors:
            try:
                with transaction.atomic():
                    try: prof=doc.doctor_profile
                    except: continue
                    for hosp in hospitals:
                        if not HospitalDoctor.objects.filter(user=doc,hospital=hosp,is_active=True).exists(): continue
                        for dow,pydow in WORK:
                            sched,cr=Schedule.objects.get_or_create(doctor=doc,hospital=hosp,clinic=None,day_of_week=dow,start_time=time(8,0),defaults={"end_time":time(14,0),"slot_duration":prof.slot_duration,"is_active":True})
                            if cr: sc+=1
                            for off in range(0,56):
                                sd=TODAY+timedelta(days=off)
                                if sd.weekday()!=pydow: continue
                                cur=dt.combine(sd,time(8,0)); end=dt.combine(sd,time(14,0))
                                while cur<end:
                                    esl=cur+timedelta(minutes=prof.slot_duration)
                                    _,cr2=GeneratedSlot.objects.get_or_create(doctor=doc,start=timezone.make_aware(cur),defaults={"end":timezone.make_aware(esl),"hospital":hosp,"clinic":None,"is_booked":False,"is_active":True})
                                    if cr2: sl+=1
                                    cur=esl
                    clinic=clinic_map.get(doc.email)
                    if not clinic: continue
                    for dow,pydow in WORK:
                        sched,cr=Schedule.objects.get_or_create(doctor=doc,clinic=clinic,hospital=None,day_of_week=dow,start_time=time(16,0),defaults={"end_time":time(21,0),"slot_duration":prof.slot_duration,"is_active":True})
                        if cr: sc+=1
                        for off in range(0,56):
                            sd=TODAY+timedelta(days=off)
                            if sd.weekday()!=pydow: continue
                            cur=dt.combine(sd,time(16,0)); end=dt.combine(sd,time(21,0))
                            while cur<end:
                                esl=cur+timedelta(minutes=prof.slot_duration)
                                _,cr2=GeneratedSlot.objects.get_or_create(doctor=doc,start=timezone.make_aware(cur),defaults={"end":timezone.make_aware(esl),"clinic":clinic,"hospital":None,"is_booked":False,"is_active":True})
                                if cr2: sl+=1
                                cur=esl
            except Exception: pass
        self.stdout.write(f"  ✓ Schedules: {sc} | Slots: {sl}")

    def _make_hosp_shifts(self, assists, hospitals):
        WORK={5,6,0,1,2}; cnt=0
        for au,ap,hosp in assists:
            try:
                from apps.assistants.models import AssistantShift
                for off in range(0,21):
                    d=TODAY+timedelta(days=off)
                    if d.weekday() not in WORK: continue
                    AssistantShift.objects.get_or_create(assistant=ap,date=d,defaults={"place_type":"hospital","place_name":hosp.name,"doctor_name":"","start_time":time(8,0),"end_time":time(14,0),"status":"confirmed"})
                    cnt+=1
            except Exception: pass
        self.stdout.write(f"  ✓ Hospital Shifts: {cnt}")

    def _make_clinic_shifts(self, assists):
        WORK={5,6,0,1,2}; cnt=0
        for au,ap,clinic in assists:
            doc_name=""
            try: doc_name=clinic.owner.user.full_name
            except: pass
            try:
                from apps.assistants.models import AssistantShift
                for off in range(0,21):
                    d=TODAY+timedelta(days=off)
                    if d.weekday() not in WORK: continue
                    AssistantShift.objects.get_or_create(assistant=ap,date=d,defaults={"place_type":"clinic","place_name":clinic.name,"doctor_name":doc_name,"start_time":time(16,0),"end_time":time(21,0),"status":"confirmed"})
                    cnt+=1
            except Exception: pass
        self.stdout.write(f"  ✓ Clinic Shifts: {cnt}")

    def _make_reports(self, patients, doctors):
        TMPLS=[{"type":"APPOINTMENT","name":"ملخص المواعيد الطبية","icon":"📅","size":"1.2 MB"},{"type":"PRESCRIPTION","name":"قائمة الوصفات الطبية","icon":"💊","size":"0.8 MB"},{"type":"MEDICAL_HISTORY","name":"السجل الطبي الكامل","icon":"🏥","size":"2.4 MB"},{"type":"BILLING","name":"كشف الفواتير","icon":"💳","size":"0.6 MB"},{"type":"MEDICAL_HISTORY","name":"تقرير الفحوصات المخبرية","icon":"🔬","size":"3.1 MB"}]
        dnames=[d.full_name for d in doctors[:8]]
        cnt=0
        for pat in patients:
            for t in random.sample(TMPLS,random.randint(2,4)):
                try:
                    from reports.models import Report
                    Report.objects.create(user=pat,type=t["type"],name=t["name"],doctor_name=random.choice(dnames),icon=t["icon"],size=t["size"]); cnt+=1
                except: pass
        self.stdout.write(f"  ✓ تقارير: {cnt}")

    def _make_notifications(self, doctors, patients, all_assists):
        from notifications.models import Notification
        PN=[{"title":"موعدك القادم غداً","body":"تذكير: لديك موعد غداً الساعة 10:00 صباحاً. احرص على الحضور في الوقت المحدد.","type":"APPOINTMENT_REMINDER"},{"title":"تم تأكيد موعدك","body":"تم تأكيد موعدك مع الطبيب. يرجى الحضور قبل 10 دقائق لإتمام الإجراءات.","type":"APPOINTMENT_CONFIRMED"},{"title":"وصفة طبية جديدة","body":"أرسل إليك الطبيب وصفة طبية جديدة. يمكنك الاطلاع عليها من قسم الوصفات.","type":"SYSTEM"},{"title":"تم إلغاء الموعد","body":"تم إلغاء الموعد المحدد. يمكنك حجز موعد جديد من التطبيق.","type":"APPOINTMENT_CANCELLED"},{"title":"نتائج الفحص جاهزة","body":"نتائج فحصك الطبي متاحة الآن في ملفك الصحي. يمكنك الاطلاع عليها من ملفك.","type":"SYSTEM"},{"title":"تذكير: موعدك بعد ساعتين","body":"لا تنس موعدك اليوم. احرص على الحضور في الوقت المحدد ومعك كل الأوراق اللازمة.","type":"APPOINTMENT_REMINDER"},{"title":"إعادة جدولة موعدك","body":"تم إعادة جدولة موعدك إلى يوم الأحد القادم. يرجى التأكيد.","type":"RESCHEDULE_REQUESTED"}]
        DN=[{"title":"حجز موعد جديد","body":"مريض جديد حجز موعداً بتاريخ غد الساعة 11:30. يرجى مراجعة الجدول.","type":"NEW_APPOINTMENT"},{"title":"طلب إعادة جدولة","body":"مريض يطلب تغيير موعده. يرجى الموافقة أو الرفض من لوحة التحكم.","type":"RESCHEDULE_REQUESTED"},{"title":"مراجعة جديدة ⭐","body":"مريض أضاف مراجعة 5 نجوم لبروفايلك. اطلع عليها من قسم المراجعات.","type":"SYSTEM"},{"title":"موعد قادم خلال ساعة","body":"لديك موعد مع مريض بعد ساعة. يرجى التحضير ومراجعة ملف المريض.","type":"APPOINTMENT_REMINDER"},{"title":"وصفة انتظار الإرسال","body":"لديك وصفة طبية في المسودة. يرجى إرسالها للمريض.","type":"SYSTEM"}]
        AN=[{"title":"موعد يحتاج تأكيداً","body":"يوجد موعد جديد بانتظار التأكيد في جدول اليوم. يرجى المراجعة.","type":"NEW_APPOINTMENT"},{"title":"مريض جديد في القائمة","body":"تم إضافة مريض جديد إلى قائمة اليوم. راجع بياناته لإعداد الملف.","type":"SYSTEM"},{"title":"تعديل في الجدول","body":"تم تعديل جدول الدكتور ليوم الغد. يرجى إبلاغ المرضى المتأثرين.","type":"SYSTEM"},{"title":"تذكير: جلسة أونلاين","body":"لديك جلسة أونلاين مع الدكتور خلال 30 دقيقة. تحقق من الرابط.","type":"APPOINTMENT_REMINDER"},{"title":"مراجعة انتظار الرد","body":"مريض أرسل رسالة تحتاج رداً. راجع صندوق الرسائل.","type":"SYSTEM"}]
        cnt=0
        for pat in patients:
            for nd in random.sample(PN,random.randint(3,5)):
                try: Notification.objects.create(user=pat,title=nd["title"],body=nd["body"],type=nd["type"],is_read=random.choice([True,False])); cnt+=1
                except: pass
        for doc in doctors:
            for nd in random.sample(DN,random.randint(2,4)):
                try: Notification.objects.create(user=doc,title=nd["title"],body=nd["body"],type=nd["type"],is_read=random.choice([True,False])); cnt+=1
                except: pass
        for au,ap,_ in all_assists:
            for nd in AN:
                try: Notification.objects.create(user=au,title=nd["title"],body=nd["body"],type=nd["type"],is_read=False); cnt+=1
                except: pass
        self.stdout.write(f"  ✓ إشعارات: {cnt}")

    def _make_chat(self, doctors, patients, all_assists):
        from chat.models import Conversation, Message
        cv=mc=0
        for i,(pat,doc) in enumerate(zip(patients[:8],doctors[:8])):
            msgs=CHAT_PD[i%len(CHAT_PD)]
            try: conv,cr=Conversation.get_or_create_for_pair(pat,doc)
            except: continue
            if not cr and conv.messages.exists(): continue
            cv+=1; base=timezone.now()-timedelta(days=random.randint(1,20))
            last=""
            for j,(role,txt) in enumerate(msgs):
                s=pat if role=="p" else doc; ts=base+timedelta(minutes=j*random.randint(3,40))
                Message.objects.create(conversation=conv,sender=s,content=txt,message_type=Message.MessageType.TEXT,is_read=ts<timezone.now()-timedelta(hours=3),created_at=ts)
                last=txt; mc+=1
            conv.last_message_at=base+timedelta(minutes=len(msgs)*20); conv.last_message_preview=last[:100]
            conv.save(update_fields=["last_message_at","last_message_preview"])
        for i,(au,ap,place) in enumerate(all_assists[:8]):
            doc=doctors[i%len(doctors)]; msgs=CHAT_AD[i%len(CHAT_AD)]
            try: conv,cr=Conversation.get_or_create_for_pair(au,doc)
            except: continue
            if not cr and conv.messages.exists(): continue
            cv+=1; base=timezone.now()-timedelta(days=random.randint(1,7))
            last=""
            for j,(role,txt) in enumerate(msgs):
                s=au if role=="a" else doc; ts=base+timedelta(minutes=j*random.randint(2,20))
                Message.objects.create(conversation=conv,sender=s,content=txt,message_type=Message.MessageType.TEXT,is_read=True,created_at=ts)
                last=txt; mc+=1
            conv.last_message_at=base+timedelta(minutes=len(msgs)*12); conv.last_message_preview=last[:100]
            conv.save(update_fields=["last_message_at","last_message_preview"])
        simple=[("p","السلام عليكم دكتور."),("d","وعليكم السلام، كيف حالك؟"),("p","الحمد لله. عندي سؤال عن الدواء."),("d","تفضل."),("p","الدواء آخده مع الأكل؟"),("d","أيوه، مع الأكل أحسن على المعدة."),("p","شكراً يا دكتور!"),("d","العفو. لو في حاجة أنا هنا.")]
        for pat,doc in zip(patients[8:20],doctors[3:]):
            try: conv,cr=Conversation.get_or_create_for_pair(pat,doc)
            except: continue
            if not cr and conv.messages.exists(): continue
            cv+=1; base=timezone.now()-timedelta(days=random.randint(2,30))
            last=""
            for j,(role,txt) in enumerate(simple):
                s=pat if role=="p" else doc; ts=base+timedelta(minutes=j*random.randint(5,60))
                Message.objects.create(conversation=conv,sender=s,content=txt,message_type=Message.MessageType.TEXT,is_read=random.choice([True,True,False]),created_at=ts)
                last=txt; mc+=1
            conv.last_message_at=base+timedelta(hours=3); conv.last_message_preview=last[:100]
            conv.save(update_fields=["last_message_at","last_message_preview"])
        self.stdout.write(f"  ✓ Chat — محادثات: {cv} | رسائل: {mc}")

    def _make_reviews(self, doctors, patients, hospitals):
        from appointments.models import Appointment
        from reviews.models import Review
        done=list(Appointment.objects.filter(status=Appointment.Status.COMPLETED).select_related("doctor","patient","hospital","clinic"))
        cnt=0
        for appt in done:
            if random.random()>0.65: continue
            if Review.objects.filter(appointment=appt).exists(): continue
            rd=random.choice(REVIEWS)
            try:
                Review.objects.create(appointment=appt,patient=appt.patient,doctor=appt.doctor,hospital=appt.hospital,rating=rd["r"],comment=rd["c"],is_anonymous=random.choice([False,False,True]))
                cnt+=1
            except: pass
        for h in hospitals:
            revs=Review.objects.filter(hospital=h)
            if revs.exists():
                h.rating=round(sum(r.rating for r in revs)/revs.count(),1); h.save(update_fields=["rating"])
        self.stdout.write(f"  ✓ Reviews: {cnt}")

    def _make_video_sessions(self):
        try:
            from video.models import VideoSession
            from appointments.models import Appointment as A
            cnt=0
            for appt in A.objects.filter(visit_type=A.VisitType.ONLINE,status__in=[A.Status.CONFIRMED,A.Status.COMPLETED]).order_by("-id")[:60]:
                if VideoSession.objects.filter(appointment=appt).exists(): continue
                done=appt.status==A.Status.COMPLETED
                VideoSession.objects.create(appointment=appt,provider=VideoSession.Provider.JITSI,status=VideoSession.Status.ENDED if done else VideoSession.Status.PENDING,room_name=f"curabook-{appt.id}",room_url=f"https://meet.jit.si/curabook-{appt.id}")
                cnt+=1
            self.stdout.write(f"  ✓ VideoSessions: {cnt}")
        except Exception as e:
            self.stdout.write(f"  ⚠ VideoSession: {e}")

    def _summary(self, hospitals, clinic_map, all_assists):
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  ✅ CuraBook v4 — seed اكتمل بنجاح")
        self.stdout.write("=" * 60)
        self.stdout.write(f"\n  🏥 {len(HOSPITALS)} مستشفيات:")
        for h in HOSPITALS:
            n_doc=len(h["doctors"]); n_ass=len(h["assistants"])
            self.stdout.write(f"     {h['info']['name']} | {n_doc} دكتور | {n_ass} مساعد")
            self.stdout.write(f"       Admin: {h['admin']['email']}")
        self.stdout.write(f"\n  🏥 {len(CLINIC_DOCTORS)} عيادات مستقلة:")
        for cd in CLINIC_DOCTORS:
            self.stdout.write(f"     {cd['clinic']['name']}")
            self.stdout.write(f"       Dr: {cd['doctor']['email']} | Asst: {cd['assistant']['email']}")
        self.stdout.write(f"\n  👤 20 مريض: pat1@curabook.demo … pat20@curabook.demo")
        self.stdout.write(f"  🛡️  Admin: admin@curabook.demo | Admin@1234")
        self.stdout.write(f"  🔑 الباقي: Demo@1234")
        self.stdout.write(f"\n  📊 ~350 موعد مستشفيات | ~200 موعد عيادات")
        self.stdout.write(f"     Schedules+Slots (56 يوم) | Shifts (21 يوم)")
        self.stdout.write(f"     Chat | Notifications | Reviews | VideoSessions | Reports")
        self.stdout.write(f"     ⚡ فصل تام: كل مساعد مرتبط بمكان واحد فقط")
        self.stdout.write("=" * 60 + "\n")
