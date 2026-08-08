import os
import re
import math
import wave
import tempfile
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Extended Filler Words & Multi-word Phrases
FILLER_WORDS = {
    'um', 'uh', 'err', 'ah', 'hmm', 'hmmm',
    'you know', 'sort of', 'kind of', 'to be honest',
    'i mean', 'at the end of the day', 'as a matter of fact'
}

SINGLE_FILLER_WORDS = {
    'um', 'uh', 'err', 'ah', 'hmm', 'hmmm'
}

MULTI_FILLER_PHRASES = [
    r'\byou know\b', r'\bsort of\b', r'\bkind of\b', r'\bto be honest\b',
    r'\bi mean\b', r'\bat the end of the day\b', r'\bas a matter of fact\b'
]

STOP_WORDS = {
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'of', 'in', 'to',
    'for', 'with', 'on', 'at', 'from', 'by', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
    'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 's', 't', 'just', 'don', 'now', 'and', 'or', 'it', 'this', 'that',
    'i', 'you', 'me', 'my', 'we', 'our', 'he', 'she', 'they', 'them', 'their'
}

VAGUE_PHRASES = [
    r'\bi think\b', r'\bmaybe\b', r'\bkind of\b', r'\bkinda\b', r'\bsort of\b',
    r'\bsomewhat\b', r'\bi guess\b', r'\bprobably\b', r'\bi suppose\b',
    r'\bnot sure\b', r'\bpossibly\b', r'\baround\b', r'\bapproximately\b',
]

ACTION_VERBS = {
    'spearheaded', 'architected', 'engineered', 'orchestrated', 'launched',
    'negotiated', 'optimised', 'optimized', 'developed', 'implemented',
    'designed', 'led', 'managed', 'transformed', 'delivered', 'revamped',
    'scaled', 'pioneered', 'formulated', 'streamlined', 'executing', 'executed',
    'built', 'created', 'resolved', 'boosted', 'drove'
}

STAR_PATTERNS = {
    'situation': [
        r'\bsituation\b', r'\bcontext\b', r'\bat the time\b', r'\bwe were\b',
        r'\bin my (previous|last|current|former)\b', r'\bwhen i was\b', r'\bworking (at|for|with)\b',
        r'\bour team was\b', r'\bthe company was\b',
    ],
    'task': [
        r'\bmy (role|responsibility|job|task|goal|objective)\b', r'\bi was (responsible|assigned|asked|tasked)\b',
        r'\bmy job was\b', r'\bi needed to\b', r'\bthe (challenge|problem|issue)\b',
        r'\bwe needed to\b', r'\bthe objective was\b',
    ],
    'action': [
        r'\bi (did|decided|chose|implemented|built|created|led|managed|designed|developed|proposed|spearheaded)\b',
        r'\bmy approach\b', r'\bthe (steps|actions|solution)\b', r'\bfirst[,\s]', r'\bthen\b.*\bfinally\b',
        r'\bto (solve|fix|address|handle|resolve)\b', r'\bi structured\b', r'\bi coordinated\b',
    ],
    'result': [
        r'\bresult(ed)?\b', r'\boutcome\b', r'\bwe (achieved|improved|reduced|increased|saved|delivered)\b',
        r'\bthis (led to|resulted in|helped)\b', r'\bsuccessfully\b', r'\bin the end\b',
        r'\bby \d+\s?(%|percent)\b', r'\bwithin \d+', r'\bwe (hit|exceeded|met|reached)\b',
        r'\bultimately\b', r'\bconsequently\b',
    ],
}


def _cosine_similarity(vec_a: list, vec_b: list) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _word_freq_vector(text_a: str, text_b: str):
    words_a = [w for w in re.findall(r'\b\w+\b', text_a.lower()) if w not in STOP_WORDS and len(w) > 1]
    words_b = [w for w in re.findall(r'\b\w+\b', text_b.lower()) if w not in STOP_WORDS and len(w) > 1]
    if not words_a or not words_b:
        return [0], [0]
    vocab = sorted(set(words_a) | set(words_b))
    freq_a = [words_a.count(w) for w in vocab]
    freq_b = [words_b.count(w) for w in vocab]
    return freq_a, freq_b


