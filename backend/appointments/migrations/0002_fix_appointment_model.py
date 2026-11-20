import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0001_initial'),
        ('scheduling',   '0002_schedule_generatedslot_clinic_hospital'),
        ('hospital',     '0002_hospitalassistant'),
        ('clinics',      '0002_clinicassistant'),
    ]

    operations = [
        # Make hospital nullable (clinic-only bookings)
        migrations.AlterField(
            model_name='appointment',
            name='hospital',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='appointments',
                to='hospital.hospital'
            ),
        ),
        # Make clinic nullable (hospital-only bookings)
        migrations.AlterField(
            model_name='appointment',
            name='clinic',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='appointments',
                to='clinics.clinic'
            ),
        ),
        # Add REJECTED to status choices
        migrations.AlterField(
            model_name='appointment',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('CONFIRMED', 'Confirmed'),
                    ('REJECTED', 'Rejected'),
                    ('CANCELLED', 'Cancelled'),
                    ('COMPLETED', 'Completed'),
                    ('RESCHEDULE_REQUESTED', 'Reschedule Requested'),
                ],
                default='PENDING',
                max_length=30,
            ),
        ),
        # Add visit_type field
        migrations.AddField(
            model_name='appointment',
            name='visit_type',
            field=models.CharField(
                choices=[('IN_PERSON', 'In Person'), ('ONLINE', 'Online')],
                default='IN_PERSON',
                max_length=20,
            ),
        ),
        # Add rejection_reason field
        migrations.AddField(
            model_name='appointment',
            name='rejection_reason',
            field=models.TextField(blank=True, null=True),
        ),
        # Add DB constraint: clinic XOR hospital
        migrations.AddConstraint(
            model_name='appointment',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(clinic__isnull=False, hospital__isnull=True) |
                    models.Q(clinic__isnull=True, hospital__isnull=False)
                ),
                name='appointment_location_xor',
            ),
        ),
        # Add index on status + expires_at
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['status', 'expires_at'], name='appt_status_exp_idx'),
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['hospital'], name='appt_hospital_idx'),
        ),
        # Make old_status in AppointmentHistory allow blank
        migrations.AlterField(
            model_name='appointmenthistory',
            name='old_status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('PENDING', 'Pending'), ('CONFIRMED', 'Confirmed'),
                    ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
                    ('COMPLETED', 'Completed'), ('RESCHEDULE_REQUESTED', 'Reschedule Requested'),
                ],
                max_length=30,
            ),
        ),
    ]
