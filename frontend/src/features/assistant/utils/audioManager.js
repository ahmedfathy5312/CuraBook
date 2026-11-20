/**
 * audioManager.js — AudioContext Singleton
 * Sprint 4: بدلاً من إنشاء AudioContext جديد في كل notification،
 * نستخدم instance واحد طوال عمر التطبيق.
 *
 * ✅ يحل مشكلة: "The AudioContext was not allowed to start"
 * ✅ يوفر الذاكرة: بدلاً من عشرات الـ contexts المنسية
 * ✅ يدير lifecycle: resume() عند الحاجة، close() عند تدمير الصفحة
 */

let _ctx = null;

/**
 * يُرجع الـ AudioContext الموجود أو ينشئ واحداً جديداً.
 * يستأنف تلقائياً لو كان مُوقفاً (browser policy).
 */
export function getAudioContext() {
  if (!_ctx || _ctx.state === 'closed') {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }

  // استئناف إذا كان suspended (Chrome يفرض هذا قبل تفاعل المستخدم)
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }

  return _ctx;
}

/**
 * تشغيل صوت beep بسيط — يستخدم الـ singleton.
 * @param {number} freq  - تردد النغمة بـ Hz (افتراضي: 520)
 * @param {number} dur   - مدة الصوت بالثواني (افتراضي: 0.45)
 * @param {number} vol   - مستوى الصوت 0–1 (افتراضي: 0.25)
 */
export function playBeep(freq = 520, dur = 0.45, vol = 0.25) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type              = 'sine';
    osc.frequency.value   = freq;

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);

    // تنظيف تلقائي بعد انتهاء الصوت
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch { /* already disconnected */ }
    };
  } catch {
    /* AudioContext blocked أو خطأ آخر — silent fallback */
  }
}

/**
 * إغلاق الـ context بالكامل (استدعه عند logout أو unmount).
 */
export function closeAudioContext() {
  if (_ctx && _ctx.state !== 'closed') {
    _ctx.close().catch(() => {});
  }
  _ctx = null;
}

/**
 * تفعيل الـ AudioContext عند أول تفاعل للمستخدم
 * (ضروري في Chrome/Safari لتجنب autoplay policy).
 * ضعه في useEffect عند mount صفحة الـ Dashboard.
 */
export function unlockAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    // silent buffer لإيقاظ الـ context
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.resume().catch(() => {});
  }
}
