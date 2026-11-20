/**
 * downloadFile.js — Bug #4 Fix
 * ─────────────────────────────────────────────────────────────────
 * Utility for proper file downloads using Blob + createObjectURL.
 *
 * PROBLEM FIXED:
 *   Before: download buttons called alert("جاري تحضير التقرير...")
 *           with no actual file download happening.
 *   After:  proper fetch → blob → createObjectURL → auto-click <a>
 *           with full loading state and error handling.
 * ─────────────────────────────────────────────────────────────────
 *
 * USAGE in any component:
 *
 *   import { downloadReport } from '../../utils/downloadFile';
 *
 *   // In your handler:
 *   await downloadReport({
 *     url: '/api/v1/hospitals/reports/monthly/',
 *     filename: 'monthly_report.pdf',
 *     token: accessToken,
 *     onStart:  () => setIsDownloading(true),
 *     onFinish: () => setIsDownloading(false),
 *     onError:  (msg) => toast.error(msg),
 *   });
 */

/**
 * Core download function — fetch URL as blob and trigger browser download.
 *
 * @param {object} options
 * @param {string}   options.url       - Full API URL to fetch
 * @param {string}   options.filename  - Suggested filename (e.g. 'report.pdf')
 * @param {string}   [options.token]   - JWT Bearer token (if auth required)
 * @param {object}   [options.headers] - Extra headers to merge
 * @param {Function} [options.onStart]  - Called when download starts
 * @param {Function} [options.onFinish] - Called when download finishes (success or error)
 * @param {Function} [options.onError]  - Called with error message string on failure
 * @returns {Promise<boolean>} true on success, false on failure
 */
export async function downloadReport({
  url,
  filename = 'report.pdf',
  token = null,
  headers = {},
  onStart = null,
  onFinish = null,
  onError = null,
}) {
  if (onStart) onStart();

  try {
    // Build headers
    const reqHeaders = {
      ...headers,
    };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: reqHeaders,
    });

    // Handle HTTP errors (4xx / 5xx)
    if (!response.ok) {
      let errorMsg;
      if (response.status === 403) {
        errorMsg = 'ليس لديك صلاحية تنزيل هذا التقرير.';
      } else if (response.status === 404) {
        errorMsg = 'التقرير غير موجود. جرّب مرة أخرى لاحقاً.';
      } else if (response.status >= 500) {
        errorMsg = 'حدث خطأ في الخادم أثناء توليد التقرير. حاول مرة أخرى.';
      } else {
        errorMsg = `حدث خطأ أثناء تحميل التقرير (${response.status}).`;
      }
      if (onError) onError(errorMsg);
      return false;
    }

    // Check that we actually got a file back (not a JSON error body)
    const contentType = response.headers.get('content-type') || '';
    const isFile =
      contentType.includes('pdf') ||
      contentType.includes('excel') ||
      contentType.includes('spreadsheet') ||
      contentType.includes('csv') ||
      contentType.includes('octet-stream');

    if (!isFile) {
      // Backend returned JSON — likely an error or not-implemented
      let body = {};
      try { body = await response.json(); } catch (_) { /* ignore */ }
      const msg =
        body?.detail ||
        body?.message ||
        body?.error ||
        'التقرير غير متاح للتنزيل حالياً.';
      if (onError) onError(msg);
      return false;
    }

    // Convert response to Blob and trigger download
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      document.body.removeChild(anchor);
    }, 200);

    return true;
  } catch (err) {
    console.error('[downloadReport] Network error:', err);
    const msg =
      err?.message === 'Failed to fetch'
        ? 'تعذّر الاتصال بالخادم. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.'
        : 'حدث خطأ غير متوقع أثناء تحميل التقرير.';
    if (onError) onError(msg);
    return false;
  } finally {
    if (onFinish) onFinish();
  }
}

/**
 * Pre-built helper for the 3 hospital analytics reports.
 * Reads token from localStorage automatically.
 *
 * @param {'monthly' | 'doctors' | 'revenue'} reportType
 * @param {object} handlers  - { onStart, onFinish, onError }
 */
export async function downloadHospitalReport(reportType, handlers = {}) {
  // Try common token storage keys used in the project
  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    null;

  const reportMap = {
    monthly: {
      url: '/api/v1/hospitals/reports/monthly/',
      filename: 'monthly_summary_report.pdf',
    },
    doctors: {
      url: '/api/v1/hospitals/reports/doctors-performance/',
      filename: 'doctors_performance_report.pdf',
    },
    revenue: {
      url: '/api/v1/hospitals/reports/revenue/',
      filename: 'revenue_analysis_report.pdf',
    },
  };

  const config = reportMap[reportType];
  if (!config) {
    console.error('[downloadHospitalReport] Unknown report type:', reportType);
    return false;
  }

  return downloadReport({
    url: config.url,
    filename: config.filename,
    token,
    ...handlers,
  });
}
