from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='professional_field',
            field=models.CharField(
                choices=[
                    ('Software Engineer', 'Software Engineer'),
                    ('Data Scientist', 'Data Scientist'),
                    ('Product Manager', 'Product Manager'),
                    ('Cybersecurity Analyst', 'Cybersecurity Analyst'),
                    ('DevOps Engineer', 'DevOps Engineer'),
                    ('AI/ML Engineer', 'AI/ML Engineer'),
                    ('Civil Engineer', 'Civil Engineer'),
                    ('Mechanical Engineer', 'Mechanical Engineer'),
                    ('Electrical Engineer', 'Electrical Engineer'),
                    ('Chemical Engineer', 'Chemical Engineer'),
                    ('Electronics Engineer', 'Electronics Engineer'),
                    ('Biomedical Engineer', 'Biomedical Engineer'),
                    ('Finance & Accounting', 'Finance & Accounting'),
                    ('Marketing & Sales', 'Marketing & Sales'),
                    ('Human Resources', 'Human Resources'),
                    ('Healthcare / Medicine', 'Healthcare / Medicine'),
                    ('Law / Legal', 'Law / Legal'),
                    ('Education / Teaching', 'Education / Teaching'),
                    ('Architecture & Design', 'Architecture & Design'),
                    ('Business Management', 'Business Management'),
                ],
                db_index=True,
                default='Software Engineer',
                max_length=60,
            ),
        ),
    ]
