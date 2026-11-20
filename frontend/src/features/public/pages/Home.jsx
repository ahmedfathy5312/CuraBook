/**
 * features/public/pages/Home.jsx
 * UX FIX v16: Full i18n support via useTranslation (was all hardcoded English)
 * UX FIX v17: Dynamic testimonials from Reviews API
 * UX FIX v21: All remaining hardcoded strings (Arabic & English) replaced with t()
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "../../../layouts/PublicLayout";
import { tokens } from "../../../theme/tokens";
import useTranslation from "../../../i18n/useTranslation";
import useDarkMode from "../../../hooks/useDarkMode";
import publicApiClient from "../../../services/publicApiClient";
import { searchDoctors, getSpecializations, searchKeys } from "../../../features/search/api/searchApi";

import doctorImg    from "../../../assets/Doctor.png";
import iconOpth     from "../../../assets/icon-opth.png";
import iconPed      from "../../../assets/icon-ped.png";
import iconCardio   from "../../../assets/icon-cardio.png";
import iconGastro   from "../../../assets/icon-gastro.png";
import iconDerm     from "../../../assets/icon-derm.png";
import iconOrtho    from "../../../assets/icon-ortho.png";
import iconEnt      from "../../../assets/icon-ent.png";
import iconObgyn    from "../../../assets/icon-obgyn.png";
import iconNeuro    from "../../../assets/icon-neuro.png";
import iconUro      from "../../../assets/icon-uro.png";
import iconOnco     from "../../../assets/icon-onco.png";
import iconEndo     from "../../../assets/icon-endo.png";
import iconNephro   from "../../../assets/icon-nephro.png";
import iconPsych    from "../../../assets/icon-psych.png";
import iconPulmo    from "../../../assets/icon-pulmo.png";
import iconRheumo   from "../../../assets/icon-rheumo.png";
import iconDent     from "../../../assets/icon-dent.png";
import iconGenSurg  from "../../../assets/icon-gensurg.png";
import iconIntMed   from "../../../assets/icon-intmed.png";
import iconRadio    from "../../../assets/icon-radio.png";
import iconAnesth   from "../../../assets/icon-anesth.png";
import iconPlastic  from "../../../assets/icon-plastic.png";
import iconVascular from "../../../assets/icon-vascular.png";
import iconGenPrac  from "../../../assets/icon-genprac.png";
import iconDefault  from "../../../assets/icon-default.png";
import heroBanner   from "../../../assets/hero_banner.jpg";
import doctorsTeam  from "../../../assets/doctors-team.png";
import { ShimmerCard, ShimmerDoctorCard } from "../../../components/ui/Shimmer";
import { SPECIALTY_ICON_MAP_NORMALIZED } from "../../../constants/SPECIALTIES_DATA";

const SPECIALTY_ICON_IMGS = {
  'icon-opth': iconOpth,
  'icon-ped': iconPed,
  'icon-cardio': iconCardio,
  'icon-gastro': iconGastro,
  'icon-derm': iconDerm,
  'icon-ortho': iconOrtho,
  'icon-ent': iconEnt,
  'icon-obgyn': iconObgyn,
  'icon-neuro': iconNeuro,
  'icon-uro': iconUro,
  'icon-onco': iconOnco,
  'icon-endo': iconEndo,
  'icon-nephro': iconNephro,
  'icon-psych': iconPsych,
  'icon-pulmo': iconPulmo,
  'icon-rheumo': iconRheumo,
  'icon-dent': iconDent,
  'icon-gensurg': iconGenSurg,
  'icon-intmed': iconIntMed,
  'icon-radio': iconRadio,
  'icon-anesth': iconAnesth,
  'icon-plastic': iconPlastic,
  'icon-vascular': iconVascular,
  'icon-genprac': iconGenPrac,
  'icon-default': iconDefault,
};

const STATIC_TESTIMONIALS_KEYS = [
  { nameKey: "home.testimonials_list.t1.name", textKey: "home.testimonials_list.t1.text", avatar: "SM", rating: 5 },
  { nameKey: "home.testimonials_list.t2.name", textKey: "home.testimonials_list.t2.text", avatar: "AH", rating: 5 },
  { nameKey: "home.testimonials_list.t3.name", textKey: "home.testimonials_list.t3.text", avatar: "NK", rating: 5 },
];

async function fetchPublicTestimonials() {
  try {
    const { data } = await publicApiClient.get('/reviews/', {
      params: { min_rating: 4, page_size: 6, ordering: '-created_at' },
    });
    const results = data?.results ?? data ?? [];
    if (!Array.isArray(results) || results.length === 0) return STATIC_TESTIMONIALS_KEYS;
    return results.slice(0, 3).map(r => {
      const patient = r.patient_name || r.patient?.full_name || r.patient?.name || 'Patient';
      const initials = patient.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      return {
        nameKey: patient, textKey: r.comment || r.text || '',
        avatar: r.patient_avatar || null, avatarInitials: initials,
        rating: r.rating ?? 5, doctor: r.doctor_name || r.doctor?.full_name || '',
        isApi: true,
      };
    }).filter(t => t.textKey.length > 10);
  } catch {
    return STATIC_TESTIMONIALS_KEYS;
  }
}

function StarRating({ rating, label }) {
  return (
    <div className="flex gap-0.5" aria-label={label} role="img">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width="14" height="14" viewBox="0 0 24 24"
          fill={s <= rating ? "var(--gold)" : 'var(--border)'} stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function SpecialtySkeleton() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
      {Array.from({ length: 8 }).map((_, i) => <ShimmerCard key={i} lines={2} />)}
    </div>
  );
}

const BTN_PRIMARY       = "bg-teal text-white border-0 rounded-full px-7 py-3 text-sm font-semibold cursor-pointer transition-all hover:bg-teal-dark hover:-translate-y-px hover:shadow-hover font-sans";
const BTN_OUTLINE       = "bg-transparent text-teal border-2 border-teal rounded-full px-7 py-3 text-sm font-semibold cursor-pointer transition-all hover:bg-teal hover:text-white font-sans";
const BTN_OUTLINE_WHITE = "bg-transparent text-white border-2 border-white/60 rounded-full px-7 py-3 text-sm font-semibold cursor-pointer transition-all hover:bg-[var(--bg-card)]/15 hover:border-white font-sans";

export default function Home() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { isDark } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/doctors?q=${encodeURIComponent(searchQuery)}` : "/doctors");
  };

  const { data: specializationsData, isLoading: specLoading } = useQuery({
    queryKey: searchKeys.specializations(),
    queryFn:  getSpecializations,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  /* Static specialty list — titles/descs come from translations */
  const STATIC_SPECIALTIES = [
    { img: iconOpth,   id: "ophthalmology" },
    { img: iconPed,    id: "pediatrics"    },
    { img: iconCardio, id: "cardiology"    },
    { img: iconGastro, id: "gastroenterology" },
    { img: iconDerm,   id: "dermatology"   },
    { img: iconOrtho,  id: "orthopedics"   },
    { img: iconEnt,    id: "ent"           },
    { img: iconObgyn,  id: "obgyn"         },
  ];

  const apiSpecialties = specializationsData?.results ?? specializationsData ?? [];
  const specialties = apiSpecialties.length > 0
    ? apiSpecialties.slice(0, 8).map(s => {
        const key = (s.name || s.title || "").toLowerCase();
        const iconKey = SPECIALTY_ICON_MAP_NORMALIZED[key] || 'icon-default';
        return { 
          img: SPECIALTY_ICON_IMGS[iconKey] || iconOpth, 
          title: s.name || s.title, 
          desc: s.description || "" 
        };
      })
    : STATIC_SPECIALTIES.map(s => ({ 
        img: s.img, 
        title: t(`home.specialties_${s.id}_title`), 
        desc: t(`home.specialties_${s.id}_desc`) 
      }));

  const { data: featuredData, isLoading: doctorsLoading } = useQuery({
    queryKey: ["home", "featured-doctors"],
    queryFn:  () => searchDoctors({ sort: "rating_desc", page_size: 4, page: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: testimonials = STATIC_TESTIMONIALS_KEYS, isLoading: testimonialsLoading } = useQuery({
    queryKey: ["home", "public-testimonials"],
    queryFn:  fetchPublicTestimonials,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const apiFeaturedDoctors = featuredData?.results ?? featuredData?.data ?? [];

  const HOW_IT_WORKS = [
    { step: "01", title: t('home.steps.search.title'),  desc: t('home.steps.search.desc')  },
    { step: "02", title: t('home.steps.book.title'),    desc: t('home.steps.book.desc')    },
    { step: "03", title: t('home.steps.confirm.title'), desc: t('home.steps.confirm.desc') },
    { step: "04", title: t('home.steps.visit.title'),   desc: t('home.steps.visit.desc')   },
  ];

  const TRUST_BADGES = [
    { icon: '👨‍⚕️', text: t('home.trustBadges.doctors') },
    { icon: '⭐',    text: t('home.trustBadges.rating')  },
    { icon: '⚡',    text: t('home.trustBadges.booking') },
  ];

  return (
    <>
    <PublicLayout>
    <div className="w-full" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        data-hero
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          position: 'relative',
          padding: 'clamp(48px, 8vw, 100px) clamp(16px, 5vw, 80px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '48px', flexWrap: 'wrap', minHeight: '520px',
          overflow: 'hidden'
        }}>
        
        {/* Background Image & Glass Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url(${heroBanner})`, backgroundSize: 'cover', backgroundPosition: 'center',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: isDark
            ? 'linear-gradient(135deg, rgba(15,17,23,0.88) 0%, rgba(26,29,38,0.75) 100%)'
            : 'linear-gradient(135deg, rgba(234,244,251,0.82) 0%, rgba(240,248,252,0.55) 100%)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          zIndex: 0
        }} />

        <div style={{ 
          flex: 1, minWidth: '280px', maxWidth: '600px', 
          position: 'relative', zIndex: 1,
          background: isDark ? 'rgba(26, 29, 38, 0.85)' : 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(24px, 4vw, 40px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)'
        }}>

          {/* Social Proof Bar */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-pill)',
            padding: '6px 14px', marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', marginInlineEnd: '4px' }}>
              {['var(--primary)','var(--primary)','var(--accent)'].map((c, i) => (
                <div key={i} style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: c, border: '2px solid var(--bg-card)',
                  marginInlineStart: '-6px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '9px', color: 'white', fontWeight: 700,
                }}>
                  {isRTL ? ['م','د','أ'][i] : ['P','D','A'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, fontFamily: 'Cairo, sans-serif', paddingInlineStart: '8px' }}>
              {t('home.socialProof')}
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 800,
            color: 'var(--text-h)', lineHeight: 1.35, marginBottom: '16px',
            fontFamily: 'Cairo, sans-serif',
          }}>
            {t('home.heroTitle')} 🩺<br />
            <span style={{ color: 'var(--primary)' }}>{t('home.heroSubtitle')}</span>
          </h1>

          <p style={{
            fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.8,
            marginBottom: '28px', fontFamily: 'Cairo, sans-serif',
          }}>
            {t('home.heroPara')}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--bg-card)', border: '1.5px solid var(--border-base)',
              borderRadius: 'var(--radius-md)', padding: '6px 6px 6px 16px',
              maxWidth: '480px', boxShadow: 'var(--shadow-md)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke='var(--text-hint)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, marginInlineEnd: '8px' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                name="search_by_doctor_name_specialty"
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label={t('home.searchPlaceholder')}
                autoComplete="off"
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '14px',
                  color: 'var(--text-h)', background: 'transparent',
                  fontFamily: 'Cairo, sans-serif', padding: '8px',
                }}
              />
              <button type="submit" style={{
                background: 'var(--primary)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
                whiteSpace: 'nowrap', transition: 'background 0.18s',
                boxShadow: 'var(--shadow-sm)',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--primary-dark)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--primary)'}
              >
                {t('home.searchBtn')}
              </button>
            </div>
          </form>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/doctors">
              <button style={{
                background: 'var(--primary)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '13px 28px', fontSize: '14px',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.18s ease',
              }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--primary-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'none'; }}
              >
                {t('home.bookBtn')}
              </button>
            </Link>
            <Link to="/join">
              <button style={{
                background: 'transparent', color: 'var(--primary)',
                border: '1.5px solid var(--primary)', borderRadius: 'var(--radius-md)',
                padding: '12px 24px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
                transition: 'all 0.18s ease',
              }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--primary-pale)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {t('home.joinDoctorBtn')}
              </button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '24px', flexWrap: 'wrap' }}>
            {TRUST_BADGES.map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Cairo, sans-serif', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <div style={{ flexBasis: '340px', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <img
            src={doctorImg}
            alt="CuraBook Doctor"
            fetchpriority="high"
            style={{
              width: '100%', maxWidth: '300px', objectFit: 'contain',
              filter: 'drop-shadow(0 16px 40px rgba(11,79,108,0.25))',
            }}
          />
        </div>
      </section>

      {/* ── SPECIALTIES ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-10 md:px-20 py-16 bg-[var(--bg-card)]">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-10"
          style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)", color: 'var(--text-h)' }}>
          {t('home.specialties')}
        </h2>
        {specLoading ? <SpecialtySkeleton /> : (
          <div className="grid gap-5 max-w-[1100px] mx-auto"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {specialties.map((item, i) => (
              <Link key={i} to={`/doctors?specialty=${encodeURIComponent(item.title)}`}
                className="border border-gray-200 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-3 bg-[var(--bg-card)] no-underline hover:border-teal hover:shadow-[0_8px_24px_rgba(27,94,138,0.12)] hover:-translate-y-1"
                style={{ textDecoration: "none", color: "inherit", borderColor: 'var(--border)', minHeight: '180px', justifyContent: 'center' }}>
                <img src={item.img} className="w-14 h-14 object-contain mb-1" alt={item.title} />
                <h3 style={{ color: 'var(--text-h)', margin: 0 }} className="text-sm font-semibold">{item.title}</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, overflowWrap: 'anywhere' }} className="text-xs leading-snug">{item.desc}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
  
      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-10 md:px-20 py-16"
        style={{ background: 'var(--section-bg-alt)' }}>
        <div className="text-center mb-12">
          <h2 className="font-bold mb-2" style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)", color: 'var(--text-h)' }}>
            {t('home.howItWorks')}
          </h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">{t('home.howSubtitle')}</p>
        </div>
        <div className="grid gap-6 max-w-[1100px] mx-auto"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {HOW_IT_WORKS.map((item, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-2xl p-8 text-center shadow-card transition-transform hover:-translate-y-1 hover:shadow-hover">
              <div className="inline-flex w-11 h-11 rounded-full bg-teal text-white items-center justify-center text-base font-bold mb-4">
                {item.step}
              </div>
              <h3 style={{ color: 'var(--text-h)' }} className="text-base font-semibold mb-2">{item.title}</h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED DOCTORS ──────────────────────────────────────────────── */}
      <section className="px-4 sm:px-10 md:px-20 py-16 bg-[var(--bg-card)]">
        <div className="text-center mb-12">
          <h2 className="font-bold mb-2" style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)", color: 'var(--text-h)' }}>
            {t('home.featuredDoctors')}
          </h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">{t('home.featuredSubtitle')}</p>
        </div>
        <div className="grid gap-6 max-w-[1100px] mx-auto"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {doctorsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ShimmerDoctorCard key={i} />)
          ) : apiFeaturedDoctors.length > 0 ? (
            apiFeaturedDoctors.map((doc, i) => {
              const name    = doc.full_name || doc.name || "Doctor";
              const spec    = doc.specialty  || doc.doctor_specialty || "Specialist";
              const exp     = doc.years_experience ? `${doc.years_experience} ${t('home.expLabel')}` : null;
              const city    = doc.city || doc.location || "";
              const rating  = parseFloat(doc.average_rating ?? doc.rating ?? 0);
              const reviews = doc.reviews_count ?? doc.reviews ?? 0;
              const initials = name.split(" ").slice(1).map(n => n[0]).join("").toUpperCase().slice(0,2) || name[0];
              return (
                <div key={doc.id ?? i}
                  className="border border-gray-200 rounded-2xl p-7 text-center transition-all flex flex-col gap-1.5 items-center bg-[var(--bg-card)] hover:border-teal hover:shadow-[0_8px_28px_rgba(27,94,138,0.12)] hover:-translate-y-1">
                  {doc.avatar ? (
                    <img src={doc.avatar} alt={name}
                      className="w-16 h-16 rounded-full object-cover mb-2 ring-2 ring-teal-light" />
                  ) : (
                    <div className="w-16 h-16 rounded-full text-white flex items-center justify-center text-xl font-bold mb-2"
                      style={{ background: `linear-gradient(135deg, ${tokens?.colors?.primary?.DEFAULT || '#0E7490'}, ${tokens?.colors?.success?.DEFAULT || '#31A870'})` }}>
                      {initials}
                    </div>
                  )}
                  <h3 style={{ color: 'var(--text-h)' }} className="text-base font-semibold">{name}</h3>
                  <p className="text-sm font-medium text-teal">{spec}</p>
                  {exp  && <p className="text-xs text-gray-500">{exp}</p>}
                  {city && <p className="text-xs text-gray-400">📍 {city}</p>}
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={Math.round(rating)} label={`${rating} / 5`} />
                    <span className="text-sm font-semibold text-gray-800">{rating > 0 ? rating.toFixed(1) : "—"}</span>
                    {reviews > 0 && <span className="text-xs text-gray-400">({reviews})</span>}
                  </div>
                  <Link to={doc.id ? `/book/${doc.id}` : "/doctors"} className="w-full mt-2">
                    <button className="w-full bg-teal text-white border-0 rounded-full py-2.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-teal-dark font-sans">
                      {t('doctors.bookNow')}
                    </button>
                  </Link>
                </div>
              );
            })
          ) : (
            /* Static fallback doctors */
            [
              { name: "Dr. Manar Ali",   spec: "Pediatrics",       exp: `5 ${t('home.expLabel')}`,  city: "Assuit", rating: 4.9, reviews: 120, initials: "MA" },
              { name: "Dr. Ahmad Taher", spec: "Gastroenterology", exp: `20 ${t('home.expLabel')}`, city: "Giza",   rating: 4.8, reviews: 98,  initials: "AT" },
              { name: "Dr. Hasan Ahmed", spec: "Dermatology",      exp: `12 ${t('home.expLabel')}`, city: "Cairo",  rating: 4.7, reviews: 145, initials: "HA" },
              { name: "Dr. Hor Gamal",   spec: "Dentist",          exp: `10 ${t('home.expLabel')}`, city: "Minya",  rating: 4.6, reviews: 87,  initials: "HG" },
            ].map((doc, i) => (
              <div key={i}
                className="border border-gray-200 rounded-2xl p-7 text-center transition-all flex flex-col gap-1.5 items-center bg-[var(--bg-card)] hover:border-teal hover:shadow-[0_8px_28px_rgba(27,94,138,0.12)] hover:-translate-y-1">
                <div className="w-16 h-16 rounded-full text-white flex items-center justify-center text-xl font-bold mb-2"
                  style={{ background: `linear-gradient(135deg, ${tokens?.colors?.primary?.DEFAULT || '#0E7490'}, ${tokens?.colors?.success?.DEFAULT || '#31A870'})` }}>
                  {doc.initials}
                </div>
                <h3 className="text-base font-semibold text-gray-800">{doc.name}</h3>
                <p className="text-sm font-medium text-teal">{doc.spec}</p>
                <p className="text-xs text-gray-500">{doc.exp}</p>
                <p className="text-xs text-gray-400">📍 {doc.city}</p>
                <div className="flex items-center gap-1.5">
                  <StarRating rating={Math.round(doc.rating)} label={`${doc.rating} / 5`} />
                  <span className="text-sm font-semibold text-gray-800">{doc.rating}</span>
                  <span className="text-xs text-gray-400">({doc.reviews})</span>
                </div>
                <Link to="/doctors" className="w-full mt-2">
                  <button className="w-full bg-teal text-white border-0 rounded-full py-2.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-teal-dark font-sans">
                    {t('doctors.bookNow')}
                  </button>
                </Link>
              </div>
            ))
          )}
        </div>
        <div className="text-center mt-8">
          <Link to="/doctors"><button className={BTN_OUTLINE}>{t('home.viewAll')}</button></Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-10 md:px-20 py-16 bg-[var(--bg)]">
        <div className="text-center mb-12">
          <h2 className="font-bold mb-2" style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)", color: 'var(--text-h)' }}>
            {t('home.testimonials')}
          </h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">{t('home.testimonialsSubtitle')}</p>
        </div>
        <div className="grid gap-6 max-w-[1100px] mx-auto"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {testimonialsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
              ))
            : testimonials.map((item, i) => (
              <div key={i}
                className="bg-[var(--bg-card)] p-7 transition-transform hover:-translate-y-1"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  borderInlineStart: '4px solid var(--primary)',
                  boxShadow: 'var(--shadow-card)',
                }}>
                <div className="flex items-center gap-3 mb-4">
                  {item.avatar && !item.avatarInitials ? (
                    <img src={item.avatar} alt={item.nameKey}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-teal-light text-teal flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.avatarInitials || item.avatar || (item.isApi ? item.nameKey?.slice(0,2).toUpperCase() : t(item.nameKey).slice(0,2).toUpperCase())}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{item.isApi ? item.nameKey : t(item.nameKey)}</p>
                    <StarRating rating={item.rating} label={`${item.rating} / 5`} />
                    {item.doctor && (
                      <p className="text-xs text-gray-400 mt-0.5">{t('home.about_label')} {item.doctor}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">"{item.isApi ? item.textKey : t(item.textKey)}"</p>
              </div>
            ))
          }
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-10 md:px-20 py-16"
        style={{ background: `linear-gradient(135deg, ${tokens?.colors?.primary?.DEFAULT || '#0E7490'} 0%, ${tokens?.colors?.primary?.dark || '#0C6478'} 100%)` }}>
        <div className="flex items-center gap-16 max-w-[1100px] mx-auto flex-wrap">
          <img src={doctorsTeam} alt="Doctors Team" className="w-48 md:w-64 object-contain filter drop-shadow-lg" />
          <div className="flex-1">
            <h2 className="font-bold text-white mb-3" style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)" }}>
              {t('home.ctaTitle')}
            </h2>
            <p className="text-teal-light text-sm mb-6 leading-relaxed">{t('home.ctaSubtitle')}</p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/join"><button className={BTN_PRIMARY}>{t('home.getStarted')}</button></Link>
              <Link to="/About-Us"><button className={BTN_OUTLINE_WHITE}>{t('home.learnMore')}</button></Link>
            </div>
          </div>
        </div>
      </section>

    </div>
    </PublicLayout>
    </>
  );
}
