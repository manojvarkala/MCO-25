import React, { FC } from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const Spinner: FC<SpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} border-solid border-current border-t-transparent`}
      role="status"
    >
        <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;