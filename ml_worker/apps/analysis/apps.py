"""
ML Worker — Analysis app
==========================
This is where the ACTUAL task implementations live (in tasks.py).
The models here are identical to the backend — the worker writes results
directly to the same PostgreSQL database.
"""
from django.apps import AppConfig

class AnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.analysis'
