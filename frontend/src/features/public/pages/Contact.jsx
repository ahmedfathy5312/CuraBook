/**
 * Contact.jsx — Full Contact Page with Map + Social Links + Success State
 * UX FIX v21: Full i18n support — all strings via useTranslation (was 100% hardcoded English)
 */
import React, { useState } from "react";
import illustration from "../../../assets/contact.png";
import PublicLayout from "../../../layouts/PublicLayout";
import { useToast } from "../../../context/ToastContext";
import apiClient from "../../../services/apiClient";
import { API } from "../../../constants/apiRoutes";
import useTranslation from "../../../i18n/useTranslation";

const P = 'var(--primary)';

const SOCIAL_LINKS = [
  { icon: "🐦", label: "Twitter / X", url: "https://twitter.com/CuraBook",           handle: "@CuraBook" },
  { icon: "💼", label: "LinkedIn",    url: "https://linkedin.com/company/curabook",  handle: "CuraBook" },
  { icon: "📘", label: "Facebook",    url: "https://facebook.com/CuraBook",           handle: "CuraBook" },
  { icon: "📸", label: "Instagram",   url: "https://instagram.com/CuraBook",          handle: "@CuraBook" },
];

const INITIAL = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
  const toast                     = useToast();
  const { t, isRTL }              = useTranslation();
  const [form, setForm]           = useState(INITIAL);
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Contact info driven by translations ── */
  const CONTACT_INFO = [
    { icon: "📧", label: t('contact.info.email.label'),   value: t('contact.info.email.value') },
    { icon: "📞", label: t('contact.info.phone.label'),   value: t('contact.info.phone.value') },
    { icon: "📍", label: t('contact.info.address.label'), value: t('contact.info.address.value') },
    { icon: "🕐", label: t('contact.info.hours.label'),   value: t('contact.info.hours.value') },
  ];

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = t('contact.errors.nameRequired');
    if (!form.email.trim())   e.email   = t('contact.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('contact.errors.emailInvalid');
    if (!form.message.trim()) e.message = t('contact.errors.messageRequired');
    else if (form.message.trim().length < 10) e.message = t('contact.errors.messageTooShort');
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await apiClient.post(API.CONTACT.SEND, {
        name: form.name.trim(), email: form.email.trim(),
        subject: form.subject.trim(), message: form.message.trim(),
      });
      setSubmitted(true);
      toast.success(t('contact.toastSuccess'));
    } catch (err) {
      if (err?.response?.status === 404) {
        const subject = encodeURIComponent(`CuraBook: ${form.subject || "Support Request"}`);
        const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
        window.location.href = `mailto:support@curabook.com?subject=${subject}&body=${body}`;
        toast.info(t('contact.toastOpenMail'));
      } else {
        toast.error(t('contact.toastError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const inp = (extra = {}) => ({
    border: "1.5px solid var(--border-base)", borderRadius: "var(--radius-md)", padding: "12px 14px",
    fontSize: "14px", color: 'var(--text-h)', outline: "none", width: "100%",
    boxSizing: "border-box", fontFamily: "inherit", background: 'var(--bg-card)',
    transition: "border-color 0.2s", textAlign: "start",
    ...extra,
  });

  return (
    <PublicLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        .contact-page { font-family:'Cairo',sans-serif; }
        .contact-input:focus { border-color:var(--primary) !important; box-shadow:0 0 0 3px rgba(27,94,138,0.1); }
        .social-btn:hover { background:#E6F1FB !important; border-color:var(--primary) !important; transform:translateY(-2px); }
        @media(max-width:900px){.contact-grid{flex-direction:column!important}.map-box{height:220px!important}}
      `}</style>

      <div className="contact-page" dir={isRTL ? "rtl" : "ltr"}
        style={{ background: "var(--bg-page)", minHeight: "100vh", padding: "60px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* Page Header */}
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <span style={{ background: "#E6F1FB", color: P, fontSize: "13px", fontWeight: 700, borderRadius: "var(--radius-pill)", padding: "6px 16px", display: "inline-block", marginBottom: "14px" }}>
              {t('contact.badge')}
            </span>
            <h1 style={{ fontSize: "36px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 12px" }}>
              {t('contact.heading')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: "16px", margin: 0 }}>
              {t('contact.subheading')}
            </p>
          </div>

          {/* Main Grid */}
          <div className="contact-grid" style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>

            {/* ── LEFT: Form ──────────────────────────────────────────────── */}
            <div style={{ flex: "1 1 55%", background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "40px", boxShadow: "var(--shadow-md)" }}>

              {submitted ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: "72px", marginBottom: "20px" }}>✅</div>
                  <h2 style={{ fontSize: "22px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 12px" }}>
                    {t('contact.successTitle')}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: "15px", margin: "0 0 32px", lineHeight: "1.6" }}>
                    {t('contact.successMsg')}
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm(INITIAL); }}
                    style={{ background: P, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "12px 28px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                  >
                    {t('contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <>
                  <h2 style={{ margin: "0 0 28px", fontSize: "20px", fontWeight: 800, color: 'var(--text-h)' }}>
                    {t('contact.formTitle')}
                  </h2>

                  {/* Name + Email row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    {[
                      { field: "name",  label: t('contact.fullName'),    type: "text",  ph: t('contact.namePlaceholder') },
                      { field: "email", label: t('contact.emailAddress'), type: "email", ph: t('contact.emailPlaceholder') },
                    ].map(({ field, label, type, ph }) => (
                      <div key={field}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: 'var(--text-body)', marginBottom: "6px" }}>
                          {label}
                        </label>
                        <input
                          className="contact-input"
                          style={inp({ borderColor: errors[field] ? "#E97D61" : 'var(--border)' })}
                          name={field} type={type} placeholder={ph}
                          value={form[field]} onChange={handleChange}
                          autoComplete={field}
                        />
                        {errors[field] && (
                          <span style={{ fontSize: "12px", color: "#E97D61", marginTop: "4px", display: "block" }}>
                            {errors[field]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: 'var(--text-body)', marginBottom: "6px" }}>
                      {t('contact.subject')}
                    </label>
                    <input className="contact-input" style={inp()} name="subject" type="text"
                      placeholder={t('contact.subjectPlaceholder')} value={form.subject} onChange={handleChange} />
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: 'var(--text-body)', marginBottom: "6px" }}>
                      {t('contact.message')}
                    </label>
                    <textarea
                      className="contact-input"
                      style={{ ...inp({ borderColor: errors.message ? "#E97D61" : 'var(--border)' }), resize: "vertical", minHeight: "130px" }}
                      name="message" placeholder={t('contact.messagePlaceholder')}
                      value={form.message} onChange={handleChange}
                    />
                    {errors.message && (
                      <span style={{ fontSize: "12px", color: "#E97D61", marginTop: "4px", display: "block" }}>
                        {errors.message}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSubmit} disabled={loading}
                    style={{
                      background: `linear-gradient(135deg,${P},#31A870)`, color: "#fff",
                      border: "none", borderRadius: "var(--radius-md)", padding: "13px 32px",
                      fontSize: "15px", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.75 : 1, width: "100%",
                    }}
                  >
                    {loading ? t('contact.sending') : t('contact.send')}
                  </button>
                </>
              )}
            </div>

            {/* ── RIGHT: Info + Social + Map ──────────────────────────────── */}
            <div style={{ flex: "1 1 40%", display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Contact Info */}
              <div style={{ background: `linear-gradient(135deg,${P},#31A870)`, borderRadius: "var(--radius-lg)", padding: "32px", color: "#fff" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 800 }}>
                  {t('contact.infoTitle')}
                </h3>
                {CONTACT_INFO.map(({ icon, label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: "11px", opacity: 0.75, marginBottom: "2px" }}>{label}</div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{value}</div>
                    </div>
                  </div>
                ))}

                {/* Social Links */}
                <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                  <p style={{ margin: "0 0 14px", fontSize: "13px", opacity: 0.85, fontWeight: 600 }}>
                    {t('contact.followUs')}
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {SOCIAL_LINKS.map(({ icon, label, url }) => (
                      <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                        style={{ background: "rgba(255,255,255,0.18)", borderRadius: "var(--radius-md)", padding: "8px 14px", fontSize: "13px", color: "#fff", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                      >
                        {icon} {label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map Embed */}
              <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
                <div style={{ background: 'var(--text-h)', padding: "12px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>📍</span>
                  <span style={{ color: "#fff", fontSize: "13px", fontWeight: 600 }}>{t('contact.ourLocation')}</span>
                </div>
                <iframe
                  className="map-box"
                  title="CuraBook Office Location"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=31.2357%2C30.0444%2C31.2557%2C30.0644&layer=mapnik&marker=30.0544%2C31.2457"
                  style={{ width: "100%", height: "260px", border: "none", display: "block" }}
                  loading="lazy"
                />
                <div style={{ background: "var(--bg-page)", padding: "10px 16px", textAlign: "center" }}>
                  <a href="https://www.openstreetmap.org/?mlat=30.0544&mlon=31.2457#map=15/30.0544/31.2457"
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "12px", color: P, fontWeight: 600, textDecoration: "none" }}
                  >
                    {t('contact.viewLargerMap')}
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
