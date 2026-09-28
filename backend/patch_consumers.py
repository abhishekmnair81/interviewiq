import re
import os

with open(r'e:\interviewiq\backend\apps\analysis\consumers.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CodeRunnerService import
if 'CodeRunnerService' not in content:
    content = content.replace(
        'from apps.analysis.services.level_detector import CandidateLevelDetector\n',
        'from apps.analysis.services.level_detector import CandidateLevelDetector\nfrom apps.analysis.services.code_runner import CodeRunnerService\n'
    )

# Patch the user_turn block (lines 159-208 approx)
user_turn_regex = re.compile(
    r'is_done = self\.session\.questions_asked_count >= 10.*?# 5\. Send output', 
    re.DOTALL
)

new_user_turn = """is_done = self.session.questions_asked_count >= 10

            if is_done:
                # 4a. Generate closing remark and finish
                next_question = "Thank you so much for your time today. I have all the information I need. I'm compiling your interview report now!"
                emotion = 'impressed'
                await self.trigger_session_analysis()
            else:
                # 4b. Generate next question
                if self.session.questions_asked_count == 6:
                    # Inject coding challenge
                    import random
                    lang = random.choice(['Python', 'C', 'Java'])
                    selected_qs = random.sample(CODING_QUESTIONS[lang], min(4, len(CODING_QUESTIONS[lang])))
                    self.session.coding_questions_asked = selected_qs
                    self.session.coding_current_index = 0
                    await database_sync_to_async(self.session.save)()
                    
                    q = selected_qs[0]
                    
                    # 1. Spoken introduction (voice only, brief)
                    await self.send_json({
                        'type': 'alex_speaking',
                        'text': "Let's move to the coding section. You'll see the first problem on the right side of your screen. Take your time.",
                        'is_complete': False,
                        'expression': 'encouraging',
                        'exchange_count': self.session.questions_asked_count
                    })

                    # 2. Structured coding challenge payload (drives the editor panel)
                    await asyncio.sleep(1.0)
                    await self.send_json({
                        'type': 'coding_challenge',
                        'challenge': {
                            'id': q['id'],
                            'index': 1,
                            'total': len(selected_qs),
                            'title': q['title'],
                            'difficulty': q['difficulty'],
                            'language': q['language'],
                            'description': q['description'],
                            'examples': q['test_cases'],
                            'starter_code': q['starter_code'],
                            'time_limit_seconds': 300
                        }
                    })
                    return

                else:
                    try:
                        next_question = await database_sync_to_async(self.generator.generate_next_question)(
                            session=self.session,
                            last_answer=transcript
                        )
                    except Exception as e:
                        logger.warning(f"LLM generation failed: {e}. Falling back to QuestionBank.")
                        next_question = await database_sync_to_async(self._pick_from_question_bank)()

                    await self._save_question(next_question)
                    emotion = self._pick_emotion(evaluation)

            # 5. Send output"""

content = user_turn_regex.sub(new_user_turn, content)

# Patch the submit_code block
submit_code_regex = re.compile(
    r"elif msg_type == 'submit_code':.*?await database_sync_to_async\(self\.session\.save\)\(\)",
    re.DOTALL
)

new_submit_code = """elif msg_type == 'submit_code':
            code = content.get('code', '')
            language = content.get('language', '')
            challenge_id = content.get('challenge_id', '')
            
            # Run code against Judge0
            runner = CodeRunnerService()
            run_result = await database_sync_to_async(runner.run_code)(
                source_code=code,
                language=language,
                stdin=""
            )
            passed = run_result.get('status') == 'success'
            stdout = run_result.get('stdout', '') or ''
            stderr = run_result.get('stderr', '') or ''
            
            # Simple prompt to LLM to evaluate code
            prompt = f"Evaluate this {language} code for question {challenge_id}.\\nCode:\\n{code}\\nStdout:\\n{stdout}\\nStderr:\\n{stderr}\\nGive short, spoken feedback as an interviewer (2-3 sentences max)."
            feedback = await database_sync_to_async(self.generator.llm.generate)(
                prompt=prompt,
                system_prompt="You are Alex, an AI technical interviewer. Give concise spoken feedback."
            )
            
            # Save the submission
            await self._save_coding_submission(challenge_id, code, language, feedback)
            
            idx = self.session.coding_current_index
            qs = self.session.coding_questions_asked
            
            next_challenge = None
            if idx + 1 < len(qs):
                self.session.coding_current_index += 1
                await database_sync_to_async(self.session.save)()
                
                next_q = qs[self.session.coding_current_index]
                next_challenge = {
                    'id': next_q['id'],
                    'index': self.session.coding_current_index + 1,
                    'total': len(qs),
                    'title': next_q['title'],
                    'difficulty': next_q['difficulty'],
                    'language': next_q['language'],
                    'description': next_q['description'],
                    'examples': next_q['test_cases'],
                    'starter_code': next_q['starter_code'],
                    'time_limit_seconds': 300
                }
            else:
                self.session.questions_asked_count += 1
                await database_sync_to_async(self.session.save)()
                
            await self.send_json({
                'type': 'submission_result',
                'passed': passed,
                'feedback': feedback,
                'next_challenge': next_challenge
            })"""

content = submit_code_regex.sub(new_submit_code, content)

with open(r'e:\interviewiq\backend\apps\analysis\consumers.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched consumers.py")
