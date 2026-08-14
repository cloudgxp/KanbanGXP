import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface SparkleWrapperProps {
  isSparkling: boolean;
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
}

export const SparkleWrapper: React.FC<SparkleWrapperProps> = ({ 
  isSparkling, 
  children, 
  className,
  tooltip
}) => {
  if (!isSparkling) {
    return <div className={cn("relative inline-flex items-center", className)}>{children}</div>;
  }

  return (
    <div 
      className={cn("relative inline-flex items-center group/sparkle", className)}
      title={tooltip}
    >
      {/* Radiant Glowing Shimmer Background Aura */}
      <div 
        className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 opacity-80 blur-md animate-pulse pointer-events-none transition-all duration-500"
        aria-hidden="true"
      />

      {/* Floating Animated Sparkle Particles */}
      {/* Top Left Sparkle */}
      <motion.span
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.2, 0.8, 1.3, 0],
          rotate: [0, 90, 180, 270, 360],
          opacity: [0, 1, 0.8, 1, 0],
          y: [-2, -8, -4, -10, -2],
          x: [-2, -6, -3, -8, -2],
        }}
        transition={{ 
          duration: 2.4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute -top-2.5 -left-2.5 text-amber-300 pointer-events-none z-20"
        aria-hidden="true"
      >
        <Sparkles size={16} className="fill-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
      </motion.span>

      {/* Top Right Sparkle */}
      <motion.span
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1, 1.4, 0.9, 0],
          rotate: [45, 135, 225, 315, 405],
          opacity: [0, 0.9, 1, 0.8, 0],
          y: [0, -6, -2, -8, 0],
          x: [2, 6, 3, 8, 2],
        }}
        transition={{ 
          duration: 2.8, 
          repeat: Infinity, 
          delay: 0.6,
          ease: "easeInOut" 
        }}
        className="absolute -top-3 -right-2 text-indigo-200 pointer-events-none z-20"
        aria-hidden="true"
      >
        <Sparkles size={18} className="fill-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.9)]" />
      </motion.span>

      {/* Bottom Left Sparkle */}
      <motion.span
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.1, 0.7, 1.2, 0],
          rotate: [0, -90, -180, -270, -360],
          opacity: [0, 0.8, 1, 0.7, 0],
          y: [2, 6, 3, 8, 2],
          x: [-2, -5, -1, -6, -2],
        }}
        transition={{ 
          duration: 2.2, 
          repeat: Infinity, 
          delay: 1.1,
          ease: "easeInOut" 
        }}
        className="absolute -bottom-2 -left-1.5 text-purple-200 pointer-events-none z-20"
        aria-hidden="true"
      >
        <Sparkles size={14} className="fill-purple-300 drop-shadow-[0_0_6px_rgba(216,180,254,0.9)]" />
      </motion.span>

      {/* Bottom Right Sparkle */}
      <motion.span
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.3, 0.9, 1.2, 0],
          rotate: [30, 120, 210, 300, 390],
          opacity: [0, 1, 0.8, 1, 0],
          y: [1, 7, 4, 9, 1],
          x: [1, 5, 2, 7, 1],
        }}
        transition={{ 
          duration: 2.6, 
          repeat: Infinity, 
          delay: 1.7,
          ease: "easeInOut" 
        }}
        className="absolute -bottom-2.5 -right-2.5 text-amber-200 pointer-events-none z-20"
        aria-hidden="true"
      >
        <Sparkles size={15} className="fill-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]" />
      </motion.span>

      {/* Main Element (Button) */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
