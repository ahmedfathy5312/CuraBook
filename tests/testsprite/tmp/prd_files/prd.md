# وثيقة متطلبات المنتج (PRD)
# CuraBook — منصة الرعاية الصحية الرقمية

> **الإصدار:** v5.0 (Build v35)  
> **تاريخ التوثيق:** يونيو 2026  
> **الحالة:** Production-Ready  
> **السوق المستهدف:** مصر والسوق العربي

---

## 📋 فهرس المحتويات

1. [نظرة عامة على المنتج](#1-نظرة-عامة-على-المنتج)
2. [الأهداف التجارية](#2-الأهداف-التجارية)
3. [المستخدمون والأدوار](#3-المستخدمون-والأدوار)
4. [المتطلبات الوظيفية](#4-المتطلبات-الوظيفية)
5. [المتطلبات غير الوظيفية](#5-المتطلبات-غير-الوظيفية)
6. [الهندسة المعمارية للنظام](#6-الهندسة-المعمارية-للنظام)
7. [نماذج البيانات الأساسية](#7-نماذج-البيانات-الأساسية)
8. [واجهة برمجة التطبيقات (API)](#8-واجهة-برمجة-التطبيقات-api)
9. [نظام الفوترة والاشتراكات](#9-نظام-الفوترة-والاشتراكات)
10. [الامتثال والخصوصية](#10-الامتثال-والخصوصية)
11. [الأمان](#11-الأمان)
12. [نظام التصميم والواجهة](#12-نظام-التصميم-والواجهة)
13. [الاختبارات وضمان الجودة](#13-الاختبارات-وضمان-الجودة)
14. [النشر والبنية التحتية](#14-النشر-والبنية-التحتية)
15. [مؤشرات الأداء](#15-مؤشرات-الأداء)
16. [الميزات المستقبلية](#16-الميزات-المستقبلية)

---

## 1. نظرة عامة على المنتج

### 1.1 ما هو CuraBook؟

**CuraBook** منصة SaaS طبية متكاملة تربط المرضى بالأطباء والمستشفيات في مصر والسوق العربي. المنصة تتيح حجز المواعيد الطبية، إدارة الجداول، الاستشارات عبر الفيديو، الوصفات الرقمية، والتحليلات الطبية — كل ذلك بدعم كامل للغة العربية وواجهة RTL.

### 1.2 البيانات التقنية السريعة

| البند | التفاصيل |
|-------|----------|
| **Backend** | Django 5.1.4 + Django REST Framework 3.15.2 |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **قاعدة البيانات** | PostgreSQL |
| **Cache / Queue** | Redis + Celery |
| **Real-time** | Django Channels (WebSocket) |
| **المصادقة** | JWT RS256 + Argon2 |
| **اللغات** | عربي + إنجليزي (RTL/LTR) |
| **البيئة** | Docker + Nginx |
| **المراقبة** | Prometheus + Grafana + ELK Stack |

### 1.3 القيمة المقترحة

- **للمرضى:** حجز مواعيد سهل وسريع، متابعة الوصفات الطبية، استشارات فيديو من المنزل.
- **للأطباء:** إدارة مدمجة للجدول والمواعيد والمرضى، تحليلات الأداء، وصفات رقمية.
- **للمستشفيات:** لوحة تحكم شاملة لإدارة الأطباء والمساعدين والمواعيد مع تحليلات مفصلة.
- **للمنصة:** نموذج SaaS متعدد المستأجرين (Multi-tenant) مع نظام اشتراكات متدرج.

---

## 2. الأهداف التجارية

### 2.1 الأهداف الأساسية

| الهدف | المؤشر | الهدف المستهدف |
|-------|--------|----------------|
| اكتساب المستخدمين | عدد الأطباء المسجلين | 1,000 طبيب في السنة الأولى |
| الاحتفاظ بالمستخدمين | معدل الاشتراك المتجدد | > 85% |
| الإيراد | متوسط الإيراد لكل مستأجر | 500–5,000 جنيه / شهر |
| الجودة | معدل الخطأ | < 0.5% |
| الأداء | LCP (Largest Contentful Paint) | < 1.6 ثانية |

### 2.2 نموذج الإيراد

نظام اشتراكات متدرج بالجنيه المصري (EGP) مع دعم Paymob كبوابة دفع رئيسية:

```
Free Trial  → 14 يوم مجاناً
Starter     → عيادة واحدة، ميزات كاملة
Pro         → 3 عيادات + تحليلات متقدمة  
Enterprise  → غير محدود + White-label
```

---

## 3. المستخدمون والأدوار

### 3.1 الأدوار الخمسة في النظام

```
┌─────────────────────────────────────────────────────────┐
│                    CuraBook Platform                    │
├─────────┬────────────┬───────────┬──────────┬──────────┤
│ Patient │   Doctor   │ Assistant │ Hospital │  Admin   │
│ المريض  │   الطبيب   │  المساعد  │ المشفى   │  النظام  │
└─────────┴────────────┴───────────┴──────────┴──────────┘
```

### 3.2 تفصيل كل دور

#### 🏥 المريض (Patient)
- **المسار الرئيسي:** `/dashboard`
- **الصلاحيات الأساسية:**
  - البحث عن الأطباء والمستشفيات
  - حجز وإلغاء وإعادة جدولة المواعيد
  - عرض الوصفات الطبية
  - مراسلة الطبيب عبر الدردشة
  - الانضمام لجلسات الفيديو
  - كتابة تقييمات بعد اكتمال الموعد
  - تنزيل بيانات الملف الشخصي (GDPR Art. 20)

#### 👨‍⚕️ الطبيب (Doctor)
- **المسار الرئيسي:** `/doctor-dashboard`
- **الصلاحيات الأساسية:**
  - إدارة الجدول الأسبوعي وتوليد الفتحات الزمنية
  - قبول / رفض / إكمال المواعيد
  - كتابة وإرسال الوصفات الرقمية
  - الاطلاع على تحليلات الأداء
  - الدردشة مع المرضى
  - إدارة الملف الشخصي والمؤهلات
  - إدارة عيادات متعددة

#### 🗂️ المساعد (Assistant)
- **المسار الرئيسي:** `/assistant-dashboard`
- **الصلاحيات الأساسية:**
  - إدارة مواعيد الأطباء المرتبطين به
  - تأكيد ورفض المواعيد بدلاً عن الطبيب
  - الاطلاع على جداول الأطباء
  - إدارة عدة أماكن عمل

#### 🏨 مدير المستشفى (Hospital Admin)
- **المسار الرئيسي:** `/hospital-dashboard`
- **الصلاحيات الأساسية:**
  - تسجيل وإدارة الأطباء في المستشفى
  - إضافة وإدارة المساعدين
  - الاطلاع على تحليلات المستشفى الشاملة
  - تحميل تقارير المواعيد
  - إدارة جداول الأطباء

#### ⚙️ مدير النظام (System Admin)
- **المسار الرئيسي:** `/admin-dashboard`
- **الصلاحيات الأساسية:**
  - إدارة كامل المنصة
  - مراجعة سجلات Audit
  - ضبط إعدادات المنصة العامة
  - إدارة الاشتراكات والفواتير
  - مراقبة الأداء عبر Grafana

---

## 4. المتطلبات الوظيفية

### 4.1 وحدة المصادقة (Authentication)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-AUTH-01 | تسجيل مستخدم جديد بالبريد + كلمة المرور | P0 |
| F-AUTH-02 | تفعيل الحساب عبر رابط البريد الإلكتروني | P0 |
| F-AUTH-03 | تسجيل دخول بـ JWT RS256 (access + refresh tokens) | P0 |
| F-AUTH-04 | تشفير كلمات المرور بـ Argon2 | P0 |
| F-AUTH-05 | تجديد الـ token تلقائياً | P0 |
| F-AUTH-06 | إعادة تعيين كلمة المرور عبر البريد | P1 |
| F-AUTH-07 | المصادقة الثنائية (MFA) — اختيارية | P2 |
| F-AUTH-08 | حظر IP عند المحاولات الفاشلة المتكررة | P1 |
| F-AUTH-09 | دعم الاسم باللغتين (العربية + الإنجليزية) | P1 |
| F-AUTH-10 | Soft Delete للحسابات (لا حذف نهائي) | P0 |

### 4.2 وحدة الحجز والمواعيد (Appointments)

#### حالات الموعد (State Machine)

```
PENDING ──► CONFIRMED ──► COMPLETED
   │              │
   ▼              ▼
REJECTED      CANCELLED
   
PENDING ──► RESCHEDULE_REQUESTED ──► CONFIRMED
                                  └──► REJECTED

COMPLETED ──► NO_SHOW (بعد تجاوز الوقت)
```

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-APT-01 | بحث الأطباء المتاحين حسب التخصص / المدينة / الاسم | P0 |
| F-APT-02 | عرض الفتحات الزمنية المتاحة لطبيب بعينه | P0 |
| F-APT-03 | حجز موعد في فتحة زمنية (كلينك أو مستشفى) | P0 |
| F-APT-04 | الموعد يدعم نوعين: حضوري (In-Person) أو عبر الإنترنت | P0 |
| F-APT-05 | تأكيد الموعد من الطبيب أو المساعد | P0 |
| F-APT-06 | رفض الموعد مع سبب | P0 |
| F-APT-07 | إلغاء الموعد من المريض أو الطبيب | P0 |
| F-APT-08 | طلب إعادة الجدولة من المريض | P1 |
| F-APT-09 | الموافقة أو الرفض على طلب إعادة الجدولة | P1 |
| F-APT-10 | الموعد يصبح "No Show" تلقائياً إذا لم يحضر المريض | P1 |
| F-APT-11 | Idempotency للتذكيرات (منع الإرسال المتكرر) | P1 |
| F-APT-12 | انتهاء صلاحية المواعيد المعلقة تلقائياً (expires_at) | P1 |
| F-APT-13 | مذكرات جلسة يكتبها الطبيب بعد الاكتمال | P2 |

### 4.3 وحدة الجدولة (Scheduling)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-SCH-01 | الطبيب يحدد جدوله الأسبوعي (يوم + وقت بداية + نهاية) | P0 |
| F-SCH-02 | توليد فتحات زمنية تلقائي بناءً على مدة الموعد | P0 |
| F-SCH-03 | الجدول مرتبط بعيادة أو مستشفى (ليس الاثنين معاً) | P0 |
| F-SCH-04 | الفتحات الزمنية لا يمكن حجزها مرتين (OneToOne) | P0 |
| F-SCH-05 | دعم الأيام العربية (السبت إلى الجمعة) | P1 |
| F-SCH-06 | Soft Delete للجداول المحذوفة | P1 |

### 4.4 وحدة الإشعارات (Notifications)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-NOT-01 | إشعارات فورية عبر WebSocket (Django Channels) | P0 |
| F-NOT-02 | إشعارات بريد إلكتروني للمواعيد | P0 |
| F-NOT-03 | إشعارات SMS عبر Vodafone Egypt / SMS Misr | P1 |
| F-NOT-04 | إشعار عند حجز موعد جديد | P0 |
| F-NOT-05 | إشعار عند تأكيد / رفض الموعد | P0 |
| F-NOT-06 | إشعار تذكير قبل الموعد | P1 |
| F-NOT-07 | إشعارات إعادة الجدولة | P1 |
| F-NOT-08 | تفضيلات الإشعارات قابلة للتخصيص | P1 |
| F-NOT-09 | جرس الإشعارات في الـ Header مع عداد القراءة | P0 |
| F-NOT-10 | Heartbeat للـ WebSocket لضمان الاتصال المستمر | P1 |

### 4.5 وحدة الوصفات الطبية (Prescriptions)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-PRX-01 | إنشاء وصفة طبية بعد اكتمال الموعد | P0 |
| F-PRX-02 | الوصفة تحتوي: تشخيص + ملاحظات + أدوية | P0 |
| F-PRX-03 | إرسال الوصفة للمريض (حالة: Draft → Sent) | P0 |
| F-PRX-04 | دعم رفق ملف PDF بالوصفة | P1 |
| F-PRX-05 | Soft Delete (لا حذف نهائي — متطلب قانوني) | P0 |
| F-PRX-06 | المريض يرى وصفاته في ملفه الشخصي | P0 |

### 4.6 وحدة الدردشة (Chat)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-CHT-01 | محادثة مباشرة بين طبيب ومريض (1-to-1) | P1 |
| F-CHT-02 | رسائل فورية عبر WebSocket | P1 |
| F-CHT-03 | دعم النصوص والصور والملفات | P1 |
| F-CHT-04 | محادثة واحدة فقط لكل زوج من المستخدمين | P1 |
| F-CHT-05 | تمييز الرسائل المقروءة / غير المقروءة | P1 |
| F-CHT-06 | آخر رسالة مؤرشفة للعرض السريع في قائمة المحادثات | P1 |

### 4.7 وحدة الفيديو (Video Consultations)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-VID-01 | جلسة فيديو مرتبطة بموعد "عبر الإنترنت" | P1 |
| F-VID-02 | دعم مزودين: Jitsi Meet (مجاني) و Daily.co | P1 |
| F-VID-03 | رمز الغرفة (Token) يُولَّد عند الطلب (15 دقيقة صلاحية) | P1 |
| F-VID-04 | حالات الجلسة: Pending → Active → Ended | P1 |
| F-VID-05 | تسجيل مدة الجلسة | P2 |

### 4.8 وحدة التحليلات (Analytics)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-ANL-01 | إحصائيات المواعيد للطبيب (إجمالي / مكتمل / ملغي) | P1 |
| F-ANL-02 | رسوم بيانية لأداء المواعيد بمرور الوقت | P1 |
| F-ANL-03 | تحليلات المستشفى (عدد الأطباء، المواعيد، التقييمات) | P1 |
| F-ANL-04 | تحميل تقارير Analytics بصيغة PDF / Excel | P1 |
| F-ANL-05 | لوحة تحكم الإدارة بمؤشرات عامة للمنصة | P1 |
| F-ANL-06 | إعدادات المنصة العامة (Singleton PlatformSettings) | P2 |

### 4.9 وحدة التقييمات (Reviews)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-REV-01 | المريض يكتب تقييم بعد اكتمال الموعد فقط | P1 |
| F-REV-02 | نظام النجوم 1-5 مع تعليق نصي اختياري | P1 |
| F-REV-03 | خيار إخفاء هوية المريض في التقييم | P1 |
| F-REV-04 | تقييم واحد لكل موعد (OneToOne) | P1 |
| F-REV-05 | متوسط التقييم يُحدَّث تلقائياً على ملف الطبيب | P1 |

### 4.10 وحدة البحث (Search)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-SRC-01 | البحث عن الأطباء بالاسم / التخصص / المدينة | P0 |
| F-SRC-02 | البحث عن المستشفيات | P0 |
| F-SRC-03 | فلترة نتائج البحث | P0 |
| F-SRC-04 | تسجيل البحثات في SearchLog للتحليل | P2 |

### 4.11 وحدة المستشفى (Hospital Management)

| المتطلب | التفاصيل | الأولوية |
|---------|----------|---------|
| F-HSP-01 | إنشاء ملف المستشفى مع البيانات الأساسية | P0 |
| F-HSP-02 | تسجيل أطباء جدد في المستشفى | P0 |
| F-HSP-03 | إضافة مساعدين للمستشفى | P0 |
| F-HSP-04 | توليد الفتحات الزمنية لأطباء المستشفى | P0 |
| F-HSP-05 | عرض كارت بيانات الطبيب (DoctorProfileModal) | P1 |
| F-HSP-06 | إحصائيات المستشفى في الـ Dashboard | P1 |
| F-HSP-07 | تحقق المستشفى من قِبل مدير النظام (is_verified) | P1 |

---

## 5. المتطلبات غير الوظيفية

### 5.1 الأداء

| المؤشر | الهدف | الحالة الحالية |
|--------|-------|---------------|
| Initial Bundle Size | < 50 KB | **45 KB** ✅ |
| LCP (Largest Contentful Paint) | < 2 ثانية | **~1.6 ثانية** ✅ |
| معدل الخطأ | < 0.5% | **< 0.5%** ✅ |
| وقت استجابة API | < 300ms (P95) | مُقاس عبر k6 |
| WebSocket Latency | < 100ms | مُقاس عبر k6 |

### 5.2 التوافر (Availability)

- **SLA:** 99.5% uptime
- **Health Check:** `GET /api/v1/health/` يعيد `{"status": "healthy"}`
- **Backup تلقائي:** يومي مع رفع اختياري لـ S3
- **استراتيجية Rollback:** Docker image rollback + DB restore من backup

### 5.3 قابلية التوسع (Scalability)

- **Multi-tenant:** نموذج "Shared DB + Row-Level Security" عبر TenantQuerySet
- **Subdomain per tenant:** `clinic-name.curabook.com` لكل طبيب / مستشفى
- **Celery Workers:** قابلة للتوسع أفقياً
- **Redis Clustering:** مدعوم في الإنتاج
- **Lazy Loading:** الصفحات والـ images تُحمَّل عند الحاجة

### 5.4 إمكانية الوصول (Accessibility)

- **معيار WCAG 2.1 AA** — مُختبَر بـ axe-core
- دعم RTL كامل لجميع المكونات عبر `[dir='rtl']` CSS selector
- دعم قارئات الشاشة
- تباين ألوان متوافق مع معايير إمكانية الوصول

### 5.5 دعم اللغات والمناطق

- **اللغتان:** عربي (الافتراضي) + إنجليزي
- **الاتجاه:** RTL للعربية + LTR للإنجليزية (تلقائي)
- **الأرقام:** مُنسَّقة بـ `formatNumberLocale()` حسب اللغة
- **التواريخ:** مُنسَّقة بـ `formatDateLocale()` حسب اللغة
- **الخطوط:** Cairo للعربية + Plus Jakarta Sans للإنجليزية
- **المفاتيح:** 164+ مفتاح ترجمة مع صفر مفاتيح ناقصة
- **المنطقة الزمنية الافتراضية:** `Africa/Cairo`

---

## 6. الهندسة المعمارية للنظام

### 6.1 الرسم المعماري العام

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│           React 18 + Vite (Port 5173 / Dev)                 │
│         Cairo Font (AR) + Plus Jakarta Sans (EN)            │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                       │
│            SSL Termination + Rate Limiting                  │
└──────────┬──────────────────────────────┬───────────────────┘
           │ HTTP                          │ WebSocket (/ws)
           ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│   Django / Daphne   │    │     Django Channels (ASGI)      │
│  REST API (WSGI)    │    │    WebSocket Consumers          │
│  /api/v1/           │    │    /ws/notifications/           │
└─────────┬───────────┘    └──────────────┬──────────────────┘
          │                               │
          ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  PostgreSQL (primary)  │  Redis (cache + channels + queue)  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Background Jobs                           │
│   Celery Workers + Celery Beat (periodic tasks)            │
│   Tasks: Email, SMS, Reminders, Backup, Audit Purge        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│               Monitoring & Observability                     │
│   Prometheus (metrics) → Grafana (dashboards)              │
│   Logstash → Elasticsearch → Kibana (ELK)                  │
│   Sentry (error tracking)                                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 هيكل Backend (Django Apps)

```
backend/
├── apps/
│   ├── accounts/         # User model + Authentication
│   ├── doctors/          # DoctorProfile + doctor-specific logic
│   ├── patients/         # PatientProfile
│   ├── assistants/       # AssistantProfile + workplace management
│   └── departments/      # Medical specialties
├── appointments/         # Booking state machine + workflow
├── scheduling/           # Schedule + GeneratedSlot
├── notifications/        # WebSocket consumers + push
├── prescriptions/        # Digital Rx
├── chat/                 # Real-time messaging
├── video/                # Video consultation sessions
├── billing/              # Plans + Subscriptions + Invoices
├── analytics/            # Doctor + Hospital analytics
├── hospital/             # Hospital management
├── clinics/              # Private clinic management
├── search/               # Doctor/Hospital search + SearchLog
├── reviews/              # Patient reviews + ratings
├── tenants/              # Multi-tenancy (slug + subdomain)
├── audit/                # Audit trail (AuditLog)
├── dashboard/            # Admin dashboard metrics
├── core/                 # Shared: permissions, caching, workflows, exceptions
└── common/               # Base models: TimestampedModel, SoftDeleteModel, PublicIdMixin
```

### 6.3 هيكل Frontend (React 18 Features)

```
frontend/src/
├── features/
│   ├── auth/             # Login, Register, Password Reset
│   ├── patient/          # Patient Dashboard, Profile
│   ├── doctor-dashboard/ # Doctor pages (12 page)
│   ├── hospital/         # Hospital Admin pages
│   ├── assistant/        # Assistant Dashboard
│   ├── admin/            # Platform Admin
│   ├── appointments/     # Appointment management
│   ├── prescriptions/    # Prescription views
│   ├── chat/             # Real-time chat
│   ├── video/            # Video consultation
│   ├── scheduling/       # Schedule management
│   ├── notifications/    # Notification center
│   ├── analytics/        # Charts + reports
│   ├── billing/          # Subscription management
│   ├── search/           # Search interface
│   └── public/           # Landing page, About
├── components/
│   ├── ui/               # 20+ shared UI components
│   ├── shared/           # DashboardCharts, ReportsSection
│   ├── doctor/           # Doctor-specific cards/modals
│   └── hospital/         # Hospital-specific components
├── layouts/              # Layout per role (Doctor, Patient, Hospital, Admin, Assistant)
├── hooks/                # Custom React hooks
├── config/               # roles.js, routes.js, env.js
├── i18n/                 # useTranslation + ar.js + en.js + rtl.css
└── theme/                # Design tokens
```

### 6.4 Workflow المواعيد (Core Business Logic)

تُدار عبر `core/workflows/`:

- **`booking_workflow.py`:** التحقق من توافر الفتحة، إنشاء الموعد، إرسال الإشعار
- **`appointment_workflow.py`:** إدارة انتقالات الحالة (State Machine)
- **`state_machine.py`:** التحقق من صحة الانتقال قبل التطبيق

---

## 7. نماذج البيانات الأساسية

### 7.1 User Model

```python
User:
  - username, email, full_name, full_name_en, phone, city
  - role: [doctor | patient | assistant | hospital_admin | admin]
  - is_patient, is_doctor, is_assistant, hospital_admin, is_platform_admin  # fast flags
  - is_active (False حتى تفعيل البريد)
  - is_deleted (Soft Delete)
```

### 7.2 Appointment Model

```python
Appointment:
  - doctor (FK → User), patient (FK → User)
  - hospital (nullable FK) OR clinic (nullable FK)
  - slot (OneToOne → GeneratedSlot)
  - status: PENDING | CONFIRMED | REJECTED | CANCELLED | COMPLETED | NO_SHOW | RESCHEDULE_REQUESTED
  - visit_type: IN_PERSON | ONLINE
  - reason, rejection_reason, reschedule_reason
  - session_notes (يكتبها الطبيب بعد الاكتمال)
  - expires_at (انتهاء صلاحية المعلق)
```

### 7.3 Schedule + Slot

```python
Schedule:
  - doctor, clinic OR hospital
  - day_of_week (0=Saturday .. 6=Friday)
  - start_time, end_time
  - slot_duration (دقائق)
  - is_active

GeneratedSlot:
  - schedule (FK), date, start_time, end_time
  - is_available
```

### 7.4 Billing Plans

```python
Plan:
  - tier: free_trial | starter | pro | enterprise
  - price_monthly, price_yearly (EGP)
  - max_clinics, max_doctors, max_appointments_per_month
  - has_analytics, has_sms_reminders, has_custom_branding, has_api_access
  - stripe_price_id_monthly, stripe_price_id_yearly

Subscription:
  - tenant, plan, status: active | past_due | cancelled | trial
  - current_period_start, current_period_end
  - trial_end
```

---

## 8. واجهة برمجة التطبيقات (API)

### 8.1 مخطط الـ Endpoints

```
/api/v1/
├── auth/              → تسجيل، دخول، خروج، تحديث token
├── doctors/           → ملفات الأطباء، بحث
├── patients/          → ملفات المرضى
├── assistants/        → ملفات المساعدين
├── departments/       → التخصصات الطبية
├── clinics/           → العيادات الخاصة
├── hospitals/         → المستشفيات
├── appointments/      → إدارة المواعيد (CRUD + state transitions)
├── schedules/         → جداول الأطباء + الفتحات الزمنية
├── notifications/     → الإشعارات (mark as read, preferences)
├── prescriptions/     → الوصفات الطبية
├── chat/              → المحادثات والرسائل
├── reviews/           → التقييمات
├── search/            → بحث موحد
├── analytics/         → إحصائيات الطبيب والمستشفى
├── audit/             → سجل التدقيق
├── dashboard/         → مؤشرات لوحة التحكم
├── billing/           → خطط الاشتراك والفواتير
│
├── assistant/         → Endpoints خاصة بالمساعد
│   ├── appointments/  → مواعيد جميع أماكن العمل
│   ├── schedule/      → جدول عمل المساعد
│   └── shifts/        → إدارة الوردية
│
├── doctor/            → Endpoints لوحة تحكم الطبيب
├── hospital/          → Endpoints لوحة تحكم المستشفى
├── admin/             → Endpoints مدير النظام
│
├── health/            → Health check
├── docs/              → Swagger UI (drf-spectacular)
└── metrics            → Prometheus metrics

/ws/
└── notifications/     → WebSocket channel لكل مستخدم
```

### 8.2 معايير الاستجابة

جميع الـ APIs تلتزم بمغلف استجابة موحد عبر `core/response/envelope.py`:

```json
{
  "success": true,
  "data": { ... },
  "message": null,
  "errors": null
}
```

### 8.3 Pagination

عبر `core/pagination/` — cursor-based pagination للقوائم الكبيرة.

---

## 9. نظام الفوترة والاشتراكات

### 9.1 خطط الاشتراك

| الخطة | المدة | العيادات | الأطباء | المواعيد/شهر | الميزات |
|-------|-------|----------|---------|------------|---------|
| Free Trial | 14 يوم | 1 | 1 | 50 | أساسية |
| Starter | شهري/سنوي | 1 | 1 | غير محدود | كاملة |
| Pro | شهري/سنوي | 3 | متعدد | غير محدود | + تحليلات |
| Enterprise | شهري/سنوي | غير محدود | غير محدود | غير محدود | + White-label + API |

### 9.2 بوابات الدفع المدعومة

- **Paymob** (الافتراضي للسوق المصري):
  - بطاقة ائتمانية
  - Vodafone Cash
  - Fawry
- **Stripe** (اختياري للأسواق الدولية)

### 9.3 عملية الاشتراك

```
Doctor/Hospital يختار الخطة
       ↓
يتم إنشاء Tenant بـ subdomain فريد
       ↓
Paymob Checkout (HMAC-signed)
       ↓
Webhook يؤكد الدفع
       ↓
يتم تفعيل الاشتراك + Feature Flags
       ↓
يتم إنشاء فاتورة (Invoice)
```

---

## 10. الامتثال والخصوصية

### 10.1 تصنيف البيانات

| الفئة | الأمثلة | التشفير |
|-------|---------|--------|
| PHI (بيانات صحية محمية) | المواعيد، التشخيصات، الوصفات | At-rest + TLS |
| PII (بيانات شخصية) | الاسم، الهاتف، البريد | At-rest + TLS |
| Credentials | كلمات المرور المُشفَّرة، مفاتيح JWT | Argon2 / RSA |
| Audit Logs | سجل العمليات | TLS في النقل |

### 10.2 سياسة الاحتفاظ بالبيانات

- **السجلات الطبية:** 7 سنوات (متطلب وزارة الصحة المصرية)
- **سجلات التدقيق:** 3 سنوات كحد أدنى
- **الحذف:** يتم بـ Anonymisation وليس Hard Delete (`REDACTED_<uuid>`)
- **تنفيذ تلقائي:** Celery task شهري يحذف السجلات المنتهية

### 10.3 حقوق المستخدم (GDPR Art. 15–22)

| الحق | الآلية | المهلة |
|-----|--------|--------|
| الوصول إلى البيانات | بوابة المريض → "تنزيل بياناتي" | 30 يوم |
| التصحيح | تعديل الملف الشخصي | فوري |
| الحذف | طلب إلى DPO | 30 يوم |
| النقل | تصدير JSON | 30 يوم |

### 10.4 الموافقة (Consent)

- **حجز الموعد:** ضرورة تعاقدية
- **البريد التسويقي:** موافقة صريحة مطلوبة (opt-in) — الافتراضي opt-out
- **التحليلات:** مصلحة مشروعة مع خيار الرفض

---

## 11. الأمان

### 11.1 ضوابط الأمان المطبَّقة

| الضابط | التطبيق |
|--------|--------|
| تشفير كلمات المرور | Argon2 (state-of-the-art) |
| JWT | RS256 (asymmetric) — مفاتيح 2048-bit RSA |
| TLS | 1.2+ مُطبَّق بواسطة Nginx + HSTS سنة |
| CORS | محدود بـ `CORS_ALLOWED_ORIGINS` |
| IP Blocking | حظر تلقائي عند المحاولات الفاشلة المتكررة (`core/ip_blocking.py`) |
| Rate Limiting | محدود لكل نوع endpoint (`core/throttles.py`) |
| Audit Trail | كل عملية حساسة مُسجَّلة في `audit.AuditLog` |
| Secret Scanning | TruffleHog على كل push |
| Dependency Scanning | `pip-audit` أسبوعياً عبر GitHub Actions |
| CSRF | Django built-in + `CSRF_TRUSTED_ORIGINS` |
| File Upload Validation | امتدادات محددة + حجم أقصى 10MB |

### 11.2 Role-Based Access Control (RBAC)

عبر `core/permissions/role_permissions.py` و `core/permissions/policies/`:

```
canBookAppointment:    [patient]
canApproveAppointment: [assistant, doctor]
canManageDoctors:      [hospital_admin, admin]
canViewAnalytics:      [hospital_admin, admin]
canManageSystem:       [admin]
canViewPrescriptions:  [patient, doctor]
```

### 11.3 Feature Flags

عبر `core/feature_flags.py` — يتحقق من خطة الاشتراك قبل تفعيل الميزة:

```python
has_analytics       → Pro + Enterprise فقط
has_sms_reminders   → Starter وما فوق
has_custom_branding → Enterprise فقط
has_api_access      → Enterprise فقط
```

---

## 12. نظام التصميم والواجهة

### 12.1 ألوان النظام (Design Tokens)

| المتغير | القيمة | الاستخدام |
|---------|--------|----------|
| `--primary` | `#1B5E8A` | أزرار الحجز والحفظ والروابط |
| `--accent` | `#E5701F` | أزرار Hero CTA فقط |
| `--success` | `#1A8A5A` | رسائل النجاح والحالات المكتملة |
| `--destructive` | `#D93025` | الإلغاء والحذف والتحذيرات |
| `--warning` | `#F59E0B` | التحذيرات وحالة "قيد الانتظار" |
| `--info` | `#3B82F6` | المعلومات وحالة "مجدول" |

> ⚠️ **قاعدة صارمة:** لا يُستخدم `--accent` للأزرار العامة — للـ Hero CTA فقط.

### 12.2 نظام الحواف (Border Radius)

| الحجم | القيمة | الاستخدام |
|-------|--------|----------|
| `sm` | `6px` | Badges, Tags |
| `md` | `10px` | أزرار، Inputs |
| `lg` | `16px` | Cards, Modals |
| `pill` | `100px` | Status Badges، أزرار مستديرة |

### 12.3 نظام الطباعة

| العنصر | الخط | الحجم | الوزن |
|--------|------|-------|-------|
| أرقام Stats | Plus Jakarta Sans | 28-32px | 800 |
| عناوين الصفحات | Cairo | 22-28px | 800 |
| عناوين فرعية | Cairo | 16-18px | 700 |
| نص عادي | Cairo | 13-14px | 400-500 |

### 12.4 المكونات المشتركة (UI Components)

```
Button, Input, Select, Modal, Badge, Card
Table, VirtualTable (للقوائم الكبيرة)
Skeleton, Spinner, LoadingButton
EmptyState, Pagination, Tabs
Avatar, LazyImage, PasswordStrength
AppointmentStatusBadge, SpecialtySelect, GovernorateSelect
ConfirmDialog, PageWrapper, Toast
```

### 12.5 دعم RTL

- **التطبيق:** `useRTL()` hook يضبط `document.documentElement.dir`
- **CSS:** `[dir='rtl']` selectors في `rtl.css` (20+ rule)
- **Helpers:** `rtlUtils.js` — `paddingInlineStart`, `marginInlineStart`, `flipIcon`, `textAlign`, `flexRow`, `fontFamily`
- **النطاق:** جميع المكونات والصفحات مغطاة بالكامل

---

## 13. الاختبارات وضمان الجودة

### 13.1 مجموعة الاختبارات (165+ اختبار)

| النوع | الأداة | العدد | المجلد |
|-------|--------|-------|--------|
| Unit Tests | Vitest | 85+ | `tests/unit/` |
| E2E Tests | Playwright | ~70 | `e2e/tests/` |
| Integration Tests | Vitest | 6 | `tests/integration/` |
| Performance | Lighthouse CI | — | `tests/performance/` |
| Load Tests | k6 | — | `tests/load/` |
| Accessibility | axe-core | WCAG 2.1 AA | `tests/accessibility/` |

### 13.2 تغطية Unit Tests

```
tests/unit/
├── validators/
│   ├── authValidators.test.js       (57 test)
│   ├── appointmentValidators.test.js
│   └── profileValidators.test.js
├── hooks/
│   └── hooks.test.js               (custom hooks)
├── components/
│   └── ui.test.jsx                 (shared components)
└── utils/
    ├── constants.test.js
    └── designSystem.test.js
```

### 13.3 E2E Tests (Playwright)

```
e2e/tests/
├── auth.spec.js               → تسجيل الدخول والخروج
├── appointments.spec.js       → دورة حياة الموعد كاملة
├── doctor-dashboard.spec.js   → لوحة تحكم الطبيب
├── prescriptions.spec.js      → الوصفات الطبية
├── notifications.spec.js      → الإشعارات
├── patient-records.spec.js    → سجلات المريض
├── profile-settings.spec.js   → إعدادات الملف الشخصي
├── analytics.spec.js          → التحليلات
├── reports.spec.js            → التقارير
└── rtl-accessibility.spec.js  → RTL + A11y
```

### 13.4 حدود التغطية المطلوبة

```javascript
// vitest.config.js
coverage: {
  thresholds: {
    branches:   80,
    functions:  80,
    lines:      80,
    statements: 80
  }
}
```

### 13.5 CI/CD Pipeline (GitHub Actions — 5 jobs)

```
1. lint        → ESLint + Black
2. unit-tests  → Vitest + coverage check
3. e2e-tests   → Playwright (Chromium, Firefox, Safari)
4. security    → pip-audit + TruffleHog
5. deploy      → Docker build + push + compose up
```

---

## 14. النشر والبنية التحتية

### 14.1 Docker Services

```yaml
services:
  web:     # Django / Daphne (ASGI)
  db:      # PostgreSQL
  redis:   # Cache + Channels + Celery broker
  celery:  # Background workers
  beat:    # Celery Beat (periodic tasks)
  nginx:   # Reverse proxy + SSL
  prometheus: # Metrics collection
  grafana:    # Dashboards
```

### 14.2 متغيرات البيئة الحرجة (قبل الإنتاج)

```bash
# إلزامي تغييره
DEBUG=False
DJANGO_SECRET_KEY=<50+ random chars>
ALLOWED_HOSTS=yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
DB_PASSWORD=<20+ chars>

# بوابة الدفع
BILLING_PROVIDER=paymob
PAYMOB_API_KEY=<from Paymob dashboard>
PAYMOB_INTEGRATION_ID=<card>
PAYMOB_WALLET_INTEGRATION_ID=<Vodafone Cash>
PAYMOB_FAWRY_INTEGRATION_ID=<Fawry>

# SMS
SMS_PROVIDER=smsmisr
SMSMISR_USERNAME=<username>
SMSMISR_PASSWORD=<password>

# مراقبة الأخطاء
SENTRY_DSN=<from sentry.io>

# الاحتفاظ بالبيانات
DATA_RETENTION_YEARS=7
AUDIT_LOG_RETENTION_YEARS=3
```

### 14.3 Subdomain Routing

```
*.curabook.com  →  Nginx wildcard
clinic-ahmed.curabook.com  →  Tenant: ahmed
hospital-cairo.curabook.com  →  Tenant: cairo-hospital
```

### 14.4 قائمة ما قبل الإطلاق

- [ ] تغيير جميع secrets في `.env`
- [ ] `DEBUG=False`
- [ ] SSL Certificate صالح (wildcard للـ subdomains)
- [ ] نسخة احتياطية قبل النشر
- [ ] التحقق من `/api/v1/health/`
- [ ] ضبط `DATA_RETENTION_YEARS=7`
- [ ] تعيين DPO ونشر Privacy Policy وTerms of Service
- [ ] جدولة أول Penetration Test

---

## 15. مؤشرات الأداء

### 15.1 مؤشرات الأداء قبل/بعد التحسين

| المؤشر | قبل | بعد | التحسين |
|--------|-----|-----|---------|
| Initial Bundle | 345 KB | **45 KB** | -87% ✅ |
| Page Load (LCP) | 3.2s | **~1.6s** | -50% ✅ |
| Error Rate | 2.3% | **< 0.5%** | -78% ✅ |
| مفاتيح i18n الناقصة | 164 | **0** | 100% ✅ |
| ثغرات RTL | 14 | **0** | 100% ✅ |

### 15.2 Phases المُنجزة

| المرحلة | الحالة | الوصف |
|---------|--------|-------|
| Phase 1 — Critical Fixes | ✅ 100% | MOD_XL، WebSocket crash |
| Phase 2 — High Priority | ✅ 100% | Experience years، notification prefs |
| Phase 3 — Medium Priority | ✅ 100% | Analytics API، i18n 164 keys، RTL |
| Phase 4 — Polish & Performance | ✅ 100% | Bundle -87%، design system، lazy loading |
| Phase 5 — Testing Suite | ✅ 100% | 165+ tests: Unit، E2E، Perf، Load، A11y |
| Documentation | ✅ 100% | Changelog شامل + تحليل كامل |
| CI/CD Pipeline | ✅ 100% | 5-job GitHub Actions |
| Security Audit | ⚠️ معلق | Checklist جاهز — يُنصح بـ Penetration Test رسمي |

---

## 16. الميزات المستقبلية

### 16.1 القصير المدى (Q3 2026)

| الميزة | الوصف | الأولوية |
|--------|-------|---------|
| تطبيق موبايل | React Native لـ iOS و Android | P1 |
| Push Notifications | Firebase Cloud Messaging (FCM) | P1 |
| Google Calendar Sync | مزامنة جدول الطبيب مع Google Calendar | P2 |
| Telemedicine Enhancement | تحسين جودة الفيديو + تسجيل الجلسات | P2 |

### 16.2 المتوسط المدى (Q4 2026)

| الميزة | الوصف | الأولوية |
|--------|-------|---------|
| AI Scheduling | اقتراح الفتحات الأنسب باستخدام ML | P2 |
| Patient Portal Enhanced | سجل طبي كامل للمريض | P2 |
| Insurance Integration | ربط مع شركات التأمين الصحي | P2 |
| Pharmacy Integration | ربط الوصفات بالصيدليات | P3 |

### 16.3 طويل المدى

| الميزة | الوصف |
|--------|-------|
| Open API | API للمطورين الخارجيين (Enterprise plan) |
| White-label | واجهة مخصصة لكل مستشفى كبير |
| Multi-country Expansion | توسع خارج مصر |
| Clinical Decision Support | دعم القرار الطبي باستخدام AI |

---

## ملحق أ — المصطلحات التقنية

| المصطلح | التعريف |
|---------|---------|
| Tenant | المستأجر (طبيب أو مستشفى) في نظام Multi-tenant |
| Slot | فتحة زمنية متاحة للحجز |
| Soft Delete | الحذف المنطقي (الإخفاء دون حذف فعلي) |
| PHI | Protected Health Information — بيانات صحية محمية |
| PII | Personally Identifiable Information — بيانات شخصية |
| RTL | Right-to-Left — اتجاه النص للغة العربية |
| LCP | Largest Contentful Paint — مؤشر أداء تحميل الصفحة |
| WCAG | Web Content Accessibility Guidelines |
| DPO | Data Protection Officer — مسؤول حماية البيانات |
| JWT | JSON Web Token — رمز المصادقة |
| ASGI | Asynchronous Server Gateway Interface |
| WSGI | Web Server Gateway Interface |

---

## ملحق ب — روابط التوثيق الداخلي

| الملف | المحتوى |
|-------|---------|
| `README.md` | Quick Start + Project Structure |
| `TESTING_GUIDE.md` | دليل الاختبارات الشامل (Phase 5) |
| `COMPLETE_CHANGELOG.md` | سجل التغييرات v1 → v52 |
| `DESIGN_SYSTEM.md` | نظام التصميم الرسمي |
| `PRIVACY_AND_COMPLIANCE.md` | دليل الامتثال والخصوصية |
| `DEPLOYMENT_CHECKLIST.md` | قائمة مراجعة النشر |
| `ultimate_doctor_specification.md` | المواصفات الكاملة لصفحات الطبيب |
| `START_HERE.md` | دليل البدء السريع |

---

*وثيقة أُعدَّت بناءً على التحليل الكامل لكود CuraBook v35 | يونيو 2026*  
*Medical SaaS Platform — Made for the Egyptian & Arab Market*