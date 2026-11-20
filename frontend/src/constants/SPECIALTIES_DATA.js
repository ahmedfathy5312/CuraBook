// /src/constants/SPECIALTIES_DATA.js
// Single Source of Truth للتخصصات الطبية

export const SPECIALTIES = [
  { value: 'cardiology',        ar: 'أمراض القلب والأوعية الدموية', en: 'Cardiology'        },
  { value: 'neurology',         ar: 'طب الأعصاب',                   en: 'Neurology'         },
  { value: 'orthopedics',       ar: 'جراحة العظام والمفاصل',        en: 'Orthopedics'       },
  { value: 'pediatrics',        ar: 'طب الأطفال',                   en: 'Pediatrics'        },
  { value: 'dermatology',       ar: 'أمراض الجلدية',                en: 'Dermatology'       },
  { value: 'ophthalmology',     ar: 'طب وجراحة العيون',             en: 'Ophthalmology'     },
  { value: 'ent',               ar: 'أنف وأذن وحنجرة',             en: 'ENT'               },
  { value: 'gastroenterology',  ar: 'الجهاز الهضمي',                en: 'Gastroenterology'  },
  { value: 'gynecology',        ar: 'أمراض النساء والتوليد',        en: 'OB/GYN'            },
  { value: 'urology',           ar: 'المسالك البولية',               en: 'Urology'           },
  { value: 'oncology',          ar: 'الأورام',                       en: 'Oncology'          },
  { value: 'endocrinology',     ar: 'الغدد الصماء والسكر',          en: 'Endocrinology'     },
  { value: 'nephrology',        ar: 'أمراض الكلى',                  en: 'Nephrology'        },
  { value: 'psychiatry',        ar: 'الطب النفسي',                  en: 'Psychiatry'        },
  { value: 'pulmonology',       ar: 'أمراض الصدر والتنفس',          en: 'Pulmonology'       },
  { value: 'rheumatology',      ar: 'الروماتيزم',                    en: 'Rheumatology'      },
  { value: 'dentistry',         ar: 'طب الأسنان',                   en: 'Dentistry'         },
  { value: 'general_surgery',   ar: 'الجراحة العامة',               en: 'General Surgery'   },
  { value: 'internal_medicine', ar: 'الباطنة',                       en: 'Internal Medicine' },
  { value: 'radiology',         ar: 'الأشعة والتصوير الطبي',        en: 'Radiology'         },
  { value: 'anesthesiology',    ar: 'التخدير والعناية المركزة',     en: 'Anesthesiology'    },
  { value: 'plastic_surgery',   ar: 'الجراحة التجميلية',            en: 'Plastic Surgery'   },
  { value: 'vascular_surgery',  ar: 'جراحة الأوعية الدموية',       en: 'Vascular Surgery'  },
  { value: 'general_practice',  ar: 'طب عام',                       en: 'General Practice'  },
  { value: 'other',             ar: 'تخصص آخر',                     en: 'Other Specialty'   },
];

// Map الـ value للـ icon key في الـ Home
export const SPECIALTY_ICON_MAP_NORMALIZED = {
  cardiology:       'icon-cardio',
  neurology:        'icon-neuro',
  orthopedics:      'icon-ortho',
  pediatrics:       'icon-ped',
  dermatology:      'icon-derm',
  ophthalmology:    'icon-opth',
  ent:              'icon-ent',
  gastroenterology: 'icon-gastro',
  gynecology:       'icon-obgyn',
  urology:          'icon-uro',
  oncology:         'icon-onco',
  endocrinology:    'icon-endo',
  nephrology:       'icon-nephro',
  psychiatry:       'icon-psych',
  pulmonology:      'icon-pulmo',
  rheumatology:     'icon-rheumo',
  dentistry:        'icon-dent',
  general_surgery:  'icon-gensurg',
  internal_medicine:'icon-intmed',
  radiology:        'icon-radio',
  anesthesiology:   'icon-anesth',
  plastic_surgery:  'icon-plastic',
  vascular_surgery: 'icon-vascular',
  general_practice: 'icon-genprac',
  other:            'icon-default',
};

// Map للعرض العربي في الـ Home
export const SPECIALTY_AR_MAP = Object.fromEntries(
  SPECIALTIES.map(s => [s.value, s.ar])
);

// Map للعرض الإنجليزي
export const SPECIALTY_EN_MAP = Object.fromEntries(
  SPECIALTIES.map(s => [s.value, s.en])
);
