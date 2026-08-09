"""
SmartQuestionSelector
=====================
Core logic for delivering unique interview questions to each user, ensuring:

  1. Different users get different questions (randomised pool draw).
  2. Repeat users never receive the same question twice until the *entire* pool
     for that (job_role, category, difficulty) combination has been exhausted.
  3. When the pool is exhausted the history for that user+combination resets
     automatically so continued practice remains varied.

All DB access is synchronous — wrap in database_sync_to_async when calling
from an async context (e.g. Django Channels consumers).
"""

import logging
import random
from typing import List, Optional

from django.db import transaction

from apps.sessions.models import InterviewSession, QuestionBank, UserQuestionHistory

logger = logging.getLogger(__name__)

class SmartQuestionSelector:
    """
    Selects a batch of unique QuestionBank entries for a given user,
    honouring (job_role, category, difficulty) scoping and per-user history.
    """

    def __init__(
        self,
        user,
        job_role: str,
        category: str,
        difficulty: str,
        session: Optional[InterviewSession] = None,
    ):
        self.user = user
        self.job_role = job_role.strip()
        self.category = category.strip().lower()
        self.difficulty = difficulty.strip().lower()
        self.session = session

    def select_questions(self, count: int = 5) -> List[QuestionBank]:
        """
        Return *count* unseen QuestionBank entries for this user.
        Marks each as served and increments the global times_served counter.
        Falls back to a fresh pool rotation if the bank is exhausted.
        """
        pool = self._get_active_pool()
        if not pool.exists():
            logger.warning(
                "QuestionBank is empty for role=%s category=%s difficulty=%s — "
                "returning empty list.",
                self.job_role,
                self.category,
                self.difficulty,
            )
            return []

        unseen = self._filter_unseen(pool)

        if unseen.count() < count:
            logger.info(
                "Pool exhausted for user=%s role=%s category=%s difficulty=%s — "
                "resetting history for fresh rotation.",
                getattr(self.user, "email", self.user),
                self.job_role,
                self.category,
                self.difficulty,
            )
            self._reset_history()
            unseen = self._filter_unseen(pool)

        selected = self._random_sample(unseen, count)
        self._mark_served(selected)
        return selected

    def get_question_texts(self, count: int = 5) -> List[str]:
        """Convenience wrapper — returns plain text strings."""
        return [q.text for q in self.select_questions(count)]

    def _get_active_pool(self):
        """QuerySet of all active questions for this (role, category, difficulty)."""
        return QuestionBank.objects.filter(
            job_role__iexact=self.job_role,
            category=self.category,
            difficulty=self.difficulty,
            is_active=True,
        )

    def _get_seen_ids(self):
        """Set of QuestionBank UUIDs already served to this user."""
        return set(
            UserQuestionHistory.objects.filter(
                user=self.user,
                job_role__iexact=self.job_role,
                category=self.category,
                difficulty=self.difficulty,
            ).values_list("question_bank_id", flat=True)
        )

    def _filter_unseen(self, pool):
        """Return QuerySet of pool entries NOT yet seen by this user."""
        seen_ids = self._get_seen_ids()
        return pool.exclude(id__in=seen_ids)

    def _reset_history(self):
        """Wipe history for this user+scope so the rotation can start fresh."""
        UserQuestionHistory.objects.filter(
            user=self.user,
            job_role__iexact=self.job_role,
            category=self.category,
            difficulty=self.difficulty,
        ).delete()
        logger.info(
            "Question history reset for user=%s role=%s category=%s difficulty=%s",
            getattr(self.user, "email", self.user),
            self.job_role,
            self.category,
            self.difficulty,
        )

    @staticmethod
    def _random_sample(queryset, count: int) -> List[QuestionBank]:
        """Randomly sample *count* items from a queryset without replacement."""
        ids = list(queryset.values_list("id", flat=True))
        sampled_ids = random.sample(ids, min(count, len(ids)))

        questions = {q.id: q for q in QuestionBank.objects.filter(id__in=sampled_ids)}
        return [questions[qid] for qid in sampled_ids]

    @transaction.atomic
    def _mark_served(self, questions: List[QuestionBank]):
        """Record served questions in history and bump their global counter."""
        for q in questions:
            UserQuestionHistory.objects.get_or_create(
                user=self.user,
                question_bank=q,
                defaults={
                    "job_role": self.job_role,
                    "category": self.category,
                    "difficulty": self.difficulty,
                    "session": self.session,
                },
            )
            QuestionBank.objects.filter(id=q.id).update(
                times_served=q.times_served + 1
            )

def get_user_question_stats(user, job_role: str, category: str, difficulty: str) -> dict:
    """Return a quick summary of the question pool status for a user."""
    total = QuestionBank.objects.filter(
        job_role__iexact=job_role,
        category=category.lower(),
        difficulty=difficulty.lower(),
        is_active=True,
    ).count()

    seen = UserQuestionHistory.objects.filter(
        user=user,
        job_role__iexact=job_role,
        category=category.lower(),
        difficulty=difficulty.lower(),
    ).count()

    return {
        "total_available": total,
        "seen_by_user": seen,
        "remaining": max(0, total - seen),
        "pool_exhausted": seen >= total and total > 0,
        "completion_pct": round((seen / total) * 100, 1) if total else 0,
    }
