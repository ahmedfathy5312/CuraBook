from rest_framework import serializers
from reports.models import Report


class ReportSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    view_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = (
            'id', 'type', 'name', 'doctor_name', 'date', 'size', 'icon',
            'file', 'view_url', 'download_url',
        )

    def get_date(self, obj):
        return obj.created_at.strftime('%Y-%m-%d')

    def _content_url(self, obj, download=False):
        suffix = '?download=1' if download else ''
        return f'/reports/{obj.pk}/content/{suffix}'

    def get_view_url(self, obj):
        return self._content_url(obj)

    def get_download_url(self, obj):
        return self._content_url(obj, download=True)