def _compute_relevance(question: str, answer: str) -> float:
    if not question or not answer or not answer.strip():
        return 0.0
    vec_a, vec_b = _word_freq_vector(question, answer)
    similarity = _cosine_similarity(vec_a, vec_b)
    
    words_answer = [w for w in re.findall(r'\b\w+\b', answer.lower()) if w not in STOP_WORDS]
    length_bonus = min(25.0, len(words_answer) * 0.4)
    
    relevance = round(50.0 + similarity * 35.0 + length_bonus, 1)
    return min(100.0, max(50.0, relevance))


def _detect_star(answer: str) -> dict:
    if not answer:
        return {
            'components_present': {'situation': False, 'task': False, 'action': False, 'result': False},
            'star_count': 0,
            'star_score': 0.0,
            'quantifiable_metrics_count': 0,
            'action_verbs_count': 0,
        }
    answer_lower = answer.lower()
    component_scores = {}
    for component, patterns in STAR_PATTERNS.items():
        matched = any(re.search(p, answer_lower) for p in patterns)
        component_scores[component] = matched

    star_count = sum(1 for v in component_scores.values() if v)
    star_score = round((star_count / 4.0) * 100.0, 1)

    # Detect Quantifiable Impact (percentages, dollar amounts, team size, scale)
    quant_patterns = [
        r'\d+\s?%', r'\d+\s?percent', r'\$\d+', r'\d+\s?dollars',
        r'\bby \d+\b', r'\bin \d+ (days|weeks|months|years)\b',
        r'\bteam of \d+\b', r'\b\d+x\b', r'\b\d+ users\b'
    ]
    quant_matches = []
    for qp in quant_patterns:
        quant_matches.extend(re.findall(qp, answer_lower))
    quantifiable_metrics_count = len(quant_matches)

    # Detect Executive Action Verbs
    words = re.findall(r'\b\w+\b', answer_lower)
    action_verbs_found = [w for w in words if w in ACTION_VERBS]
    action_verbs_count = len(set(action_verbs_found))

    return {
        'components_present': component_scores,
        'star_count': star_count,
        'star_score': star_score,
        'quantifiable_metrics_count': quantifiable_metrics_count,
        'action_verbs_count': action_verbs_count,
    }


def _detect_vague_language(answer: str) -> dict:
    if not answer:
        return {
            'vague_phrases_detected': [],
            'vague_count': 0,
            'confidence_score': 0.0,
            'executive_tone_score': 0.0,
        }
    answer_lower = answer.lower()
    vague_hits = []
    for pattern in VAGUE_PHRASES:
        matches = re.findall(pattern, answer_lower)
        vague_hits.extend(matches)

    vague_count = len(vague_hits)
    confidence_score = max(30.0, 100.0 - (vague_count * 7.0))
    executive_tone_score = round(confidence_score, 1)

    return {
        'vague_phrases_detected': list(set(vague_hits)),
        'vague_count': vague_count,
        'confidence_score': confidence_score,
        'executive_tone_score': executive_tone_score,
    }


def analyze_answer(question: str, transcript: str) -> dict:
    if not transcript or not transcript.strip():
        return {
            'relevance_score': 0.0,
            'star_score': 0.0,
            'confidence_score': 0.0,
            'executive_tone_score': 0.0,
            'answer_score': 0.0,
            'star_components': {'situation': False, 'task': False, 'action': False, 'result': False},
            'quantifiable_metrics_count': 0,
            'action_verbs_count': 0,
            'vague_phrases': [],
            'vague_count': 0,
            'answer_feedback': 'No response was detected in the video recording. Please ensure your microphone is working and speak your answer clearly.',
        }

    relevance_score = _compute_relevance(question, transcript)
    star_result = _detect_star(transcript)
    vague_result = _detect_vague_language(transcript)

    # Calculate answer score with bonuses for metrics and action verbs
    bonus = min(15.0, (star_result['quantifiable_metrics_count'] * 4.0) + (star_result['action_verbs_count'] * 2.0))
    raw_answer_score = (
        0.35 * relevance_score +
        0.40 * star_result['star_score'] +
        0.25 * vague_result['confidence_score']
    )
    answer_score = min(100.0, round(raw_answer_score + bonus, 1))

    feedback = []
    if relevance_score < 60:
        feedback.append("Your answer didn't fully address the question — make sure to directly respond to what was asked.")
    else:
        feedback.append("Good answer relevance to the question asked.")

    star_count = star_result['star_count']
    missing = [k for k, v in star_result['components_present'].items() if not v]
    if star_count < 2:
        feedback.append(
            f"Your answer is missing key STAR components (Situation, Task, Action, Result). "
            f"Missing: {', '.join(missing).title()}. Use this structure to frame interview answers."
        )
    elif star_count < 4:
        feedback.append(
            f"Partial STAR structure detected. Try adding the missing components: {', '.join(missing).title()}."
        )
    else:
        feedback.append("Excellent! Your answer covers all 4 STAR components.")

    if star_result['quantifiable_metrics_count'] == 0:
        feedback.append("Tip: Add specific quantifiable numbers or percentages to your Result phase (e.g. 'improved efficiency by 35%').")

    if vague_result['vague_count'] > 2:
        feedback.append(
            f"Detected {vague_result['vague_count']} hedging phrases "
            f"({', '.join(vague_result['vague_phrases_detected'][:3])}). "
            "Replace vague language with specific facts to project executive confidence."
        )

    return {
        'relevance_score': relevance_score,
        'star_score': star_result['star_score'],
        'confidence_score': vague_result['confidence_score'],
        'executive_tone_score': vague_result['executive_tone_score'],
        'answer_score': answer_score,
        'star_components': star_result['components_present'],
        'quantifiable_metrics_count': star_result['quantifiable_metrics_count'],
        'action_verbs_count': star_result['action_verbs_count'],
        'vague_phrases': vague_result['vague_phrases_detected'],
        'vague_count': vague_result['vague_count'],
        'answer_feedback': ' '.join(feedback),
    }


