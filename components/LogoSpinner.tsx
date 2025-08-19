import * as React from 'react';
import { logoBase64 } from '../assets/logo.ts';

const LogoSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-24">
      <img
        src={logoBase64}
        alt="Loading..."
        className="h-20 w-20 object-contain logo-spinner"
      />
    </div>
  );
};

export default LogoSpinner;