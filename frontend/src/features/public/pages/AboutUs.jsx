/**
 * AboutUs.jsx
 * UX FIX v21: Full i18n support — all strings via useTranslation (was 100% hardcoded English)
 */
import React, { useEffect, useRef, useState } from "react";
import aboutImg from "../../../assets/About.png";
import PublicLayout from "../../../layouts/PublicLayout";
import useTranslation from "../../../i18n/useTranslation";

function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, ref };
}

function StatCard({ icon, target, suffix = "+", label }) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} style={{
      background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "32px 24px",
      textAlign: "center", boxShadow: "var(--shadow-md)",
      border: "1.5px solid var(--border)", transition: "transform 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "40px", fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: "14px", color: 'var(--text-muted)', marginTop: "8px", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function TeamCard({ emoji, name, role, bio, gradient }) {
  const { isRTL } = useTranslation();
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", overflow: "hidden",
      boxShadow: "var(--shadow-md)", transition: "transform 0.25s, box-shadow 0.25s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "var(--shadow-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
    >
      <div style={{ background: gradient, height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px" }}>
        {emoji}
      </div>
      <div style={{ padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: 'var(--text-h)' }}>{name}</h3>
        <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 600, color: 'var(--primary)' }}>{role}</p>
        <p dir={isRTL ? "rtl" : "ltr"} style={{ margin: 0, fontSize: "13px", color: 'var(--text-muted)', lineHeight: "1.6" }}>{bio}</p>
      </div>
    </div>
  );
}

export default function AboutUs() {
  const { t, isRTL } = useTranslation();

  const STATS = [
    { icon: "👨‍⚕️", target: 1200,  suffix: "+", label: t('about.stats.doctors') },
    { icon: "🏥",   target: 85,    suffix: "+", label: t('about.stats.hospitals') },
    { icon: "👥",   target: 50000, suffix: "+", label: t('about.stats.patients') },
    { icon: "📅",   target: 200000,suffix: "+", label: t('about.stats.appointments') },
  ];

  const VALUES = [
    { icon: "❤️", title: t('about.values.patient.title'), desc: t('about.values.patient.desc') },
    { icon: "🔒", title: t('about.values.privacy.title'),    desc: t('about.values.privacy.desc') },
    { icon: "⚡", title: t('about.values.efficiency.title'), desc: t('about.values.efficiency.desc') },
    { icon: "🤝", title: t('about.values.collab.title'),     desc: t('about.values.collab.desc') },
    { icon: "🌐", title: t('about.values.access.title'),     desc: t('about.values.access.desc') },
    { icon: "📈", title: t('about.values.growth.title'),     desc: t('about.values.growth.desc') },
  ];

  const TEAM = [
    { emoji: "👨‍💻", name: "Ahmed El-Sayed",  role: t('about.team.ahmed.role'),  bio: t('about.team.ahmed.bio'),  gradient: "linear-gradient(135deg,#1B5E8A,#154E73)" },
    { emoji: "👩‍⚕️", name: "Dr. Sara Mostafa",role: t('about.team.sara.role'),   bio: t('about.team.sara.bio'),   gradient: "linear-gradient(135deg,#1A8A5A,#1B5E8A)" },
    { emoji: "👨‍🔬", name: "Omar Khalil",      role: t('about.team.omar.role'),   bio: t('about.team.omar.bio'),   gradient: "linear-gradient(135deg,#3B82F6,#1B5E8A)" },
    { emoji: "👩‍💼", name: "Nour Abdallah",    role: t('about.team.nour.role'),   bio: t('about.team.nour.bio'),   gradient: "linear-gradient(135deg,#8B5CF6,#1B5E8A)" },
    { emoji: "👨‍⚕️", name: "Dr. Khaled Hassan",role: t('about.team.khaled.role'), bio: t('about.team.khaled.bio'), gradient: "linear-gradient(135deg,#F59E0B,#1B5E8A)" },
    { emoji: "👩‍💻", name: "Mona Ibrahim",     role: t('about.team.mona.role'),   bio: t('about.team.mona.bio'),   gradient: "linear-gradient(135deg,#E97D61,#1B5E8A)" },
  ];

  return (
    <PublicLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        .about-page { font-family:'Cairo',sans-serif; }
        @media(max-width:768px){
          .about-hero-inner{flex-direction:column!important}
          .stats-grid{grid-template-columns:1fr 1fr!important}
          .team-grid{grid-template-columns:1fr!important}
          .values-grid{grid-template-columns:1fr!important}
          .values3-grid{grid-template-columns:1fr 1fr!important}
        }
      `}</style>

      <div className="about-page" dir={isRTL ? "rtl" : "ltr"}>

        {/* HERO */}
        <section style={{ background: "linear-gradient(135deg,var(--bg-page),var(--primary-pale))", padding: "80px 24px" }}>
          <div className="about-hero-inner" style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", gap: "60px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <span style={{ background: "var(--primary-pale)", color: 'var(--primary)', fontSize: "13px", fontWeight: 700, borderRadius: "var(--radius-pill)", padding: "6px 16px", display: "inline-block", marginBottom: "18px" }}>
                {t('about.badge')}
              </span>
              <h1 style={{ fontSize: "40px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 20px", lineHeight: 1.2 }}>
                {t('about.heroTitle')}<br/>
                <span style={{ color: 'var(--primary)' }}>{t('about.heroTitleHighlight')}</span>
              </h1>
              <p style={{ fontSize: "16px", color: 'var(--text-muted)', lineHeight: "1.8", margin: "0 0 14px" }}>
                {t('about.heroPara1')}
              </p>
              <p style={{ fontSize: "15px", color: 'var(--text-muted)', lineHeight: "1.8", margin: 0 }}>
                {t('about.heroPara2')}
              </p>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <img src={aboutImg} alt="Healthcare illustration" style={{ maxWidth: "420px", width: "100%", borderRadius: "var(--radius-lg)" }}/>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ padding: "60px 24px", background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 10px" }}>
                {t('about.statsHeading')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: "15px", margin: 0 }}>
                {t('about.statsSubheading')}
              </p>
            </div>
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "24px" }}>
              {STATS.map(s => <StatCard key={s.label} {...s}/>)}
            </div>
          </div>
        </section>

        {/* MISSION & VISION */}
        <section style={{ padding: "60px 24px", background: "var(--bg-page)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div className="values-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              {[
                { icon: "🎯", title: t('about.missionTitle'), color: 'var(--primary)', text: t('about.missionText') },
                { icon: "🔭", title: t('about.visionTitle'),  color: "var(--success)", text: t('about.visionText') },
              ].map(({ icon, title, color, text }) => (
                <div key={title} style={{ background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "40px", boxShadow: "var(--shadow-md)", borderTop: `4px solid ${color}` }}>
                  <div style={{ fontSize: "40px", marginBottom: "16px" }}>{icon}</div>
                  <h2 style={{ fontSize: "22px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 14px" }}>{title}</h2>
                  <p style={{ fontSize: "15px", color: 'var(--text-muted)', lineHeight: "1.8", margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CORE VALUES */}
        <section style={{ padding: "60px 24px", background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 10px" }}>
                {t('about.valuesHeading')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: "15px", margin: 0 }}>
                {t('about.valuesSubheading')}
              </p>
            </div>
            <div className="values3-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
              {VALUES.map(({ icon, title, desc }) => (
                <div key={title} style={{ background: "var(--bg-page)", borderRadius: "var(--radius-lg)", padding: "28px 24px", border: "1.5px solid var(--border-base)", transition: "border-color 0.2s,background 0.2s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background = "var(--primary-pale)"; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background = "var(--bg-page)"; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: 'var(--text-h)', margin: "0 0 8px" }}>{title}</h3>
                  <p style={{ fontSize: "13px", color: 'var(--text-muted)', lineHeight: "1.6", margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM SECTION */}
        <section style={{ padding: "60px 24px", background: "linear-gradient(135deg,var(--bg-page),var(--primary-pale))" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: 'var(--text-h)', margin: "0 0 10px" }}>
                {t('about.teamHeading')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: "15px", margin: 0 }}>
                {t('about.teamSubheading')}
              </p>
            </div>
            <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "24px" }}>
              {TEAM.map(member => <TeamCard key={member.name} {...member}/>)}
            </div>
          </div>
        </section>

        {/* CTA TAGLINE */}
        <section style={{ padding: "80px 24px", background: "linear-gradient(135deg,var(--primary),var(--success))", textAlign: "center" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, color: "white", margin: "0 0 16px" }}>
            {t('about.ctaTitle')}
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.85)", margin: "0 0 32px" }}>
            {t('about.ctaSubtitle')}
          </p>
          <a href="/join" style={{ background: 'var(--bg-card)', color: 'var(--primary)', padding: "14px 40px", borderRadius: "var(--radius-full)", fontWeight: 700, fontSize: "15px", textDecoration: "none", display: "inline-block", transition: "transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
          >
            {t('about.ctaBtn')}
          </a>
        </section>

      </div>
    </PublicLayout>
  );
}
