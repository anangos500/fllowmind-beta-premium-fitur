
import React from 'react';

const TackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
    {/* Drop Shadow */}
    <circle cx="13" cy="14" r="6" fill="black" fillOpacity="0.2" />
    
    {/* Main Pin Head */}
    <circle cx="12" cy="12" r="7" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
    
    {/* Inner Detail / Indent */}
    <circle cx="12" cy="12" r="4" fill="#f87171" />
    
    {/* Center Point (Metal part visible from top) */}
    <circle cx="12" cy="12" r="1.5" fill="#7f1d1d" opacity="0.8" />
    
    {/* Glossy Highlight */}
    <path d="M9 9 Q 10.5 7.5 12.5 7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

export default TackIcon;
