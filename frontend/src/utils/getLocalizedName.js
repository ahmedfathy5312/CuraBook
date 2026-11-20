/**
 * getLocalizedName.js
 * Issue 15 Fix — عرض أسماء الأطباء والمستشفيات حسب لغة الواجهة
 *
 * - إذا كانت اللغة إنجليزية: يستخدم full_name_en أو name_en لو موجودين،
 *   وإلا يجمع first_name + last_name (Latin)، وإلا يرجع full_name/name
 * - إذا كانت اللغة عربية: يرجع full_name أو name مباشرة
 * - يدعم doctors وهospitals وأي entity عندها هذه الحقول
 */

/**
 * يكشف إذا كان النص يحتوي على حروف عربية فقط
 */
function isArabicText(str) {
  if (!str) return false;
  // Arabic unicode range
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * يرجع اسم الطبيب/المستشفى حسب اللغة المختارة
 *
 * @param {object} entity   - الكائن (doctor, hospital, …)
 * @param {string} lang     - 'ar' | 'en'
 * @param {'doctor'|'hospital'|'generic'} type - نوع الكيان
 * @returns {string}
 */
export function getLocalizedName(entity, lang = 'ar', type = 'generic') {
  if (!entity) return '';

  const isEnglish = lang === 'en';

  if (isEnglish) {
    // 1. حقل مخصص للإنجليزية لو موجود في الـ backend مستقبلاً
    if (entity.full_name_en) return entity.full_name_en;
    if (entity.name_en)      return entity.name_en;

    // 2. first_name + last_name (غالباً Latin عند التسجيل بالإنجليزية)
    const firstName = entity.first_name || '';
    const lastName  = entity.last_name  || '';
    if (firstName || lastName) {
      const combined = `${firstName} ${lastName}`.trim();
      // إذا كانت الحروف Latin (مش عربية) → استخدمها
      if (combined && !isArabicText(combined)) {
        return combined;
      }
    }

    // 3. username لو مش عربي
    if (entity.username && !isArabicText(entity.username)) {
      return entity.username;
    }

    // 4. Fallback على الاسم الأصلي مهما كانت لغته
    return entity.full_name || entity.name || '';
  }

  // Arabic mode — رجّع الاسم الأصلي مباشرة
  return entity.full_name || entity.name || '';
}

/**
 * يرجع اسم المستشفى حسب اللغة
 */
export function getLocalizedHospitalName(hospital, lang = 'ar') {
  if (!hospital) return '';
  const isEnglish = lang === 'en';

  if (isEnglish) {
    if (hospital.name_en)      return hospital.name_en;
    if (hospital.full_name_en) return hospital.full_name_en;
    // إذا كان الاسم الأصلي Latin — استخدمه
    if (hospital.name && !isArabicText(hospital.name)) return hospital.name;
    // Fallback
    return hospital.name || hospital.full_name || '';
  }

  return hospital.name || hospital.full_name || '';
}

/**
 * يضيف prefix الطبيب (د. أو Dr.) حسب اللغة، ويتجنب التكرار
 * Issue 19 fix — مدمج هنا للراحة
 */
export function withDoctorPrefix(name, lang = 'ar') {
  if (!name) return '';
  // إزالة أي prefix موجود أولاً
  const cleaned = name.replace(/^(د\.\s*|Dr\.\s*)/i, '').trim();
  return lang === 'ar' ? `د. ${cleaned}` : `Dr. ${cleaned}`;
}

/**
 * translateCity — Section 8 Translation Fix
 * Backend stores city names in English (e.g. "Assiut", "Cairo").
 * This maps them to Arabic when the UI is in Arabic mode.
 */
const CITY_AR_MAP = {
  'cairo':       'القاهرة',
  'alexandria':  'الإسكندرية',
  'giza':        'الجيزة',
  'assiut':      'أسيوط',
  'asyut':       'أسيوط',
  'luxor':       'الأقصر',
  'aswan':       'أسوان',
  'mansoura':    'المنصورة',
  'tanta':       'طنطا',
  'zagazig':     'الزقازيق',
  'ismailia':    'الإسماعيلية',
  'port said':   'بور سعيد',
  'suez':        'السويس',
  'minya':       'المنيا',
  'sohag':       'سوهاج',
  'fayoum':      'الفيوم',
};

export function translateCity(city, lang = 'ar') {
  if (!city) return '';
  if (lang !== 'ar') return city;
  return CITY_AR_MAP[city.toLowerCase().trim()] || city;
}
