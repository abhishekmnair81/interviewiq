"""
seed_question_bank.py
======================
Populates the QuestionBank model with a comprehensive, role-aware set of
interview questions for the SmartQuestionSelector system.

Usage:
    python manage.py seed_question_bank
    python manage.py seed_question_bank --role "Data Scientist"
    python manage.py seed_question_bank --clear   # wipes existing before seeding
"""
from django.core.management.base import BaseCommand
from apps.sessions.models import QuestionBank

QUESTION_POOL = [

    ("Software Engineer", "behavioral", "easy",   "teamwork",       "Tell me about a time you disagreed with a teammate. How did you resolve it?"),
    ("Software Engineer", "behavioral", "easy",   "communication",  "Describe a time when you had to explain a complex technical concept to a non-technical stakeholder."),
    ("Software Engineer", "behavioral", "medium",  "leadership",    "Tell me about a project where you stepped up as a leader without being asked."),
    ("Software Engineer", "behavioral", "medium",  "failure",       "Describe a significant technical failure you experienced and what you learned from it."),
    ("Software Engineer", "behavioral", "medium",  "adaptability",  "Tell me about a time the project requirements changed significantly mid-sprint. How did you adapt?"),
    ("Software Engineer", "behavioral", "medium",  "prioritisation","Give an example of how you managed competing deadlines on multiple projects simultaneously."),
    ("Software Engineer", "behavioral", "medium",  "feedback",      "Describe how you handled receiving difficult critical feedback on your code or approach."),
    ("Software Engineer", "behavioral", "medium",  "initiative",    "Tell me about a time you proactively identified and fixed a bug or inefficiency before it caused problems."),
    ("Software Engineer", "behavioral", "hard",    "conflict",      "Describe a situation where your technical recommendation was rejected. How did you handle it?"),
    ("Software Engineer", "behavioral", "hard",    "ownership",     "Tell me about a production incident you owned end-to-end. How did you communicate to stakeholders?"),
    ("Software Engineer", "behavioral", "hard",    "mentorship",    "Describe a time you mentored a junior developer. What was your approach and what was the outcome?"),
    ("Software Engineer", "behavioral", "hard",    "tradeoffs",     "Tell me about a time you made an important architectural trade-off under time pressure."),

    ("Software Engineer", "technical",  "easy",   "cs-basics",     "What is the difference between a process and a thread?"),
    ("Software Engineer", "technical",  "easy",   "cs-basics",     "Explain what Big-O notation means and give a real-world example."),
    ("Software Engineer", "technical",  "easy",   "web",           "What is the difference between HTTP and HTTPS?"),
    ("Software Engineer", "technical",  "medium",  "system-design", "How would you design a URL shortener service like bit.ly at scale?"),
    ("Software Engineer", "technical",  "medium",  "databases",    "Explain database indexing and how it impacts read and write performance."),
    ("Software Engineer", "technical",  "medium",  "api",          "What is REST? How does it differ from GraphQL?"),
    ("Software Engineer", "technical",  "medium",  "security",     "How do you protect a web application against SQL injection and XSS attacks?"),
    ("Software Engineer", "technical",  "medium",  "concurrency",  "What is a race condition and how do you prevent it?"),
    ("Software Engineer", "technical",  "medium",  "caching",      "Explain caching strategies — write-through vs write-behind vs read-aside."),
    ("Software Engineer", "technical",  "hard",    "system-design", "Design a distributed rate limiter that works across multiple server instances."),
    ("Software Engineer", "technical",  "hard",    "system-design", "How would you design a real-time notification system for 10 million concurrent users?"),
    ("Software Engineer", "technical",  "hard",    "databases",    "Explain eventual consistency and when you would choose it over strong consistency."),
    ("Software Engineer", "technical",  "hard",    "architecture",  "Compare monolithic, microservices, and serverless architectures with trade-offs."),
    ("Software Engineer", "technical",  "hard",    "algorithms",   "Explain how a consistent hashing ring works and where it is used in distributed systems."),

    ("Software Engineer", "hr",         "easy",   "intro",         "Tell me about yourself and walk me through your engineering journey so far."),
    ("Software Engineer", "hr",         "easy",   "motivation",    "What excites you most about software engineering as a career?"),
    ("Software Engineer", "hr",         "easy",   "strengths",     "What are your three greatest professional strengths as an engineer?"),
    ("Software Engineer", "hr",         "medium",  "growth",       "Where do you see your engineering career in the next three to five years?"),
    ("Software Engineer", "hr",         "medium",  "culture",      "Describe the ideal engineering team culture for you to thrive in."),
    ("Software Engineer", "hr",         "medium",  "fit",          "Why are you looking to leave your current role?"),
    ("Software Engineer", "hr",         "hard",    "salary",       "What are your compensation expectations and how did you arrive at that figure?"),
    ("Software Engineer", "hr",         "hard",    "weakness",     "What is your most significant professional weakness and what are you doing to address it?"),

    ("Data Scientist", "behavioral", "easy",   "communication",  "Tell me about a time you presented data insights to a non-technical business audience."),
    ("Data Scientist", "behavioral", "medium",  "problem-solving","Describe a project where the data quality was poor. How did you handle it?"),
    ("Data Scientist", "behavioral", "medium",  "collaboration",  "Tell me about a time you collaborated with engineers to deploy a machine learning model to production."),
    ("Data Scientist", "behavioral", "hard",    "impact",         "Describe the most impactful data science project you have delivered. What was the measurable business outcome?"),

    ("Data Scientist", "technical",  "easy",   "ml-basics",     "What is the difference between supervised and unsupervised learning?"),
    ("Data Scientist", "technical",  "medium",  "ml",            "Explain the bias-variance trade-off and how you manage it in model selection."),
    ("Data Scientist", "technical",  "medium",  "ml",            "How do you handle class imbalance in a binary classification problem?"),
    ("Data Scientist", "technical",  "hard",    "system-design", "How would you design an A/B testing system for a recommendation engine?"),
    ("Data Scientist", "technical",  "hard",    "mlops",         "Walk me through how you would monitor a machine learning model in production for drift."),

    ("Data Scientist", "hr",         "easy",   "intro",         "Tell me about yourself and your journey into data science."),
    ("Data Scientist", "hr",         "medium",  "growth",       "Where do you see yourself in five years within the data field?"),

    ("Product Manager", "behavioral", "medium",  "prioritisation","Walk me through how you prioritize a product backlog when every stakeholder thinks their request is urgent."),
    ("Product Manager", "behavioral", "medium",  "data-driven",  "Tell me about a time you used data to change a product decision."),
    ("Product Manager", "behavioral", "hard",    "failure",      "Describe a product you launched that did not achieve its goal. What would you do differently?"),

    ("Product Manager", "technical",  "medium",  "metrics",      "How do you define and measure the success of a new product feature?"),
    ("Product Manager", "technical",  "hard",    "system-design","How would you design the product roadmap for a ride-sharing app entering a new market?"),

    ("Product Manager", "hr",         "easy",   "intro",         "Tell me about yourself and what led you to product management."),
    ("Product Manager", "hr",         "medium",  "culture",      "Describe your ideal relationship between Product Management and Engineering."),

    ("Generic",         "behavioral", "easy",   "teamwork",       "Tell me about yourself and a highlight from your career so far."),
    ("Generic",         "behavioral", "medium",  "leadership",    "Tell me about a time you led a project or initiative from start to finish."),
    ("Generic",         "behavioral", "hard",    "conflict",      "Describe a professional conflict and how you resolved it constructively."),
    ("Generic",         "technical",  "easy",    "fundamentals",  "What tools or technologies are you most proficient in and why?"),
    ("Generic",         "technical",  "medium",  "problem-solving","Walk me through how you debug a complex issue in your domain."),
    ("Generic",         "hr",         "easy",    "intro",         "Tell me about yourself and what brings you here today."),
    ("Generic",         "hr",         "medium",  "motivation",    "What are you looking for in your next role?"),

    ("Civil Engineer", "behavioral", "easy",   "teamwork",        "Tell me about a time you worked on a large infrastructure project with a multidisciplinary team."),
    ("Civil Engineer", "behavioral", "medium",  "problem-solving", "Describe a time a construction project faced an unexpected geotechnical challenge. How did you resolve it?"),
    ("Civil Engineer", "behavioral", "medium",  "leadership",      "Tell me about a time you supervised a team on-site. How did you ensure safety and quality?"),
    ("Civil Engineer", "behavioral", "hard",    "conflict",        "Describe a situation where a client disagreed with your engineering recommendation. How did you handle it?"),
    ("Civil Engineer", "technical",  "easy",    "fundamentals",    "Explain the difference between dead load and live load in structural engineering."),
    ("Civil Engineer", "technical",  "medium",  "design",          "Walk me through the steps you would take to design a reinforced concrete beam."),
    ("Civil Engineer", "technical",  "hard",    "analysis",        "How would you assess the structural integrity of an ageing bridge? What parameters would you prioritise?"),
    ("Civil Engineer", "hr",         "easy",    "intro",           "Tell me about yourself and what drew you to civil engineering."),

    ("Mechanical Engineer", "behavioral", "easy",   "teamwork",    "Describe a time you worked closely with design and manufacturing teams to deliver a product."),
    ("Mechanical Engineer", "behavioral", "medium",  "failure",    "Tell me about a mechanical design that failed during testing. What did you learn?"),
    ("Mechanical Engineer", "behavioral", "hard",    "leadership",  "Describe a time you drove a process improvement that reduced production costs or cycle time."),
    ("Mechanical Engineer", "technical",  "easy",    "fundamentals","What is the difference between stress and strain? How are they related?"),
    ("Mechanical Engineer", "technical",  "medium",  "thermodynamics","Explain the four laws of thermodynamics and give a real engineering application for each."),
    ("Mechanical Engineer", "technical",  "hard",    "design",      "Walk me through your approach to designing a heat exchanger for a high-pressure steam system."),
    ("Mechanical Engineer", "hr",         "easy",    "intro",       "Tell me about yourself and your journey into mechanical engineering."),
    ("Mechanical Engineer", "hr",         "medium",  "growth",      "Where do you see your mechanical engineering career in five years?"),

    ("Electrical Engineer", "behavioral", "easy",   "teamwork",    "Tell me about a time you collaborated with software engineers on an embedded systems project."),
    ("Electrical Engineer", "behavioral", "medium",  "problem-solving","Describe a time you diagnosed and resolved a complex electrical fault in a live system."),
    ("Electrical Engineer", "behavioral", "hard",    "ownership",   "Tell me about a power systems project you owned from design to commissioning."),
    ("Electrical Engineer", "technical",  "easy",    "fundamentals","Explain Kirchhoff's Voltage and Current Laws with a practical example."),
    ("Electrical Engineer", "technical",  "medium",  "power",       "What is power factor and why is power factor correction important in industrial installations?"),
    ("Electrical Engineer", "technical",  "hard",    "design",      "How would you design a protection scheme for a 33kV distribution substation?"),
    ("Electrical Engineer", "hr",         "easy",    "intro",       "Tell me about your background and what excites you most about electrical engineering."),
    ("Electrical Engineer", "hr",         "medium",  "culture",     "Describe your ideal work environment as an electrical engineer."),

    ("Chemical Engineer", "behavioral", "easy",   "teamwork",      "Tell me about a time you worked in a cross-functional team on a process plant project."),
    ("Chemical Engineer", "behavioral", "medium",  "safety",       "Describe a situation where you identified a safety hazard in a chemical process. What did you do?"),
    ("Chemical Engineer", "behavioral", "hard",    "optimisation",  "Tell me about a time you optimised a chemical process to improve yield or reduce waste."),
    ("Chemical Engineer", "technical",  "easy",    "fundamentals",  "What is the difference between endothermic and exothermic reactions? Give a process example."),
    ("Chemical Engineer", "technical",  "medium",  "process",       "Explain the concept of mass balance and how you apply it in process design."),
    ("Chemical Engineer", "technical",  "hard",    "design",        "Walk me through how you would design a distillation column for separating a binary mixture."),
    ("Chemical Engineer", "hr",         "easy",    "intro",         "Tell me about yourself and your background in chemical engineering."),
    ("Chemical Engineer", "hr",         "medium",  "motivation",    "What aspects of chemical engineering excite you most in your career?"),

    ("Electronics Engineer", "behavioral", "easy",   "teamwork",   "Tell me about a time you worked with a hardware and firmware team to bring a product to market."),
    ("Electronics Engineer", "behavioral", "medium",  "debugging",  "Describe a time you traced a difficult intermittent fault in a PCB design."),
    ("Electronics Engineer", "behavioral", "hard",    "leadership",  "Tell me about an electronics project where you were the lead engineer. How did you manage scope?"),
    ("Electronics Engineer", "technical",  "easy",    "fundamentals","What is the difference between an op-amp in inverting vs non-inverting configuration?"),
    ("Electronics Engineer", "technical",  "medium",  "digital",    "Explain how a UART communication protocol works and what its key parameters are."),
    ("Electronics Engineer", "technical",  "hard",    "design",     "Walk me through designing a low-noise analogue front-end for a sensor interface."),
    ("Electronics Engineer", "hr",         "easy",    "intro",      "Tell me about your background and what drew you to electronics engineering."),
    ("Electronics Engineer", "hr",         "medium",  "growth",     "Where do you see your career in electronics or embedded systems in three to five years?"),

    ("Biomedical Engineer", "behavioral", "easy",   "collaboration", "Tell me about a time you worked directly with clinicians on a medical device project."),
    ("Biomedical Engineer", "behavioral", "medium",  "compliance",   "Describe how you ensured regulatory compliance on a medical device you worked on."),
    ("Biomedical Engineer", "behavioral", "hard",    "impact",       "Tell me about the most impactful medical technology project you contributed to."),
    ("Biomedical Engineer", "technical",  "easy",    "fundamentals", "What is the difference between active and passive medical devices?"),
    ("Biomedical Engineer", "technical",  "medium",  "signals",      "Explain how an ECG signal is acquired and what common artefacts you would filter out."),
    ("Biomedical Engineer", "technical",  "hard",    "design",       "Walk me through designing a wearable health monitoring device from requirements to validation."),
    ("Biomedical Engineer", "hr",         "easy",    "intro",        "Tell me about yourself and your passion for biomedical engineering."),
    ("Biomedical Engineer", "hr",         "medium",  "motivation",   "Why did you choose biomedical engineering and where do you see yourself in five years?"),

    ("Finance & Accounting", "behavioral", "easy",   "communication","Tell me about a time you presented financial analysis to a non-finance stakeholder."),
    ("Finance & Accounting", "behavioral", "medium",  "problem-solving","Describe a time you identified a financial discrepancy or risk. How did you resolve it?"),
    ("Finance & Accounting", "behavioral", "hard",    "leadership",  "Tell me about a time you led a financial planning cycle or audit process end-to-end."),
    ("Finance & Accounting", "technical",  "easy",    "fundamentals","What is the difference between accounts payable and accounts receivable?"),
    ("Finance & Accounting", "technical",  "medium",  "analysis",   "Walk me through how you would build a discounted cash flow model for a new investment."),
    ("Finance & Accounting", "technical",  "hard",    "strategy",   "How would you approach financial due diligence on a potential acquisition target?"),
    ("Finance & Accounting", "hr",         "easy",    "intro",      "Tell me about yourself and your journey in finance and accounting."),
    ("Finance & Accounting", "hr",         "medium",  "growth",     "Where do you see your finance career in the next five years?"),

    ("Marketing & Sales", "behavioral", "easy",   "communication",  "Tell me about a campaign you ran that significantly increased brand awareness or lead generation."),
    ("Marketing & Sales", "behavioral", "medium",  "problem-solving","Describe a time a product launch did not go as planned. How did you adapt your strategy?"),
    ("Marketing & Sales", "behavioral", "hard",    "leadership",     "Tell me about a time you built and coached a sales or marketing team from the ground up."),
    ("Marketing & Sales", "technical",  "easy",    "fundamentals",   "What is the difference between B2B and B2C marketing strategies?"),
    ("Marketing & Sales", "technical",  "medium",  "analytics",      "How do you use data and KPIs to measure the ROI of a marketing campaign?"),
    ("Marketing & Sales", "technical",  "hard",    "strategy",       "How would you design a go-to-market strategy for a new SaaS product entering a competitive market?"),
    ("Marketing & Sales", "hr",         "easy",    "intro",          "Tell me about yourself and what excites you about marketing and sales."),
    ("Marketing & Sales", "hr",         "medium",  "motivation",     "What motivates you most about a career in marketing or sales?"),

    ("Human Resources", "behavioral", "easy",   "communication",    "Tell me about a time you managed a difficult employee relations situation."),
    ("Human Resources", "behavioral", "medium",  "problem-solving",  "Describe a time you redesigned a recruitment process to improve quality of hire."),
    ("Human Resources", "behavioral", "hard",    "leadership",       "Tell me about a time you led an organisational change or transformation programme."),
    ("Human Resources", "technical",  "easy",    "fundamentals",     "What is the difference between job analysis and job evaluation?"),
    ("Human Resources", "technical",  "medium",  "compliance",       "How do you ensure an organisation stays compliant with employment law and regulations?"),
    ("Human Resources", "technical",  "hard",    "strategy",         "How would you design a competency-based performance management framework for a 500-person company?"),
    ("Human Resources", "hr",         "easy",    "intro",            "Tell me about yourself and your background in HR."),
    ("Human Resources", "hr",         "medium",  "growth",           "Where do you see your HR career evolving over the next few years?"),

    ("Healthcare / Medicine", "behavioral", "easy",   "teamwork",    "Tell me about a time you worked in a multidisciplinary clinical team. How did you contribute?"),
    ("Healthcare / Medicine", "behavioral", "medium",  "pressure",   "Describe a high-pressure clinical scenario and how you remained composed and effective."),
    ("Healthcare / Medicine", "behavioral", "hard",    "ethics",     "Describe a difficult ethical dilemma you faced in your clinical practice and how you navigated it."),
    ("Healthcare / Medicine", "technical",  "easy",    "fundamentals","What is the importance of evidence-based practice in clinical decision-making?"),
    ("Healthcare / Medicine", "technical",  "medium",  "clinical",   "Walk me through your approach to diagnosing a patient presenting with chest pain."),
    ("Healthcare / Medicine", "technical",  "hard",    "leadership",  "How would you design a quality improvement initiative to reduce hospital-acquired infection rates?"),
    ("Healthcare / Medicine", "hr",         "easy",    "intro",       "Tell me about yourself and what led you to your career in healthcare."),
    ("Healthcare / Medicine", "hr",         "medium",  "motivation",  "What motivates you most in your healthcare career?"),

    ("Law / Legal", "behavioral", "easy",   "communication",        "Tell me about a time you had to explain a complex legal concept to a client with no legal background."),
    ("Law / Legal", "behavioral", "medium",  "problem-solving",     "Describe a challenging case or legal matter you worked on. How did you approach the strategy?"),
    ("Law / Legal", "behavioral", "hard",    "leadership",          "Tell me about a time you led a legal team or managed a high-stakes transaction from start to finish."),
    ("Law / Legal", "technical",  "easy",    "fundamentals",        "What is the difference between civil law and criminal law?"),
    ("Law / Legal", "technical",  "medium",  "contracts",           "Walk me through the key elements you review when drafting or reviewing a commercial contract."),
    ("Law / Legal", "technical",  "hard",    "advisory",            "How would you advise a client on legal risks of entering a joint venture in a foreign jurisdiction?"),
    ("Law / Legal", "hr",         "easy",    "intro",               "Tell me about yourself and what drew you to a career in law."),
    ("Law / Legal", "hr",         "medium",  "growth",              "Where do you see your legal career progressing in the next five years?"),

    ("Education / Teaching", "behavioral", "easy",   "communication","Tell me about a time you adapted your teaching style to meet the needs of different learners."),
    ("Education / Teaching", "behavioral", "medium",  "challenge",  "Describe a difficult classroom situation you managed effectively."),
    ("Education / Teaching", "behavioral", "hard",    "leadership",  "Tell me about a time you developed or led a curriculum design or educational programme."),
    ("Education / Teaching", "technical",  "easy",    "fundamentals","What is the difference between formative and summative assessment?"),
    ("Education / Teaching", "technical",  "medium",  "methods",    "How do you incorporate active learning and student engagement strategies into your lessons?"),
    ("Education / Teaching", "technical",  "hard",    "design",     "How would you design an inclusive curriculum for a diverse classroom with varying learning needs?"),
    ("Education / Teaching", "hr",         "easy",    "intro",      "Tell me about yourself and your passion for teaching."),
    ("Education / Teaching", "hr",         "medium",  "motivation",  "What motivates you most in your role as an educator?"),

    ("Architecture & Design", "behavioral", "easy",   "collaboration","Tell me about a time you worked with engineers and contractors to bring an architectural design to life."),
    ("Architecture & Design", "behavioral", "medium",  "feedback",  "Describe a project where the client requested significant design changes late in the process. How did you handle it?"),
    ("Architecture & Design", "behavioral", "hard",    "leadership",  "Tell me about a complex architectural project you led from concept to completion."),
    ("Architecture & Design", "technical",  "easy",    "fundamentals","What are the key principles of sustainable design and how do you apply them?"),
    ("Architecture & Design", "technical",  "medium",  "design",    "Walk me through your process for developing a building's spatial programme and concept design."),
    ("Architecture & Design", "technical",  "hard",    "planning",  "How would you approach the planning challenges for a mixed-use urban development?"),
    ("Architecture & Design", "hr",         "easy",    "intro",     "Tell me about yourself and your journey in architecture or design."),
    ("Architecture & Design", "hr",         "medium",  "motivation", "What style of projects inspires you most and where do you see your design career going?"),

    ("Business Management", "behavioral", "easy",   "teamwork",     "Tell me about a time you built consensus among a diverse group of stakeholders."),
    ("Business Management", "behavioral", "medium",  "strategy",    "Describe a business problem you identified and the strategic solution you implemented."),
    ("Business Management", "behavioral", "hard",    "leadership",  "Tell me about a time you managed organisational change and how you brought your team through it."),
    ("Business Management", "technical",  "easy",    "fundamentals","What is SWOT analysis and when would you use it?"),
    ("Business Management", "technical",  "medium",  "strategy",   "How do you build and execute a business plan for a new market entry?"),
    ("Business Management", "technical",  "hard",    "leadership",  "How would you design a balanced scorecard to align a 200-person organisation with strategic objectives?"),
    ("Business Management", "hr",         "easy",    "intro",      "Tell me about yourself and your background in business management."),
    ("Business Management", "hr",         "medium",  "motivation",  "What type of business challenges energise you most and why?"),

    ("Cybersecurity Analyst", "behavioral", "medium",  "incident",   "Describe a security incident you responded to. Walk me through your investigation and remediation steps."),
    ("Cybersecurity Analyst", "behavioral", "hard",    "leadership",  "Tell me about a time you built or improved a security programme from scratch."),
    ("Cybersecurity Analyst", "technical",  "easy",    "fundamentals","What is the CIA triad and why is it foundational to information security?"),
    ("Cybersecurity Analyst", "technical",  "medium",  "threats",    "Explain how a SQL injection attack works and how you would prevent it."),
    ("Cybersecurity Analyst", "technical",  "hard",    "architecture","How would you design a zero-trust security architecture for a cloud-first organisation?"),
    ("Cybersecurity Analyst", "hr",         "easy",    "intro",      "Tell me about yourself and what drew you to cybersecurity."),

    ("DevOps Engineer", "behavioral", "medium",  "collaboration",   "Tell me about a time you worked with dev and ops teams to eliminate a deployment bottleneck."),
    ("DevOps Engineer", "behavioral", "hard",    "incident",        "Describe a major outage you were involved in. How did you lead the incident response?"),
    ("DevOps Engineer", "technical",  "easy",    "fundamentals",    "What is the difference between continuous integration and continuous delivery?"),
    ("DevOps Engineer", "technical",  "medium",  "infrastructure",  "Walk me through how you would set up an Infrastructure as Code pipeline using Terraform."),
    ("DevOps Engineer", "technical",  "hard",    "architecture",    "How would you design a highly available Kubernetes cluster for a mission-critical application?"),
    ("DevOps Engineer", "hr",         "easy",    "intro",           "Tell me about yourself and your journey into DevOps."),

    ("AI/ML Engineer", "behavioral", "medium",  "collaboration",    "Tell me about a time you deployed an ML model to production. What challenges did you face?"),
    ("AI/ML Engineer", "behavioral", "hard",    "impact",           "Describe the most impactful AI system you built. What was its business or user impact?"),
    ("AI/ML Engineer", "technical",  "easy",    "ml-basics",        "What is the difference between classification and regression?"),
    ("AI/ML Engineer", "technical",  "medium",  "deep-learning",    "Explain how transformer architecture works and what problems it solves over RNNs."),
    ("AI/ML Engineer", "technical",  "hard",    "system-design",    "How would you design an end-to-end MLOps pipeline for a real-time fraud detection system?"),
    ("AI/ML Engineer", "hr",         "easy",    "intro",            "Tell me about yourself and your journey into AI and machine learning."),
]


class Command(BaseCommand):
    help = (
        "Seeds the QuestionBank table with interview questions for the SmartQuestionSelector.\n"
        "Use --clear to wipe existing entries before seeding."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--role",
            type=str,
            default=None,
            help="Seed only questions for a specific job role (e.g. 'Software Engineer').",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear all existing QuestionBank entries before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = QuestionBank.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} existing QuestionBank entries."))

        role_filter = options.get("role")
        pool = QUESTION_POOL
        if role_filter:
            pool = [(r, c, d, t, q) for r, c, d, t, q in pool if r.lower() == role_filter.lower()]
            if not pool:
                self.stdout.write(self.style.ERROR(f"No questions found for role: '{role_filter}'."))
                return

        created_count = 0
        skipped_count = 0

        for job_role, category, difficulty, topic_tag, text in pool:
            _, created = QuestionBank.objects.get_or_create(
                job_role=job_role,
                category=category,
                difficulty=difficulty,
                text=text,
                defaults={"topic_tag": topic_tag, "is_active": True},
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"QuestionBank seeded: {created_count} new questions added, "
                f"{skipped_count} already existed. "
                f"Total in DB: {QuestionBank.objects.count()}."
            )
        )
