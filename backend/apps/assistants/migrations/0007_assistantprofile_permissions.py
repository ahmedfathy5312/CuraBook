from django.db import migrations, models


def populate_permissions(apps, schema_editor):
    AssistantProfile = apps.get_model('assistants', 'AssistantProfile')
    for profile in AssistantProfile.objects.all().iterator():
        profile.permissions = {
            'manage_appointments': bool(profile.can_manage_appointments),
            'view_patient_records': True,
            'edit_patient_records': bool(profile.can_upload_documents),
            'write_prescriptions': False,
            'message_patients': True,
            'view_financial': False,
            'edit_schedule': bool(profile.can_edit_schedule),
        }
        profile.save(update_fields=['permissions'])


class Migration(migrations.Migration):
    dependencies = [('assistants', '0006_alter_assistantshift_created_at_and_more')]
    operations = [
        migrations.AddField(
            model_name='assistantprofile',
            name='permissions',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(populate_permissions, migrations.RunPython.noop),
    ]