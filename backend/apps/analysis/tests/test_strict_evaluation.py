import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from apps.analysis.services.answer_evaluator import StrictAnswerEvaluator

class StrictEvaluationTests(TestCase):
    def setUp(self):
        self.evaluator = StrictAnswerEvaluator()
        
        # Mock Session
        self.session_senior = MagicMock()
        self.session_senior.job_role = 'Software Engineer'
        self.session_senior.question_category = 'technical'

    @patch('apps.analysis.services.answer_evaluator.Groq')
    def test_junior_vague_answer_scores_low(self, mock_groq_class):
        """A vague answer from a 'senior' candidate should score poorly."""
        
        # Setup mock LLM response
        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        
        # Raw LLM score without multipliers
        raw_llm_json = {
            "overall_score": 45,
            "dimensions": {
                "specificity": {"score": 30, "evidence": "no metrics provided"},
                "impact": {"score": 40, "evidence": "improved the system"},
            },
            "weaknesses": ["no quantified results", "vague on debugging approach"]
        }
        mock_response.choices[0].message.content = json.dumps(raw_llm_json)
        mock_client.chat.completions.create.return_value = mock_response

        # Use our mocked client instead of the real one
        self.evaluator.client = mock_client

        answer = "We improved the system and it worked better."
        result = self.evaluator.evaluate(self.session_senior, "Tell me about a project.", answer, 'senior')
        
        # Senior multiplier is 0.90, so 45 * 0.90 = 40
        self.assertLessEqual(result['level_adjusted_score'], 40)
        
        weaknesses_str = ' '.join(result.get('weaknesses', [])).lower()
        self.assertIn('no quantified', weaknesses_str)

    @patch('apps.analysis.services.answer_evaluator.Groq')
    def test_strong_answer_scores_high(self, mock_groq_class):
        """A specific, structured answer should score well."""
        
        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        
        raw_llm_json = {
            "overall_score": 92,
            "dimensions": {
                "specificity": {"score": 95, "evidence": "reduced p99 to 180ms"},
                "impact": {"score": 90, "evidence": "cut infra cost by $40K/year"},
            }
        }
        mock_response.choices[0].message.content = json.dumps(raw_llm_json)
        mock_client.chat.completions.create.return_value = mock_response

        self.evaluator.client = mock_client

        answer = "At Stripe, we had a 2-second p99 latency on the payment API. I led the migration from synchronous DB calls to Kafka-based async processing. We reduced p99 to 180ms (91% improvement) and cut infra cost by $40K/year. Trade-off: higher operational complexity, mitigated by adding Grafana alerts."
        result = self.evaluator.evaluate(self.session_senior, "Tell me about scaling a system.", answer, 'senior')
        
        # 92 * 0.90 = 82
        self.assertGreater(result['level_adjusted_score'], 80)

    @patch('apps.analysis.services.answer_evaluator.Groq')
    def test_no_inflation_on_empty_answer(self, mock_groq_class):
        """If the answer is too short, we don't even call the LLM and return score 0."""
        answer = "I don't know."
        result = self.evaluator.evaluate(self.session_senior, "How do you scale DBs?", answer, 'mid')
        
        self.assertLess(result['overall_score'], 20)
        self.assertLess(result['level_adjusted_score'], 20)

    @patch('apps.analysis.services.answer_evaluator.Groq')
    def test_inflation_guard(self, mock_groq_class):
        """If the overall score is high but specificity is low, the guard lowers the score."""
        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        
        # Artificial inflation: Score 90 but specificity only 50
        raw_llm_json = {
            "overall_score": 90,
            "dimensions": {
                "specificity": {"score": 50, "evidence": "general stuff"},
            }
        }
        mock_response.choices[0].message.content = json.dumps(raw_llm_json)
        mock_client.chat.completions.create.return_value = mock_response

        self.evaluator.client = mock_client

        answer = "I did a lot of things and they were all great."
        result = self.evaluator.evaluate(self.session_senior, "Tell me about a project.", answer, 'mid')
        
        # Guard should have kicked in and lowered overall_score to 70
        self.assertEqual(result['overall_score'], 70)
        self.assertTrue(result.get('inflation_corrected', False))