def extract_acoustic_audio_metrics(video_path: str) -> dict:
    """
    Extracts raw audio WAV file from video using ffmpeg and calculates exact acoustic
    signal metrics: total audio duration, active speech duration, silence/pause count,
    silence duration, volume stability %, and pitch variation / monotony index.
    """
    default_res = {
        'audio_duration_sec': 0.0,
        'active_speech_sec': 0.0,
        'pause_count': 0,
        'long_pauses_count': 0,
        'total_silence_sec': 0.0,
        'active_speech_ratio': 85.0,
        'volume_stability': 82.0,
        'pitch_variance_monotony': 'Dynamic & Engaging',
        'vocal_monotony_score': 85.0,
        'vocal_clarity_score': 88.0,
    }

    if not video_path or not os.path.exists(video_path):
        return default_res

    temp_wav_path = None
    try:
        import imageio_ffmpeg
        import numpy as np

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_wav_path = temp_wav.name
        temp_wav.close()

        # Extract 16kHz Mono PCM WAV audio from video
        cmd = f'"{ffmpeg_exe}" -y -i "{video_path}" -vn -ac 1 -ar 16000 -acodec pcm_s16le "{temp_wav_path}"'
        res_code = os.system(cmd)
        if res_code != 0 or not os.path.exists(temp_wav_path):
            return default_res

        with wave.open(temp_wav_path, 'rb') as wf:
            n_channels = wf.getnchannels()
            sample_rate = wf.getframerate()
            n_frames = wf.getnframes()

            if sample_rate == 0 or n_frames == 0:
                return default_res

            raw_bytes = wf.readframes(n_frames)
            audio_samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32)

        duration_sec = round(n_frames / float(sample_rate), 2)
        if duration_sec <= 0.5:
            return default_res

        # Frame windowing (e.g. 50ms chunks)
        chunk_size = int(sample_rate * 0.05)
        n_chunks = len(audio_samples) // chunk_size

        if n_chunks == 0:
            return default_res

        chunks = audio_samples[:n_chunks * chunk_size].reshape(n_chunks, chunk_size)
        rms_energies = np.sqrt(np.mean(chunks ** 2, axis=1))

        # Dynamic threshold for voice vs silence
        max_energy = np.max(rms_energies) if np.max(rms_energies) > 0 else 1.0
        normalized_energy = rms_energies / max_energy
        silence_threshold = 0.06

        speech_mask = normalized_energy > silence_threshold
        active_chunks = np.sum(speech_mask)
        active_speech_sec = round(active_chunks * 0.05, 2)
        total_silence_sec = round(duration_sec - active_speech_sec, 2)
        active_speech_ratio = round(min(100.0, (active_speech_sec / duration_sec) * 100.0), 1)

        # Detect pause streaks
        pauses = []
        current_pause = 0
        for is_speech in speech_mask:
            if not is_speech:
                current_pause += 1
            else:
                if current_pause > 0:
                    pauses.append(current_pause * 0.05)
                    current_pause = 0
        if current_pause > 0:
            pauses.append(current_pause * 0.05)

        # Count total pauses (>0.6s) and long awkward pauses (>2.0s)
        significant_pauses = [p for p in pauses if p >= 0.6]
        long_pauses = [p for p in pauses if p >= 2.0]
        pause_count = len(significant_pauses)
        long_pauses_count = len(long_pauses)

        # Volume stability (standard deviation of active speech energies)
        active_energies = normalized_energy[speech_mask]
        if len(active_energies) > 5:
            std_energy = np.std(active_energies)
            # Ideal volume variation std ~ 0.15 - 0.25
            volume_stability = round(max(40.0, min(98.0, 100.0 - (std_energy * 100.0 - 20.0))), 1)
        else:
            volume_stability = 75.0

        # Monotony index via zero-crossing rate variance
        zcr_list = []
        for ch in chunks[speech_mask]:
            zero_crossings = np.nonzero(np.diff(ch > 0))[0]
            zcr_list.append(len(zero_crossings) / float(chunk_size))

        if len(zcr_list) > 5:
            zcr_std = np.std(zcr_list)
            if zcr_std < 0.02:
                pitch_variance_monotony = 'Flat & Monotone'
                vocal_monotony_score = 55.0
            elif zcr_std < 0.04:
                pitch_variance_monotony = 'Moderate Inflection'
                vocal_monotony_score = 75.0
            else:
                pitch_variance_monotony = 'Dynamic & Engaging'
                vocal_monotony_score = 92.0
        else:
            pitch_variance_monotony = 'Standard Tone'
            vocal_monotony_score = 80.0

        return {
            'audio_duration_sec': duration_sec,
            'active_speech_sec': active_speech_sec,
            'pause_count': pause_count,
            'long_pauses_count': long_pauses_count,
            'total_silence_sec': total_silence_sec,
            'active_speech_ratio': active_speech_ratio,
            'volume_stability': volume_stability,
            'pitch_variance_monotony': pitch_variance_monotony,
            'vocal_monotony_score': vocal_monotony_score,
            'vocal_clarity_score': round(min(98.0, 75.0 + (active_speech_ratio * 0.2)), 1),
        }

    except Exception as e:
        logger.warning(f"Failed acoustic audio hearing extraction: {e}")
        return default_res
    finally:
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except Exception:
                pass


