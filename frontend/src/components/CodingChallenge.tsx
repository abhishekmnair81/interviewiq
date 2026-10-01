import React, { useState, useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { apiFetch } from '@/lib/api';

loader.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs' } });

export interface CodingChallengeProps {
  questionId: string;
  index?: number;
  total?: number;
  title: string;
  description: string;
  initialCode: string;
  language: string;
  examples?: Array<{ input: string; expected_output: string; }>;
  onSubmitCode: (code: string, language: string, questionId: string) => void;
  onCopyPasteDetected: () => void;
  timeLimitSeconds?: number;
}

const STARTER_CODE: Record<string, Record<string, string>> = {
  java_even_odd: {
    c: `#include <stdio.h>\n\nvoid checkEvenOdd(int n) {\n    // Write your code here\n}\n\nint main() {\n    checkEvenOdd(10);\n    return 0;\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nvoid checkEvenOdd(int n) {\n    // Write your code here\n}\n\nint main() {\n    checkEvenOdd(10);\n    return 0;\n}`,
    python: `def check_even_odd(n):\n    # Write your code here\n    pass\n\ncheck_even_odd(10)`,
    java: `public class Main {\n    public static void checkEvenOdd(int n) {\n        // Write your code here\n    }\n\n    public static void main(String[] args) {\n        checkEvenOdd(10);\n    }\n}`,
  },
};

const getStarterCode = (questionId: string, lang: string, defaultLang: string, defaultCode: string) => {
  if (lang.toLowerCase() === defaultLang.toLowerCase()) return defaultCode;
  return STARTER_CODE[questionId]?.[lang.toLowerCase()] || '// Write your code here\n';
};

export function CodingChallenge({
  questionId,
  index = 1,
  total = 1,
  title,
  description,
  initialCode,
  language,
  examples = [],
  onSubmitCode,
  onCopyPasteDetected,
  timeLimitSeconds = 300
}: CodingChallengeProps) {
  // Try to load preferred language from localStorage
  const getInitialLanguage = () => {
    try {
      const saved = localStorage.getItem('preferred_language');
      if (saved && ['c', 'cpp', 'python', 'java'].includes(saved.toLowerCase())) {
        return saved.toLowerCase();
      }
    } catch (e) {}
    return language.toLowerCase();
  };

  const [selectedLanguage, setSelectedLanguage] = useState(getInitialLanguage());
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({});
  const [code, setCode] = useState('');
  
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);

  // Monaco loads its engine from a CDN. If that is slow/blocked (or the editor
  // fails to lay out inside the flex container), fall back to a plain textarea
  // so the candidate can ALWAYS see and edit the starter code.
  const [monacoReady, setMonacoReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (monacoReady) return;
    const t = setTimeout(() => {
      if (!monacoReady) setUseFallback(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [monacoReady]);

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    setMonacoReady(true);
    setUseFallback(false);
    // Force a layout pass on the next frame — fixes the collapsed/zero-height
    // editor that can occur when Monaco mounts before the flex box is sized.
    requestAnimationFrame(() => {
      try { editor.layout(); } catch {}
    });
  };

  // Update initialCode when it changes (for next questions)
  useEffect(() => {
    const initLang = getInitialLanguage();
    setSelectedLanguage(initLang);
    
    const starter = getStarterCode(questionId, initLang, language, initialCode);
    setCode(starter);
    setCodeByLanguage({ [initLang]: starter });
    
    setOutput('');
    setIsSubmitting(false);
    setIsRunning(false);
    setTimeLeft(timeLimitSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, questionId, timeLimitSeconds, language]);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!isSubmitting) {
        handleSubmit();
      }
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isSubmitting]);

  const langMap: Record<string, string> = {
    'python': 'python',
    'c': 'c',
    'cpp': 'cpp',
    'java': 'java'
  };

  const handleLanguageChange = (newLang: string) => {
    // Save current code
    setCodeByLanguage(prev => ({ ...prev, [selectedLanguage]: code }));
    
    // Load code for new language
    setSelectedLanguage(newLang);
    
    try {
      localStorage.setItem('preferred_language', newLang);
    } catch (e) {}

    // Check if we have cached code for the new language, otherwise load starter
    setCode(codeByLanguage[newLang] || getStarterCode(questionId, newLang, language, initialCode));
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Running code...\n');
    
    try {
      // Map inputs if examples exist
      const stdin = examples && examples.length > 0 ? examples[0].input : '';
      
      const data = await apiFetch<any>('/analysis/code/run/', {
        method: 'POST',
        body: JSON.stringify({
          source_code: code,
          language: selectedLanguage,
          stdin: stdin
        })
      });
      
      let out = '';
      if (data.status_desc) {
        out += `Status: ${data.status_desc}\n`;
      }
      if (data.stdout) {
        out += `\nOutput:\n${data.stdout}\n`;
      }
      if (data.stderr) {
        out += `\nErrors:\n${data.stderr}\n`;
      }
      if (data.exception) {
        out += `\nException:\n${data.exception}\n`;
      }
      setOutput(out || data.stderr || data.stdout || data.exception || 'No output received.');
    } catch (err: any) {
      setOutput(`Failed to run code: ${err.message || 'Unknown error occurred.'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    onSubmitCode(code, selectedLanguage, questionId);
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    onCopyPasteDetected();
  };
  
  const handleCopyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output);
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
  const isTimeLow = timeLeft < 60;

  return (
    <div className="flex flex-col md:flex-row h-full w-full glass-card overflow-hidden shadow-2xl">
      
      {/* Left Pane: Code Editor (60%) */}
      <div className="w-full md:w-[60%] flex flex-col border-r border-slate-700 h-full">
        <div className="flex justify-between items-center bg-surface-1/50 px-4 py-2 border-b border-surface">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-300">Monaco Editor</span>
            <div className="flex items-center gap-2">
              {/* Language Icon logic can go here if we add SVGs, for now just a small dot or text */}
              <span className="text-sm">
                {selectedLanguage === 'python' ? '🐍' : 
                 selectedLanguage === 'java' ? '☕' : 
                 selectedLanguage === 'cpp' ? '⚙️' : '📝'}
              </span>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-surface-2 text-white text-xs px-2 py-1 rounded border border-surface focus:outline-none focus:border-primary-500"
              >
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-xs font-bold px-2 py-1 rounded ${isTimeLow ? 'bg-rose-900/50 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
              ⏱ {timeString}
            </div>
            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded shadow-sm disabled:opacity-50 transition flex items-center gap-1"
            >
              {isRunning && <span className="w-2 h-2 rounded-full border-2 border-white border-t-transparent animate-spin"></span>}
              {isRunning ? 'Running...' : '▶ Run Code'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
              className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded shadow-sm disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Submitting...' : '✅ Submit'}
            </button>
          </div>
        </div>
        
        <div className="flex-1 relative min-h-[420px] bg-[#1e1e1e]" onPaste={handlePaste} onPasteCapture={handlePaste}>
          {useFallback ? (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="absolute inset-0 w-full h-full resize-none bg-[#1e1e1e] text-slate-100 font-mono text-sm p-4 outline-none border-0 leading-relaxed"
              style={{ fontFamily: "'Fira Code', 'JetBrains Mono', monospace", tabSize: 4 }}
            />
          ) : (
            <div className="absolute inset-0">
              <Editor
                key={selectedLanguage}
                height="100%"
                language={langMap[selectedLanguage] || 'python'}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                onMount={handleEditorMount}
                loading={
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></span>
                    Loading editor…
                  </div>
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  cursorBlinking: 'smooth',
                  pasteAs: { enabled: false },
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Right Pane: Description & Output (40%) */}
      <div className="w-full md:w-[40%] flex flex-col h-full bg-[#1e1e1e]">
        {/* Description section */}
        <div className="flex-1 overflow-y-auto p-5 border-b border-surface bg-surface-1/30">
          <div className="mb-4 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Question {index} of {total}</span>
              <h2 className="text-lg font-bold text-white mt-1">{title}</h2>
            </div>
          </div>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {description}
          </div>
          
          {examples && examples.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-500">Examples</h3>
              {examples.map((ex, i) => (
                <div key={i} className="bg-surface-2/50 p-3 rounded border border-surface">
                  <div className="text-[11px] text-slate-400 mb-1">Input:</div>
                  <pre className="text-xs text-indigo-300 font-mono mb-2 whitespace-pre-wrap">{ex.input}</pre>
                  <div className="text-[11px] text-slate-400 mb-1">Expected Output:</div>
                  <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap">{ex.expected_output}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Terminal / Output section */}
        <div className="h-[40%] flex flex-col">
          <div className="bg-surface-1/50 px-4 py-1.5 border-b border-surface flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Terminal Output
            </span>
            <button 
              onClick={handleCopyOutput}
              title="Copy output"
              className="text-xs text-slate-400 hover:text-white transition"
            >
              📋 Copy
            </button>
          </div>
          <div className="flex-1 bg-surface-1/10 p-4 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
            {output || 'Output will appear here after running your code.'}
          </div>
        </div>
      </div>

    </div>
  );
}
