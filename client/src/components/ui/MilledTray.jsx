import React from 'react';

export default function MilledTray({ children, className = '', ...props }) {
  return (
    <div
      className={`milled-tray p-3.5 select-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
