'use client';

import React, { useState, useRef } from 'react';
import { apiFetch, UserProfile } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

interface ResumeUploadProps {
  user: UserProfile;
  onUpdate: (user: UserProfile) => void;
}

export default function ResumeUpload({ user, onUpdate }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File size exceeds 5MB limit.', variant: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    setIsUploading(true);
    try {
      const updatedUser = await apiFetch<UserProfile>('/users/resume/', {
        method: 'POST',
        body: formData,
      });
      onUpdate(updatedUser);
      toast({ title: 'Resume uploaded and parsed successfully!', variant: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Failed to upload resume.', variant: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const updatedUser = await apiFetch<UserProfile>('/users/resume/', {
        method: 'DELETE',
      });
      onUpdate(updatedUser);
      toast({ title: 'Resume deleted.', variant: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Failed to delete resume.', variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            Professional Resume
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload your resume to receive highly personalized, experience-based questions.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.docx,.txt"
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {user.has_resume ? (
            <motion.div
              key="has-resume"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.resume_filename}</p>
                    <p className="text-xs text-slate-400">
                      Uploaded {new Date(user.resume_uploaded_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerSelect}
                    disabled={isUploading || isDeleting}
                    className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Replace
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isUploading || isDeleting}
                    className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded bg-red-400/10 hover:bg-red-400/20 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {user.resume_summary && (
                <div className="mt-2 pt-3 border-t border-slate-800">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Parsed Highlights</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {user.resume_summary.skills?.map((skill: string) => (
                      <span key={skill} className="px-2 py-1 text-[10px] font-medium bg-slate-800 text-cyan-300 rounded border border-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {user.resume_summary.experience_count} roles & {user.resume_summary.project_count} projects found.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="no-resume"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <button
                onClick={triggerSelect}
                disabled={isUploading}
                className="w-full group relative overflow-hidden rounded-xl border border-dashed border-slate-600 bg-slate-900/30 p-8 text-center transition-all hover:bg-slate-800/50 hover:border-cyan-500/50"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <svg className="w-8 h-8 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm font-medium text-cyan-400">Parsing AI insights...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="rounded-full bg-slate-800 p-3 text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">Click to upload resume</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT up to 5MB</p>
                    </div>
                  </div>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
