# CuraBook Fix G — Add full_name_en to User model
# Generated manually for bilingual name display fix
# Depends on: 0003_rename_accounts_user_username_idx...

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_rename_accounts_user_username_idx_accounts_us_usernam_c0ea66_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='full_name_en',
            field=models.CharField(
                blank=True,
                null=True,
                max_length=255,
                help_text='Latin/English name for English UI display',
            ),
        ),
    ]