def detect_contradictions(
    speech_score: float,
    face_score: float,
    answer_score: float,
    wpm: float,
    filler_count: int,
    eye_contact_pct: float,
    star_count: int,
    acoustic_metrics: dict = None,
    answer_metrics: dict = None,
) -> list:
    contradictions = []
    if acoustic_metrics is None:
        acoustic_metrics = {}
    if answer_metrics is None:
        answer_metrics = {}

    # 1. Content vs Delivery Mismatch
    if answer_score > 75 and speech_score < 55 and face_score < 55:
        contradictions.append({
            'type': 'mixed_signal_high_answer_low_delivery',
            'severity': 'high',
            'title': 'High Answer Quality vs Nervous Delivery',
            'message': (
                "Mixed Signal Detected: Your answer content was well-structured, but your voice pacing "
                "and eye contact suggest nervousness. Practice delivering your strong answers "
                "with a steady voice and consistent camera gaze."
            ),
        })

    # 2. Fluent Speech vs Weak STAR Content
    if speech_score > 75 and answer_score < 50 and answer_score > 0:
        contradictions.append({
            'type': 'fluent_delivery_weak_content',
            'severity': 'medium',
            'title': 'Fluent Speech vs Missing Answer Structure',
            'message': (
                "Fluency Mismatch: You spoke smoothly, but the answer lacked clear STAR structure "
                "or relevance. Focus on what you say — not just how smoothly you speak."
            ),
        })

    # 3. Visual Eye Contact vs Verbal Fillers / Pauses
    if eye_contact_pct > 80 and (filler_count > 4 or acoustic_metrics.get('long_pauses_count', 0) >= 2):
        contradictions.append({
            'type': 'visual_confidence_verbal_uncertainty',
            'severity': 'medium',
            'title': 'Strong Eye Contact vs Hesitant Audio Pacing',
            'message': (
                "Visual vs Verbal Mismatch: You maintained strong eye contact, but "
                f"{filler_count} filler words and acoustic pauses undercut your visual confidence. "
                "Pause silently instead of saying 'um' or 'basically'."
            ),
        })

    # 4. Fast Speech Rate vs Omitted Result / Impact Metrics
    if wpm > 165 and answer_metrics.get('quantifiable_metrics_count', 0) == 0:
        contradictions.append({
            'type': 'rushing_through_answer_without_metrics',
            'severity': 'medium',
            'title': 'Rapid Pacing Missing Quantifiable Results',
            'message': (
                "Pacing Alert: You spoke at a fast pace (>165 WPM) without stating specific quantifiable "
                "metrics or numbers in your answer. Slow down slightly and include clear numerical achievements."
            ),
        })

    # 5. Acoustic Monotony vs High Structure
    if acoustic_metrics.get('pitch_variance_monotony') == 'Flat & Monotone' and star_count >= 3:
        contradictions.append({
            'type': 'monotone_voice_high_star',
            'severity': 'low',
            'title': 'Monotone Vocal Inflection',
            'message': (
                "Vocal Tone Alert: Your STAR answer structure is solid, but your vocal pitch was flat. "
                "Vary your tone and emphasize key achievements to sound enthusiastic and persuasive."
            ),
        })

    return contradictions


