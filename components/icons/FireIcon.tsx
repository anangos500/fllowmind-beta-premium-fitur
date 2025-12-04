import React from 'react';

const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* Api luar – bentuk drop simple, cocok untuk ditumpuk */}
    <path d="M12 2C10 5 8 7.8 8 11c0 3.3 1.8 6 4 6s4-2.7 4-6c0-3.2-2-6-4-9z" />
  </svg>
);

export default FireIcon;
