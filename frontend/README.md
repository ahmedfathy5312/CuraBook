# CuraBook Frontend — Production-Ready React App

## Overview
CuraBook is a full-featured healthcare booking platform built with React 18, React Query v5, and WebSockets. It supports 5 user roles: Patient, Doctor, Hospital Admin, Assistant, and System Admin.

---

## Architecture

```
src/
├── app/
│   ├── queryClient.js         # React Query config
│   ├── ErrorBoundary.jsx      # Global crash handler
│   └── guards/
│       ├── AuthGuard.jsx      # Unauthenticated → /login
│       └── RoleGuard.jsx      # Role-based access control
│
├── features/
│   ├── auth/                  # AuthProvider, useAuth
│   ├── patient/               # Patient pages + hooks
│   ├── doctors/               # Search, profile, availability, booking
│   ├── appointments/          # Booking flow
│   ├── assistant/             # Merged dashboard + approve/reject
│   ├── hospital/              # Hospital admin dashboard
│   ├── admin/                 # System admin panel
│   └── notifications/         # NotificationBell + panel
│
├── services/
│   ├── apiClient.js           # Axios + JWT + auto refresh
│   ├── socketManager.js       # WebSocket singleton + reconnect
│   └── api/
│       ├── authApi.js
│       ├── doctorApi.js
│       ├── appointmentApi.js
│       ├── searchApi.js
│       ├── usersApi.js
│       ├── notificationApi.js
│       ├── scheduleApi.js
│       ├── reviewApi.js
│       ├── dashboardApi.js
│       └── clinicHospitalApi.js
│
├── hooks/
│   ├── useRealtimeNotifications.js
│   ├── useAppointmentSocket.js
│   ├── useDebounce.js
│   ├── usePagination.js
│   └── useQueryParams.js
│
├── components/ui/             # Button, Badge, Modal, Table, Skeleton, etc.
├── layouts/                   # PatientLayout, DoctorLayout, etc.
├── context/                   # AuthContext, ToastContext
├── constants/                 # ROLES, ROUTES, APPOINTMENT_STATUS, WS_EVENTS
├── config/                    # roles.js, routes.js, env.js
├── utils/                     # formatters.js, dateUtils.js, tokenUtils.js
└── theme/tokens.js            # Design system tokens
```

---

## Setup

```bash
npm install
cp .env .env.local
# Edit .env.local with backend URL
npm start
```

### Required .env variables:
```env
REACT_APP_API_URL=http://127.0.0.1:8000/api
REACT_APP_WS_URL=ws://127.0.0.1:8000/ws
```

---

## Authentication Flow

1. `POST /users/login/` → returns `{ access, refresh, user }`
2. Tokens stored in localStorage (keys: `__cb_access`, `__cb_refresh`)
3. Every request auto-attaches JWT via Axios interceptor
4. On 401 → refresh → retry → logout if refresh fails

### Auto-redirect after login:
| Role | Destination |
|------|------------|
| patient | /profile |
| doctor | /doctor-dashboard |
| hospital | /hospital-dashboard |
| assistant | /assistant-dashboard |
| admin | /admin-dashboard |

---

## Realtime System (WebSocket)

**Connection:** `ws://localhost:8000/ws/notifications/?token=JWT`

| Event | Trigger |
|-------|---------|
| `NEW_APPOINTMENT` | Patient booked → assistant notified |
| `APPOINTMENT_APPROVED` | Assistant approved → patient notified |
| `APPOINTMENT_REJECTED` | Assistant rejected → patient notified |
| `APPOINTMENT_REMINDER` | Upcoming reminder |
| `NEW_NOTIFICATION` | General notification |

### Usage:
```jsx
const { connected, unreadCount } = useRealtimeNotifications({
  invalidateAppointments: true,
  onEvent: (n) => toast.info(n.message),
});

// Assistant multi-workplace:
useRealtimeNotifications({
  workplaceIds: ['clinic_1', 'hospital_2'],
  invalidateAppointments: true,
});
```

---

## Booking Flow

```
Patient → selects doctor → picks date → picks slot
→ POST /appointments/ (status: PENDING)
→ optimistic update in UI
→ Assistant sees NEW_APPOINTMENT (realtime)
→ Assistant approves/rejects
→ Patient notified via WebSocket
→ React Query auto-invalidates + UI updates
```

---

## API Services (src/services/api/)

| File | Endpoints |
|------|-----------|
| authApi | login, register, refresh, me, password |
| doctorApi | doctors list, profile, availability, reviews, schedule |
| appointmentApi | book, cancel, approve, reject, assistant dashboard |
| searchApi | advanced doctor/hospital search with filters |
| usersApi | patient/doctor profile, prescriptions |
| notificationApi | list, mark read, delete |
| scheduleApi | doctor schedule, working hours, slots |
| reviewApi | add/get doctor reviews |
| dashboardApi | stats for all roles |
| clinicHospitalApi | hospital/clinic listing and details |

---

## Dashboard Features

| Role | Available Features |
|------|--------------------|
| **Patient** | Find doctors (advanced search), book appointments, view prescriptions, notifications, profile |
| **Doctor** | Today schedule, patient list, appointment approve/cancel, prescriptions, realtime new bookings |
| **Hospital Admin** | Manage doctors (add/remove), view appointments, specialty analytics, KPI charts |
| **Assistant** | Merged appointments table (multi-workplace), approve/reject with reason, filters, realtime |
| **System Admin** | Stats (hospitals/doctors/patients/appointments), toggle hospital/doctor, audit logs |

---

## Security

- All protected routes use `AuthGuard` + `RoleGuard`
- Role mismatch → redirected to role's home page (not 403)
- JWT auto-refresh on expiry
- WebSocket uses JWT in query param
- No hardcoded URLs (all from `config/env.js`)

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| React Router v7 | Routing + lazy loading |
| @tanstack/react-query v5 | Data fetching, caching, optimistic updates |
| Axios | HTTP client with interceptors |
| MUI v7 | Some legacy UI components |
| Framer Motion | Animations |
| Lucide React | Icons |

---

*CuraBook Frontend — Built for Egyptian healthcare*
