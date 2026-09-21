import React, { useState } from 'react';
import Image from 'next/image';

export type AlexAvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

interface AlexImageCharacterProps {
  state: AlexAvatarState;
  alexText?: string;
  candidateName?: string;
  jobRole?: string;
}

export function AlexImageCharacter({ state }: AlexImageCharacterProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#070b14] overflow-hidden">
      {/* Background glow when speaking */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isSpeaking ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/30 blur-[60px] rounded-full animate-pulse" />
      </div>

      {/* Image container */}
      <div 
        className={`relative w-[90%] h-[90%] md:w-[80%] md:h-[100%] transition-all duration-700 ease-in-out flex items-end justify-center ${
          isSpeaking ? 'animate-breathe' : ''
        } ${isThinking ? 'brightness-75' : 'brightness-100'}`}
      >
        {!imageError ? (
          <Image
            src="/models/alex.png"
            alt="Alex - AI Interviewer"
            fill
            priority
            className={`object-contain object-bottom transition-opacity duration-300 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-lg opacity-50">
            <svg className="w-32 h-32 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C9.243 2 7 4.243 7 7C7 9.757 9.243 12 12 12C14.757 12 17 9.757 17 7C17 4.243 14.757 2 12 2ZM12 14C7.589 14 4 15.791 4 18V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V18C20 15.791 16.411 14 12 14Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Thinking overlay */}
      {isThinking && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/60 backdrop-blur-sm px-6 py-3 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-2 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Loading state */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-[#070b14]/95 z-30 flex flex-col items-center justify-center gap-4">
          <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-white tracking-wider uppercase">Loading AI Interviewer…</p>
        </div>
      )}
    </div>
  );
}
