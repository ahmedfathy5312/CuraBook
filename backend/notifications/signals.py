"""Notification app signals.

Appointment lifecycle notifications are owned exclusively by
``appointments.signals.handle_appointment_change``. Keeping a second
Appointment ``post_save`` receiver here created duplicate patient rows for
confirmations and cancellations (one typed notification and one SYSTEM row).
"""

# Intentionally no Appointment post_save receiver in this app.