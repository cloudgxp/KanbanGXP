import React from 'react';
import { X, Shield, Code, Heart, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
              <Info size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">About KanbanGXP</h2>
              <p className="text-sm text-slate-500 font-medium">Simple, private, and local-first.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        <div className="p-8 overflow-y-auto space-y-8">
          {/* Origin Story */}
          <section>
            <p className="text-slate-600 leading-relaxed">
              <strong>KanbanGXP</strong> is designed by <a href="https://github.com/cloudgxp" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">CloudGXP</a>. 
              It was originally created as a personal project management tool for individual and private use.
            </p>
          </section>

          {/* Privacy First */}
          <section className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <Shield size={20} />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">100% Private & Local</h3>
            </div>
            <p className="text-emerald-800 text-sm mb-4 leading-relaxed">
              The app is intentionally designed to be simple, private, and local-first. The goal is to give you a project management tool that you fully control.
            </p>
            <ul className="space-y-3 text-sm text-emerald-700">
              <li className="flex items-start gap-2">
                <CheckIcon /> <span>Stores all data locally in your browser</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> <span>Does not use any databases</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> <span>There are no user accounts or login systems</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> <span>Does not track users or collect analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> <span>No personal data is sent to servers</span>
              </li>
            </ul>
          </section>

          {/* Free & Open */}
          <section className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Heart size={20} />
              </div>
              <h3 className="text-lg font-bold text-indigo-900">Free & Open</h3>
            </div>
            <p className="text-indigo-800 text-sm mb-4 leading-relaxed">
              This project is free and open for anyone to use. We believe in empowering individuals to manage their work without compromising their data. You are welcome to:
            </p>
            <ul className="space-y-3 text-sm text-indigo-700">
              <li className="flex items-start gap-2">
                <Code size={16} className="shrink-0 mt-0.5 opacity-70" /> 
                <span>Use it for personal or professional planning</span>
              </li>
              <li className="flex items-start gap-2">
                <Code size={16} className="shrink-0 mt-0.5 opacity-70" /> 
                <span>Modify the code to suit your needs</span>
              </li>
              <li className="flex items-start gap-2">
                <Code size={16} className="shrink-0 mt-0.5 opacity-70" /> 
                <span>Redistribute it</span>
              </li>
              <li className="flex items-start gap-2">
                <Code size={16} className="shrink-0 mt-0.5 opacity-70" /> 
                <span>Self-host your own version</span>
              </li>
            </ul>
          </section>
        </div>
        
        <footer className="px-8 py-6 border-t border-slate-100 bg-slate-50 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md"
          >
            Close
          </button>
        </footer>
      </motion.div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
