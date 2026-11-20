from django.core.exceptions import ValidationError
from .models import Department


def create_department(hospital, name: str, description: str = "") -> Department:
    if Department.objects.filter(hospital=hospital, name=name).exists():
        raise ValidationError(f"Department '{name}' already exists in this hospital.")
    return Department.objects.create(hospital=hospital, name=name, description=description)


def update_department(dept: Department, data: dict) -> Department:
    for field in ("name", "description", "is_active"):
        if field in data:
            setattr(dept, field, data[field])
    dept.full_clean()
    dept.save()
    return dept
