import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):

    class ProfessionalField(models.TextChoices):
        SOFTWARE_ENGINEERING  = 'Software Engineer',         'Software Engineer'
        DATA_SCIENCE          = 'Data Scientist',            'Data Scientist'
        PRODUCT_MANAGEMENT    = 'Product Manager',           'Product Manager'
        CYBERSECURITY         = 'Cybersecurity Analyst',     'Cybersecurity Analyst'
        DEVOPS                = 'DevOps Engineer',           'DevOps Engineer'
        AI_ML                 = 'AI/ML Engineer',            'AI/ML Engineer'
        CIVIL_ENGINEERING     = 'Civil Engineer',            'Civil Engineer'
        MECHANICAL_ENGINEERING= 'Mechanical Engineer',       'Mechanical Engineer'
        ELECTRICAL_ENGINEERING= 'Electrical Engineer',       'Electrical Engineer'
        CHEMICAL_ENGINEERING  = 'Chemical Engineer',         'Chemical Engineer'
        ELECTRONICS           = 'Electronics Engineer',      'Electronics Engineer'
        BIOMEDICAL            = 'Biomedical Engineer',       'Biomedical Engineer'
        FINANCE               = 'Finance & Accounting',      'Finance & Accounting'
        MARKETING             = 'Marketing & Sales',         'Marketing & Sales'
        HUMAN_RESOURCES       = 'Human Resources',           'Human Resources'
        HEALTHCARE            = 'Healthcare / Medicine',     'Healthcare / Medicine'
        LAW                   = 'Law / Legal',               'Law / Legal'
        EDUCATION             = 'Education / Teaching',      'Education / Teaching'
        ARCHITECTURE          = 'Architecture & Design',     'Architecture & Design'
        BUSINESS              = 'Business Management',       'Business Management'

    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    professional_field = models.CharField(
        max_length=60,
        choices=ProfessionalField.choices,
        default=ProfessionalField.SOFTWARE_ENGINEERING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return self.email