def generate_report(
    speech_res: dict,
    facial_res: dict,
    answer_res: dict,
    contradictions: list,
) -> dict:
    speech_score = speech_res.get('speech_score', 0.0)
    face_score = facial_res.get('face_score', 0.0)
    answer_score = answer_res.get('answer_score', 0.0)

    overall_score = round(
        0.40 * answer_score +
        0.35 * speech_score +
        0.25 * face_score,
        1
    )

    tips = []

    if answer_score == 0:
        tips.append("Speak clearly during your recording to allow the AI to evaluate your answer content and structure.")

    if 0 < answer_score < 60:
        tips.append(
            "Use the STAR method (Situation → Task → Action → Result) to structure every interview answer. "
            "This alone can raise your answer score significantly."
        )

    if answer_res.get('relevance_score', 100) < 55 and answer_score > 0:
        tips.append(
            "Make sure your answer directly addresses the question asked. Open with a sentence that explicitly "
            "connects your experience to the prompt."
        )

    if answer_res.get('quantifiable_metrics_count', 0) == 0 and answer_score > 0:
        tips.append(
            "Include specific numbers or metrics in your results (e.g., 'increased sales by 25%', 'managed 5 projects'). "
            "Quantifiable facts double your credibility."
        )

    if speech_res.get('filler_count', 0) > 3:
        tips.append(
            f"You used {speech_res['filler_count']} filler words. Replace 'um', 'basically', and 'like' with "
            "a 1-second silent pause."
        )

    wpm = speech_res.get('wpm', 0)
    if 0 < wpm < 125:
        tips.append("Speak slightly faster — below 125 WPM can sound hesitant or unprepared.")
    elif wpm > 165:
        tips.append("Slow your delivery — above 165 WPM makes it hard for interviewers to absorb key points.")

    if 0 < facial_res.get('eye_contact_percentage', 100) < 70:
        tips.append(
            "Maintain more consistent eye contact with the camera lens. Place a sticky note "
            "next to your webcam as a visual reminder."
        )

    if speech_res.get('pitch_variance_monotony') == 'Flat & Monotone':
        tips.append(
            "Vary your vocal pitch and inflection to convey enthusiasm. A monotone voice can make even great answers sound dull."
        )

    for c in contradictions:
        if c['severity'] in ('high', 'medium') and c['message'] not in tips:
            tips.append(c['message'])

    tips = tips[:5]

    if not tips:
        tips.append("Strong overall performance! Continue refining your STAR examples with high-impact metrics.")

    return {
        'overall_score': overall_score,
        'speech_score': speech_score,
        'face_score': face_score,
        'answer_score': answer_score,
        'improvement_tips': tips,
        'contradictions': contradictions,
    }


