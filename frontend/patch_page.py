import re

with open(r'e:\interviewiq\frontend\src\app\interview\live\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Patch codingChallengeData state
old_coding_state = """  const [codingChallengeData, setCodingChallengeData] = useState<{
    question_id: string;
    title: string;
    description: string;
    starter_code: string;
    language: string;
  } | null>(null);"""

new_coding_state = """  const [codingChallengeData, setCodingChallengeData] = useState<{
    question_id: string;
    index: number;
    total: number;
    title: string;
    description: string;
    starter_code: string;
    language: string;
    examples: Array<{ input: string; expected_output: string; }>;
    time_limit_seconds: number;
  } | null>(null);
  const [codingSubmissionResult, setCodingSubmissionResult] = useState<{
    passed: boolean;
    feedback: string;
    nextChallenge: any;
  } | null>(null);"""

content = content.replace(old_coding_state, new_coding_state)

# Patch WebSocket message handler
old_message_handler = """    } else if (latestMessage.type === 'coding_challenge') {
      isCodingPhaseRef.current = true;
      setCodingChallengeData({
        question_id: latestMessage.question_id || '',
        title: latestMessage.title || '',
        description: latestMessage.description || '',
        starter_code: latestMessage.starter_code || '',
        language: latestMessage.language || ''
      });
      setAppState('CODING_PHASE');
    } else if (latestMessage.type === 'interview_terminated') {"""

new_message_handler = """    } else if (latestMessage.type === 'coding_challenge') {
      isCodingPhaseRef.current = true;
      setCodingChallengeData({
        question_id: latestMessage.challenge.id,
        index: latestMessage.challenge.index,
        total: latestMessage.challenge.total,
        title: latestMessage.challenge.title,
        description: latestMessage.challenge.description,
        starter_code: latestMessage.challenge.starter_code,
        language: latestMessage.challenge.language,
        examples: latestMessage.challenge.examples,
        time_limit_seconds: latestMessage.challenge.time_limit_seconds
      });
      setCodingSubmissionResult(null);
      setAppState('CODING_PHASE');
    } else if (latestMessage.type === 'submission_result') {
      setCodingSubmissionResult({
        passed: latestMessage.passed,
        feedback: latestMessage.feedback,
        nextChallenge: latestMessage.next_challenge
      });
    } else if (latestMessage.type === 'interview_terminated') {"""

content = content.replace(old_message_handler, new_message_handler)

# Change layout for CODING_PHASE
# Right now, CODING_PHASE replaces the entire main block. We want to show it on the right side.
# Let's find the main element for ALEX_SPEAKING | USER_TURN | PROCESSING
main_grid_regex = re.compile(r"\{\(appState === 'ALEX_SPEAKING' \|\| appState === 'USER_TURN' \|\| appState === 'PROCESSING'\) && \(")
content = main_grid_regex.sub("{(appState === 'ALEX_SPEAKING' || appState === 'USER_TURN' || appState === 'PROCESSING' || appState === 'CODING_PHASE') && (", content)

# Inside this block, there is the second glass-card.
second_glass_card = """          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl border border-slate-200/90">"""

new_second_glass_card = """          {appState === 'CODING_PHASE' && codingChallengeData ? (
            <div className="flex flex-col h-full z-10 min-h-[600px] w-full">
              <CodingChallenge 
                questionId={codingChallengeData.question_id}
                index={codingChallengeData.index}
                total={codingChallengeData.total}
                title={codingChallengeData.title}
                description={codingChallengeData.description}
                initialCode={codingChallengeData.starter_code}
                language={codingChallengeData.language}
                examples={codingChallengeData.examples}
                timeLimitSeconds={codingChallengeData.time_limit_seconds}
                onSubmitCode={handleSubmitCode}
                onCopyPasteDetected={handleCopyPasteDetected}
              />
              
              {codingSubmissionResult && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 rounded-3xl">
                  <div className="bg-[#252526] border border-slate-700 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {codingSubmissionResult.passed ? '✅ Submission Processed' : '❌ Tests Failed'}
                    </h3>
                    <div className="bg-[#1e1e1e] p-4 rounded-lg border border-slate-700 mb-6 mt-4 text-sm text-slate-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Alex's Feedback</span>
                      {codingSubmissionResult.feedback}
                    </div>
                    
                    {codingSubmissionResult.nextChallenge ? (
                       <button
                         onClick={() => {
                           const chal = codingSubmissionResult.nextChallenge;
                           setCodingChallengeData({
                             question_id: chal.id,
                             index: chal.index,
                             total: chal.total,
                             title: chal.title,
                             description: chal.description,
                             starter_code: chal.starter_code,
                             language: chal.language,
                             examples: chal.examples,
                             time_limit_seconds: chal.time_limit_seconds
                           });
                           setCodingSubmissionResult(null);
                         }}
                         className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
                       >
                         Next Question →
                       </button>
                    ) : (
                       <button
                         onClick={() => {
                           setCodingSubmissionResult(null);
                         }}
                         className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                       >
                         Complete Coding Assessment
                       </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl border border-slate-200/90">"""
content = content.replace(second_glass_card, new_second_glass_card)

# Close the newly added condition at the end of the second glass-card
end_second_glass_card_regex = re.compile(r"              </div>\s*</div>\s*</main>")
content = end_second_glass_card_regex.sub("              </div>\n            </div>\n          )}\n        </main>", content)

# Remove the old CODING_PHASE block entirely
old_coding_phase = """      {/* Coding Phase */}
      {appState === 'CODING_PHASE' && codingChallengeData && (
        <main className="flex-1 p-6 z-10 flex flex-col h-[calc(100vh-100px)] min-h-[600px]">
          <CodingChallenge 
            questionId={codingChallengeData.question_id}
            title={codingChallengeData.title}
            description={codingChallengeData.description}
            initialCode={codingChallengeData.starter_code}
            language={codingChallengeData.language}
            onSubmitCode={handleSubmitCode}
            onCopyPasteDetected={handleCopyPasteDetected}
          />
        </main>
      )}"""

content = content.replace(old_coding_phase, "")

with open(r'e:\interviewiq\frontend\src\app\interview\live\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched page.tsx")
