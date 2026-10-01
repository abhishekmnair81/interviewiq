import re
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'full_name', 'professional_field', 'password', 'password_confirm')

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized_email

    def validate_password(self, value):
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            professional_field=validated_data.get('professional_field', 'Software Engineer'),
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        if not email or not password:
            raise serializers.ValidationError("Email and password are required.")

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        if not user.is_active:
            raise serializers.ValidationError("Your account is inactive")

        attrs['user'] = user
        return attrs

class UserProfileSerializer(serializers.ModelSerializer):
    has_resume = serializers.SerializerMethodField()
    resume_filename = serializers.SerializerMethodField()
    resume_summary = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'professional_field', 'created_at',
            'has_resume', 'resume_filename', 'resume_uploaded_at', 'resume_summary'
        )
        read_only_fields = (
            'id', 'email', 'created_at',
            'has_resume', 'resume_filename', 'resume_uploaded_at', 'resume_summary'
        )

    def get_has_resume(self, obj):
        # "Has resume" must mean the resume is actually usable for a live
        # interview, i.e. it was parsed into highlights. A raw uploaded file
        # that failed to parse (empty highlights) is NOT enough — the interview
        # setup gates the "Begin" button on this flag, and session creation +
        # the WebSocket consumer both require parsed highlights. Keying off the
        # file alone let users start an interview that then hard-fails with 400.
        return bool(obj.resume_text and obj.resume_highlights)

    def get_resume_filename(self, obj):
        return obj.resume_file.name.split('/')[-1] if obj.resume_file else None

    def get_resume_summary(self, obj):
        if obj.resume_highlights:
            skills = obj.resume_highlights.get('skills', [])
            return {
                "skills": skills[:5],
                "experience_count": len(obj.resume_highlights.get('experience', [])),
                "project_count": len(obj.resume_highlights.get('projects', []))
            }
        return None