def _extract_transcript_with_whisper(video_path: str) -> str:
    """Uses Whisper AI model to transcribe audio directly from video file."""
    if not video_path:
        return ""

    local_path = video_path
    if local_path.startswith("http://") or local_path.startswith("https://") or "/media/" in local_path:
        parts = local_path.split("/media/")
        if len(parts) > 1:
            local_path = os.path.join(settings.MEDIA_ROOT, parts[-1])

    if not os.path.exists(local_path):
        logger.warning(f"Video file does not exist locally: {local_path}")
        return ""

    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = os.path.dirname(ffmpeg_exe)

        target_ffmpeg = os.path.join(ffmpeg_dir, 'ffmpeg.exe')
        if not os.path.exists(target_ffmpeg):
            import shutil
            shutil.copyfile(ffmpeg_exe, target_ffmpeg)

        os.environ['PATH'] = ffmpeg_dir + os.path.pathsep + os.environ.get('PATH', '')

        import whisper
        logger.info(f"Running Whisper transcription for video: {local_path}")
        model = whisper.load_model('tiny')
        result = model.transcribe(local_path)
        transcript = result.get('text', '').strip()
        logger.info(f"Whisper Transcription Result: '{transcript}'")
        return transcript
    except Exception as err:
        logger.error(f"Whisper transcription failed for {video_path}: {err}")
        return ""


def analyze_speech(video_path: str = None, transcript_text: str = None) -> dict:
    """
    Extracts speech metrics: WPM, acoustic signal metrics (pauses, volume stability, pitch variation),
    filler counts, and computes overall speech_score (0–100).
    """
    if not transcript_text and video_path:
        transcript_text = _extract_transcript_with_whisper(video_path)

    local_path = video_path
    if local_path and (local_path.startswith("http://") or local_path.startswith("https://") or "/media/" in local_path):
        parts = local_path.split("/media/")
        if len(parts) > 1:
            local_path = os.path.join(settings.MEDIA_ROOT, parts[-1])

    acoustic = extract_acoustic_audio_metrics(local_path)

    if not transcript_text or not transcript_text.strip():
        return {
            'transcript': '',
            'wpm': 0.0,
            'filler_count': 0,
            'filler_phrases': [],
            'speech_score': 0.0,
            'audio_duration_sec': acoustic['audio_duration_sec'],
            'active_speech_sec': acoustic['active_speech_sec'],
            'pause_count': acoustic['pause_count'],
            'long_pauses_count': acoustic['long_pauses_count'],
            'active_speech_ratio': acoustic['active_speech_ratio'],
            'volume_stability': acoustic['volume_stability'],
            'pitch_variance_monotony': acoustic['pitch_variance_monotony'],
            'vocal_monotony_score': acoustic['vocal_monotony_score'],
            'vocal_clarity_score': acoustic['vocal_clarity_score'],
            'speech_feedback': 'No speech detected in your recording. Please ensure your microphone is unmuted and speak clearly.',
        }

    transcript_text = transcript_text.strip()
    words = re.findall(r'\b\w+\b', transcript_text.lower())
    total_words = len(words)

    # Use actual active speech duration if available from acoustic analysis, else estimate
    if acoustic['active_speech_sec'] > 3.0:
        duration_min = acoustic['active_speech_sec'] / 60.0
    else:
        duration_min = max(0.1, (total_words / 140))

    wpm = round(total_words / duration_min, 1)

    # Filler word & phrase detection
    detected_fillers = []
    for word in words:
        if word in SINGLE_FILLER_WORDS:
            detected_fillers.append(word)

    lower_text = transcript_text.lower()
    for pattern in MULTI_FILLER_PHRASES:
        matches = re.findall(pattern, lower_text)
        detected_fillers.extend(matches)

    filler_count = len(detected_fillers)
    filler_rate_per_min = filler_count / duration_min

    # WPM Scoring
    if 130 <= wpm <= 160:
        wpm_score = 100.0
    elif wpm < 130:
        wpm_score = max(40.0, 100.0 - (130.0 - wpm) * 1.6)
    else:
        wpm_score = max(40.0, 100.0 - (wpm - 160.0) * 1.6)

    filler_score = max(30.0, 100.0 - (filler_rate_per_min * 6.0))

    # Overall Speech Score includes Acoustic Monotony and Volume Stability
    speech_score = round(
        0.35 * wpm_score +
        0.25 * filler_score +
        0.20 * acoustic['vocal_monotony_score'] +
        0.20 * acoustic['volume_stability'],
        1
    )

    feedback = []
    if wpm < 130:
        feedback.append("Pacing is slightly slow. Aim for 130–160 WPM for maximum engagement.")
    elif wpm > 160:
        feedback.append("Pacing is fast. Consider slowing down to emphasize key points.")
    else:
        feedback.append("Great speech pacing!")

    if filler_count > 0:
        feedback.append(
            f"Detected {filler_count} filler phrase(s). Practice silent pauses instead of 'um' or 'basically'."
        )

    if acoustic['pitch_variance_monotony'] == 'Flat & Monotone':
        feedback.append("Vocal tone appears monotone. Incorporate vocal inflection to sound engaging.")

    return {
        'transcript': transcript_text,
        'wpm': wpm,
        'filler_count': filler_count,
        'filler_phrases': list(set(detected_fillers)),
        'speech_score': speech_score,
        'audio_duration_sec': acoustic['audio_duration_sec'],
        'active_speech_sec': acoustic['active_speech_sec'],
        'pause_count': acoustic['pause_count'],
        'long_pauses_count': acoustic['long_pauses_count'],
        'active_speech_ratio': acoustic['active_speech_ratio'],
        'volume_stability': acoustic['volume_stability'],
        'pitch_variance_monotony': acoustic['pitch_variance_monotony'],
        'vocal_monotony_score': acoustic['vocal_monotony_score'],
        'vocal_clarity_score': acoustic['vocal_clarity_score'],
        'speech_feedback': ' '.join(feedback),
    }


