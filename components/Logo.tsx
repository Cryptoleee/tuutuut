import React from 'react';
import { Wrench } from 'lucide-react';

interface Props {
  size?: number;
  className?: string;
}

const Logo: React.FC<Props> = ({ size = 24, className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
        <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl text-white shadow-sm">
            <Wrench size={size * 0.6} strokeWidth={2.5} />
        </div>
    </div>
  );
};

export default Logo;