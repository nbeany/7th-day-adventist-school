from rest_framework import serializers
from .models import SchoolConfig, Announcement

class SchoolConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolConfig
        fields = '__all__'

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'image', 'target_audience', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at']