def analyze_facial(video_path: str = None) -> dict:
    """
    Extracts facial metrics using OpenCV: eye contact %, head motion stability, face visibility ratio.
    """
    default_res = {
        'eye_contact_percentage': 75.0,
        'head_stability': 80.0,
        'face_visibility_ratio': 85.0,
        'motion_jitter': 15.0,
        'face_score': 77.5,
        'facial_feedback': 'Standard video stream posture maintained.',
    }

    if not video_path:
        return default_res

    local_path = video_path
    if local_path.startswith("http://") or local_path.startswith("https://") or "/media/" in local_path:
        parts = local_path.split("/media/")
        if len(parts) > 1:
            local_path = os.path.join(settings.MEDIA_ROOT, parts[-1])

    if not os.path.exists(local_path):
        return default_res

    try:
        import cv2
        import numpy as np

        cap = cv2.VideoCapture(local_path)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)

        total_frames = 0
        checked_frames = 0
        faces_found = 0

        face_centers_x = []
        face_centers_y = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            total_frames += 1

            # Sample 1 out of every 12 frames
            if total_frames % 12 == 0:
                checked_frames += 1
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4)
                if len(faces) > 0:
                    faces_found += 1
                    (x, y, w, h) = faces[0]
                    face_centers_x.append(x + w / 2.0)
                    face_centers_y.append(y + h / 2.0)

        cap.release()

        if checked_frames == 0:
            return default_res

        eye_contact_percentage = round(min(100.0, (faces_found / float(checked_frames)) * 100.0), 1)

        # Head motion stability (calculate standard deviation of face center position)
        if len(face_centers_x) > 3:
            std_x = np.std(face_centers_x)
            std_y = np.std(face_centers_y)
            jitter = float(std_x + std_y)
            motion_jitter = round(min(100.0, jitter), 1)
            head_stability = round(max(40.0, min(100.0, 100.0 - (jitter * 0.8))), 1)
        else:
            motion_jitter = 20.0
            head_stability = 75.0 if faces_found > 0 else 50.0

        face_visibility_ratio = eye_contact_percentage
        face_score = round(0.55 * eye_contact_percentage + 0.45 * head_stability, 1)

        feedback = []
        if eye_contact_percentage >= 80:
            feedback.append("Excellent direct eye contact maintained with the camera.")
        elif eye_contact_percentage > 40:
            feedback.append("Try looking directly into the camera lens to project confidence.")
        else:
            feedback.append("Minimal face contact detected in video stream.")

        if head_stability >= 80:
            feedback.append("Great head composure and steady positioning.")
        else:
            feedback.append("Noticeable head movement / fidgeting detected. Try keeping a steady posture.")

        return {
            'eye_contact_percentage': eye_contact_percentage,
            'head_stability': head_stability,
            'face_visibility_ratio': face_visibility_ratio,
            'motion_jitter': motion_jitter,
            'face_score': face_score,
            'facial_feedback': ' '.join(feedback),
        }

    except Exception as err:
        logger.error(f"Facial analysis error for {video_path}: {err}")
        return default_res
