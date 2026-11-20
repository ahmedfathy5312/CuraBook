import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import useTranslation from "../i18n/useTranslation";

export default function Footer() {
  const { t, isRTL } = useTranslation();
  const SOCIAL_LINKS = [
    { icon: 'facebook',  href: 'https://facebook.com/CuraBook',         label: 'Facebook'  },
    { icon: 'twitter-x', href: 'https://twitter.com/CuraBook',          label: 'Twitter/X' },
    { icon: 'linkedin',  href: 'https://linkedin.com/company/curabook', label: 'LinkedIn'  },
    { icon: 'whatsapp',  href: 'https://wa.me/201234567890',            label: 'WhatsApp'  },
  ];

  return (
    <footer style={{
      background: 'var(--footer-bg, #1A2E3D)',
      color: '#fff',
      marginTop: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '40px',
        maxWidth: '1200px', margin: '0 auto',
        padding: '52px 40px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '220px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src={logo} alt="CuraBook" style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)' }} />
            <span style={{ fontSize: '19px', fontWeight: 800, color: '#fff' }}>CuraBook</span>
          </Link>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            {t('footer.tagline')}
          </p>
        </div>

        {/* Platform links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{t('footer.platform')}</span>
          {[{ to: '/doctors', l: t('footer.findDoctors') }, { to: '/hospitals', l: t('footer.hospitals') }, { to: '/appointments', l: t('footer.appointments') }].map(({ to, l }) => (
            <Link key={to} to={to} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseOver={e => e.target.style.color = '#B8D9EF'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.65)'}>
              {l}
            </Link>
          ))}
        </div>

        {/* Company links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{t('footer.company')}</span>
          {[{ to: '/About-Us', l: t('footer.about') }, { to: '/Contact-Us', l: t('footer.contact') }, { to: '/join', l: t('footer.join') }].map(({ to, l }) => (
            <Link key={to} to={to} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseOver={e => e.target.style.color = '#B8D9EF'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.65)'}>
              {l}
            </Link>
          ))}
        </div>

        {/* Social */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{t('footer.followUs')}</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            {SOCIAL_LINKS.map(({ icon, href, label }) => (
              <a
                key={icon}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '16px', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'none'; }}>
                <i className={`bi bi-${icon}`} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 40px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }} dir="ltr">
          © {new Date().getFullYear()} {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
