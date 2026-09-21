import json
from dotenv import load_dotenv
load_dotenv()
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.sessions.models import InterviewSession
from apps.analysis.services.question_generator import InterviewQuestionGenerator
from apps.analysis.services.answer_evaluator import AnswerEvaluator

User = get_user_model()

class Command(BaseCommand):
    help = 'Test the dynamic interview question generation flow.'

    def handle(self, *args, **options):
        self.stdout.write("Setting up mock session...")
        
        user, _ = User.objects.get_or_create(email="testflow@example.com")
        
        # Cleanup previous test session
        InterviewSession.objects.filter(user=user, job_role="Test Software Engineer").delete()
        
        session = InterviewSession.objects.create(
            user=user,
            job_role="Test Software Engineer",
            difficulty="medium",
            interview_mode="live"
        )
        
        generator = InterviewQuestionGenerator()
        evaluator = AnswerEvaluator()
        
        mock_answers = [
            "Hi Alex, great to meet you! I'm a software engineer with 4 years of experience, mostly using Python and Django. I recently built a microservice architecture for an e-commerce platform.",
            "Sure, we used Docker to containerize our apps and orchestrated them with Kubernetes. For messaging, we used RabbitMQ.",
            "One challenge was dealing with data consistency across services. We eventually implemented a saga pattern.",
            "I wrote a central orchestrator service that listened to events and issued compensating transactions if any step failed.",
            "I'd write unit tests using pytest for the logic, and integration tests using testcontainers for the database and RabbitMQ.",
            "I once had a disagreement with a product manager about a feature deadline. I gathered data on the technical debt it would introduce and proposed a phased rollout.",
            "The PM agreed, and we delivered the core functionality on time without sacrificing code quality.",
            "I'd use Redis for caching frequent queries, and add database indexes for the search fields.",
            "Yes, I'm comfortable with that. My question is, what does the typical deployment process look like here?",
            "That sounds great. Thanks for your time!"
        ]
        
        self.stdout.write("--- Starting Interview Flow ---")
        
        # Generate opening question
        question = generator.generate_next_question(session)
        self.stdout.write(f"\n[Phase: {session.interview_phase} | Q {session.questions_asked_count}] Alex: {question}\n")
        
        history = session.conversation_history or []
        history.append({"role": "assistant", "content": question})
        session.conversation_history = history
        session.questions_asked_count += 1
        session.save()
        
        for i, answer in enumerate(mock_answers):
            self.stdout.write(f"Candidate: {answer}\n")
            
            # Save answer
            history = session.conversation_history or []
            history.append({"role": "user", "content": answer})
            session.conversation_history = history
            session.save()
            
            # Evaluate answer
            self.stdout.write("...Evaluating answer...")
            evaluation = evaluator.evaluate_answer(answer)
            
            topics = session.topics_covered or []
            for t in evaluation.get("topics", []):
                if t not in topics: topics.append(t)
            session.topics_covered = topics
            
            strengths = session.candidate_strengths or []
            for s in evaluation.get("strengths", []):
                if s not in strengths: strengths.append(s)
            session.candidate_strengths = strengths
            
            session.save()
            
            self.stdout.write(f"  -> Score: {evaluation.get('score')} | Topics: {topics}")
            
            if i == len(mock_answers) - 1:
                break
                
            # Generate next question
            self.stdout.write("...Generating next question...")
            
            count = session.questions_asked_count
            if count < 2:
                session.interview_phase = 'intro'
            elif count < 5:
                session.interview_phase = 'behavioral'
            elif count < 8:
                session.interview_phase = 'technical'
            elif count < 10:
                session.interview_phase = 'situational'
            else:
                session.interview_phase = 'closing'
                
            session.save()
                
            next_q = generator.generate_next_question(session, last_answer=answer)
            self.stdout.write(f"\n[Phase: {session.interview_phase} | Q {session.questions_asked_count}] Alex: {next_q}\n")
            
            history = session.conversation_history or []
            history.append({"role": "assistant", "content": next_q})
            session.conversation_history = history
            session.questions_asked_count += 1
            session.save()
            
        self.stdout.write("\n--- Interview Flow Complete ---")
