from rest_framework import serializers
from .models import FeeCategory, Invoice, InvoiceItem, Payment

class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = '__all__'

class InvoiceItemSerializer(serializers.ModelSerializer):
    fee_category_name = serializers.CharField(source='fee_category.name', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    term_name = serializers.CharField(source='term.name', read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
