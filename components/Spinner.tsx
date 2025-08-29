import React, { FC } from 'react';

const Spinner: FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
    </div>
  );
};

export default Spinner;