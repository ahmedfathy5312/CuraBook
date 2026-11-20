/**
 * translateNotification.js
 * Enhancement #13 Fix: Translate backend notification messages to Arabic when UI is Arabic.
 * Backend sends messages in English (e.g. "Appointment Created", "Booking Request Received").
 * This utility maps common notification titles/messages to Arabic equivalents.
 */

const NOTIF_TITLE_MAP_AR = {
  // Appointment events
  'Appointment Created':            'تم إنشاء الموعد',
  'Booking Request Received':       'تم استلام طلب الحجز',
  'Appointment Confirmed':          'تم تأكيد الموعد',
  'Appointment Cancelled':          'تم إلغاء الموعد',
  'Appointment Rejected':           'تم رفض الموعد',
  'Appointment Completed':          'اكتمل الموعد',
  'Appointment Reminder':           'تذكير بالموعد',
  'Appointment Rescheduled':        'تم إعادة جدولة الموعد',
  'Reschedule Requested':           'طلب إعادة الجدولة',
  'New Appointment':                'موعد جديد',
  'Appointment Updated':            'تم تحديث الموعد',
  'Appointment Status Update':      'تحديث حالة الموعد',
  'Appointment Reschedule Request': 'طلب إعادة جدولة الموعد',
  'Reschedule Request':             'طلب إعادة الجدولة',

  // Prescriptions
  'Prescription Ready':             'الوصفة الطبية جاهزة',
  'New Prescription':               'وصفة طبية جديدة',

  // Chat / messages
  'New Message':                    'رسالة جديدة',
  'Chat Message':                   'رسالة جديدة في المحادثة',

  // System / general
  'Welcome to CuraBook':            'أهلاً بك في CuraBook',
  'Profile Updated':                'تم تحديث الملف الشخصي',
  'Password Changed':               'تم تغيير كلمة المرور',
  'System Notification':            'إشعار النظام',
  'New Review Received':            'تم استلام تقييم جديد',

  // Status transitions
  'Booking Approved':               'تمت الموافقة على الحجز',
  'Booking Rejected':               'تم رفض الحجز',
  'Your appointment has been confirmed': 'تم تأكيد موعدك',
  'Your appointment has been cancelled': 'تم إلغاء موعدك',
  'Your appointment has been completed': 'اكتمل موعدك',
};

const NOTIF_MSG_MAP_AR = {
  ...NOTIF_TITLE_MAP_AR,
  // Extended message texts
  'Your booking request has been received. You will be notified once it is confirmed.':
    'تم استلام طلب حجزك. سيتم إشعارك عند التأكيد.',
  'Your appointment has been successfully booked.':
    'تم حجز موعدك بنجاح.',
  'Your appointment has been confirmed by the doctor.':
    'تم تأكيد موعدك من قِبَل الطبيب.',
  'Your appointment has been cancelled.':
    'تم إلغاء موعدك.',
  'You have a new appointment request.':
    'لديك طلب موعد جديد.',
  'Reminder: You have an appointment tomorrow.':
    'تذكير: لديك موعد غداً.',
  'Reminder: You have an appointment today.':
    'تذكير: لديك موعد اليوم.',
};

/**
 * Translate a notification title or message to Arabic if language is 'ar'.
 * If no translation found, returns the original string.
 *
 * @param {string} text - The original text from backend
 * @param {string} lang - Current language ('ar' | 'en')
 * @param {'title'|'message'} type - Which map to use
 * @returns {string}
 */
export function translateNotifText(text, lang, type = 'title') {
  if (!text || lang !== 'ar') return text;
  const map = type === 'message' ? NOTIF_MSG_MAP_AR : NOTIF_TITLE_MAP_AR;
  const reviewMatch = String(text).match(/^You have a new (\d+)-star review from patient\s+(.+)$/i);
  if (type === 'message' && reviewMatch) {
    return `لديك تقييم جديد ${reviewMatch[1]} نجوم من المريض ${reviewMatch[2]}`;
  }
  // Exact match first
  if (map[text]) return map[text];
  // Case-insensitive match
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (key.toLowerCase() === lower) return val;
  }
  // Partial match: backend sometimes appends doctor name or extra context
  // e.g. "Appointment Created for Dr. Ahmed" → translate the known prefix
  for (const [key, val] of Object.entries(map)) {
    if (lower.startsWith(key.toLowerCase())) {
      // Replace the known English prefix with Arabic, keep any suffix
      const suffix = text.slice(key.length).trim();
      return suffix ? `${val} — ${suffix}` : val;
    }
  }
  return text;
}

export default translateNotifText;
