'use client';

import { useMemo } from 'react';

export interface StarAnalysis {
  hasSituation: boolean;
  hasTask: boolean;
  hasAction: boolean;
  hasResult: boolean;
  score: number;
  missingPhase: 'Situation' | 'Task' | 'Action' | 'Result' | null;
  coachingTip: string;
}

const SITUATION_KEYWORDS = [
  'when i was', 'at my previous', 'the company', 'the team was', 'the project',
  'the challenge', 'the issue', 'we were facing', 'in my role', 'the background',
  'client came to us', 'system had a problem', 'legacy system'
];

const TASK_KEYWORDS = [
  'my goal', 'my responsibility', 'i was tasked', 'i needed to', 'the objective',
  'i had to', 'the target was', 'my job was', 'we needed to', 'the deadline was',
  'i was asked to', 'we set out to'
];

const ACTION_KEYWORDS = [
  'i implemented', 'i built', 'i created', 'i designed', 'i led', 'i refactored',
  'i developed', 'i analyzed', 'i configured', 'i set up', 'i optimized',
  'i migrated', 'i debugged', 'i collaborated', 'i wrote', 'i deployed', 'i introduced'
];

const RESULT_PATTERNS = [
  /\b\d+(\.\d+)?%/i,
  /\b(increased|reduced|decreased|improved|grew|saved|boosted|cut|lowered)\b/i,
  /\b(percent|million|thousand|billion|ms|seconds|minutes|hours)\b/i,
  /\bresulted in\b/i,
  /\bthe outcome was\b/i,
  /\bby \d+/i,
  /\b\$\d+/i,
  /\b\d+x\b/i
];

export function useStarAnalyzer(text: string): StarAnalysis {
  return useMemo(() => {
    const cleanText = text.toLowerCase().trim();

    if (!cleanText || cleanText.length < 15) {
      return {
        hasSituation: false,
        hasTask: false,
        hasAction: false,
        hasResult: false,
        score: 0,
        missingPhase: 'Situation',
        coachingTip: 'Start your response with the Situation (context/background).',
      };
    }

    const hasSituation = SITUATION_KEYWORDS.some((kw) => cleanText.includes(kw)) || cleanText.length > 30;
    const hasTask = TASK_KEYWORDS.some((kw) => cleanText.includes(kw)) || (hasSituation && cleanText.length > 50);
    const hasAction = ACTION_KEYWORDS.some((kw) => cleanText.includes(kw)) || (cleanText.includes('i ') && cleanText.length > 70);
    const hasResult = RESULT_PATTERNS.some((pattern) => pattern.test(cleanText));

    let detectedCount = 0;
    if (hasSituation) detectedCount++;
    if (hasTask) detectedCount++;
    if (hasAction) detectedCount++;
    if (hasResult) detectedCount++;

    const score = Math.round((detectedCount / 4) * 100);

    let missingPhase: 'Situation' | 'Task' | 'Action' | 'Result' | null = null;
    let coachingTip = 'Excellent structured response!';

    if (!hasSituation) {
      missingPhase = 'Situation';
      coachingTip = 'Briefly state the Situation (context/project background).';
    } else if (!hasTask) {
      missingPhase = 'Task';
      coachingTip = 'State your specific Task or responsibility in the situation.';
    } else if (!hasAction) {
      missingPhase = 'Action';
      coachingTip = 'Highlight your specific Actions ("I built...", "I led...").';
    } else if (!hasResult) {
      missingPhase = 'Result';
      coachingTip = 'Add quantifiable Results (metrics, %, numbers, or business impact)!';
    }

    return {
      hasSituation,
      hasTask,
      hasAction,
      hasResult,
      score,
      missingPhase,
      coachingTip,
    };
  }, [text]);
}
