from django.core.management.base import BaseCommand
from apps.sessions.models import Question

QUESTIONS_DATA = [
    # Behavioral
    {"text": "Tell me about a time you had to handle a conflict within your team. How did you resolve it?", "category": "behavioral", "difficulty": "medium"},
    {"text": "Describe a project that failed or did not meet expectations. What did you learn from it?", "category": "behavioral", "difficulty": "hard"},
    {"text": "Give an example of a time when you had to work under a tight deadline and how you prioritized tasks.", "category": "behavioral", "difficulty": "medium"},
    {"text": "Tell me about a situation where you had to persuade a stakeholder who disagreed with your approach.", "category": "behavioral", "difficulty": "hard"},
    {"text": "Describe a time when you took initiative to solve a problem that wasn't explicitly assigned to you.", "category": "behavioral", "difficulty": "medium"},
    {"text": "How do you handle receiving critical feedback from your peers or supervisors?", "category": "behavioral", "difficulty": "easy"},
    {"text": "Tell me about a time you had to adapt quickly to a major change in project requirements.", "category": "behavioral", "difficulty": "medium"},
    {"text": "Describe a scenario where you demonstrated leadership without having an official leadership title.", "category": "behavioral", "difficulty": "medium"},
    {"text": "Tell me about a time you made a mistake at work and how you communicated it to your team.", "category": "behavioral", "difficulty": "easy"},
    {"text": "Give an example of how you balance competing priorities when managing multiple projects.", "category": "behavioral", "difficulty": "medium"},
    {"text": "Describe a situation where you worked with a difficult team member. How did you maintain productivity?", "category": "behavioral", "difficulty": "medium"},
    {"text": "Tell me about a time you identified a process inefficiency and proposed a successful solution.", "category": "behavioral", "difficulty": "medium"},
    {"text": "Describe a accomplishment you are most proud of in your career so far.", "category": "behavioral", "difficulty": "easy"},
    {"text": "Tell me about a time you had to make a decision without all the necessary information.", "category": "behavioral", "difficulty": "hard"},
    {"text": "Describe how you handle stress and pressure during high-stakes situations.", "category": "behavioral", "difficulty": "medium"},

    # HR & General
    {"text": "Tell me about yourself and your professional background.", "category": "hr", "difficulty": "easy"},
    {"text": "Why are you interested in joining our company?", "category": "hr", "difficulty": "easy"},
    {"text": "Where do you see yourself professionally in five years?", "category": "hr", "difficulty": "easy"},
    {"text": "What are your greatest professional strengths and your biggest weakness?", "category": "hr", "difficulty": "easy"},
    {"text": "Why are you looking to leave your current role?", "category": "hr", "difficulty": "medium"},
    {"text": "What kind of work environment enables you to perform at your best?", "category": "hr", "difficulty": "easy"},
    {"text": "How do you handle disagreement with company management or strategic direction?", "category": "hr", "difficulty": "medium"},
    {"text": "What motivates you to perform well in your daily work?", "category": "hr", "difficulty": "easy"},
    {"text": "How do you ensure continuous learning and professional development?", "category": "hr", "difficulty": "easy"},
    {"text": "What are your salary expectations for this position?", "category": "hr", "difficulty": "medium"},
    {"text": "How do you maintain work-life balance while meeting demanding deadlines?", "category": "hr", "difficulty": "easy"},
    {"text": "What makes you uniquely qualified for this role compared to other candidates?", "category": "hr", "difficulty": "medium"},
    {"text": "Describe your ideal company culture.", "category": "hr", "difficulty": "easy"},
    {"text": "How do you prefer to receive recognition for your contributions?", "category": "hr", "difficulty": "easy"},
    {"text": "If hired, what would your priorities be in the first 90 days?", "category": "hr", "difficulty": "medium"},

    # Technical
    {"text": "Explain the difference between synchronous and asynchronous execution model.", "category": "technical", "difficulty": "medium"},
    {"text": "What is the difference between REST API and GraphQL architecture?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain the concepts of database indexing and how it affects query performance.", "category": "technical", "difficulty": "hard"},
    {"text": "What is object-relational mapping (ORM) and what are its trade-offs?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain how JWT (JSON Web Token) authentication works under the hood.", "category": "technical", "difficulty": "medium"},
    {"text": "What is the difference between SQL and NoSQL databases?", "category": "technical", "difficulty": "easy"},
    {"text": "Explain Docker containers versus traditional virtual machines.", "category": "technical", "difficulty": "medium"},
    {"text": "What is CI/CD and how does automated testing fit into the pipeline?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain memory management and garbage collection in modern programming languages.", "category": "technical", "difficulty": "hard"},
    {"text": "What is the difference between processes and threads?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain microservices architecture versus monolithic architecture.", "category": "technical", "difficulty": "medium"},
    {"text": "What is CORS (Cross-Origin Resource Sharing) and why is it important?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain the concept of Big-O notation and time complexity with examples.", "category": "technical", "difficulty": "medium"},
    {"text": "How do message brokers like Redis or RabbitMQ assist in distributed systems?", "category": "technical", "difficulty": "hard"},
    {"text": "What is dependency injection and what problem does it solve?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain how caching strategies like LRU (Least Recently Used) work.", "category": "technical", "difficulty": "hard"},
    {"text": "What are web sockets and how do they differ from HTTP polling?", "category": "technical", "difficulty": "medium"},
    {"text": "Explain the principles of Clean Code and SOLID architecture.", "category": "technical", "difficulty": "hard"},
    {"text": "How do you secure web applications against SQL Injection and XSS attacks?", "category": "technical", "difficulty": "hard"},
    {"text": "Explain Server-Side Rendering (SSR) versus Client-Side Rendering (CSR).", "category": "technical", "difficulty": "medium"},
]


class Command(BaseCommand):
    help = 'Seeds the database with 50 interview questions across HR, Behavioral, and Technical categories.'

    def handle(self, *args, **options):
        count = 0
        for data in QUESTIONS_DATA:
            obj, created = Question.objects.get_or_create(
                text=data['text'],
                defaults={
                    'category': data['category'],
                    'difficulty': data['difficulty'],
                }
            )
            if created:
                count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} new interview questions (Total in DB: {Question.objects.count()}).'))
