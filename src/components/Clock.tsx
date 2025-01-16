import { useEffect, useState } from 'react';

export const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-black/20 backdrop-blur-lg px-4 py-1.5 rounded-full text-sm font-mono text-white/90 shadow-lg">
        {time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })}
      </div>
    </div>
  );
};