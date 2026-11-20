# CuraBook 🏥

CuraBook is a **production-oriented medical appointment booking platform** built with **Django & Django REST Framework**.
The project is designed with **clean architecture**, **real-world healthcare workflows**, and **scalability** in mind.

It is not a basic CRUD project — it models how real hospitals, clinics, doctors, and patients interact in a booking ecosystem.

---

## ✨ Core Features

### 👥 User Management

* Custom User model
* JWT Authentication
* Role-based system:

  * Patient
  * Doctor
  * Assistant
  * Hospital Admin
* Separate profiles per role
* Secure permissions & access control

### 🏥 Hospitals & Clinics

* Multi-hospital support
* Clinics linked to hospitals
* Doctors assigned to clinics
* Ownership & access rules enforced

### 🗓️ Scheduling (Availability Engine)

* Doctor availability generation
* Slot-based scheduling system
* Separation between availability & booking
* Prevents double-booking

### 📅 Appointments

* Patient appointment booking
* Appointment lifecycle:

  * Pending
  * Confirmed
  * Cancelled
  * Completed
* Tight integration with scheduling engine

### 🔐 Security

* JWT-based authentication
* Role & object-level permissions
* Data isolation per user role

---

## 🧠 System Design Philosophy

* **App-based separation of concerns**
* Business logic isolated in services
* Clean, readable, and maintainable code
* Designed for real-world expansion

This project intentionally avoids monolithic design and tightly coupled logic.

---

## 📂 Project Structure

```
CuraBook/
├── users/          # Custom user model & profiles
├── hospitals/      # Hospital management
├── clinics/        # Clinics & doctor assignments
├── scheduling/     # Availability engine & slots
├── appointments/   # Booking & appointment lifecycle
├── notifications/  # (Planned) Email/SMS notifications
├── config/         # Project settings
└── manage.py
```

---

## 🛠️ Tech Stack

* Python 3
* Django
* Django REST Framework
* Simple JWT
* PostgreSQL (recommended)
* RESTful API design

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/7luffyzoro7-bit/CuraBook-backend.git
cd CuraBook
```

### 2️⃣ Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # Linux / Mac
venv\Scripts\activate     # Windows
```

### 3️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

### 4️⃣ Environment variables

Create a `.env` file and configure:

```
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=postgres://...
```

### 5️⃣ Apply migrations

```bash
python manage.py migrate
```

### 6️⃣ Run the server

```bash
python manage.py runserver
```

---

## 🔮 Future Improvements

* Notifications system (Email / SMS)
* Appointment reminders
* Rescheduling & cancellation policies
* Audit logs
* Docker support
* Automated tests
* Admin dashboard enhancements

---

## 📌 Why This Project Matters

This project demonstrates:

* Advanced Django architecture
* Real-world domain modeling
* Clean separation of responsibilities
* Scalable backend design

It is suitable for:

* Portfolio showcase
* Graduation project
* Startup MVP foundation

---

## 👨‍💻 Author

Developed by **madara**
Backend Developer | Django | REST APIs

---

## ⭐ Final Note

If you're reviewing this project, focus on **architecture & logic**, not just endpoints.
CuraBook is built to grow.
