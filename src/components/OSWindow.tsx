import { Maximize2, Minus, X, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface OSWindowProps {
  children: React.ReactNode;
  title?: string;
}

interface Position {
  x: number;
  y: number;
}

export const OSWindow = ({ children, title = "kuk.uh" }: OSWindowProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && isPreview) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isPreview]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMaximize = () => {
    console.log("Maximizing window");
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
    setIsPreview(false);
    setPosition({ x: 0, y: 0 });
  };

  const handleMinimize = () => {
    console.log("Minimizing window");
    setIsMinimized(!isMinimized);
    setIsMaximized(false);
    setIsPreview(false);
    setPosition({ x: 0, y: 0 });
  };

  const handlePreview = () => {
    console.log("Toggling preview mode");
    setIsPreview(!isPreview);
    setIsMaximized(false);
    setIsMinimized(false);
    setPosition({ x: 0, y: 0 });
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-background/50 backdrop-blur-xl rounded-lg border border-border shadow-lg p-2 cursor-pointer transform transition-all duration-300 hover:scale-105"
        onClick={() => setIsMinimized(false)}
      >
        <div className="text-xs font-mono text-foreground/80">{title}</div>
      </div>
    );
  }

  return (
    <div 
      ref={windowRef}
      className={`transition-all duration-300 ease-in-out ${
        isMaximized ? 'fixed inset-0 m-0 rounded-none z-50' : 
        isPreview ? `fixed z-50 ${isMobile ? 'w-[90%] bottom-4 right-4' : 'w-1/3 bottom-8 right-8'} rounded-lg shadow-2xl scale-90 hover:scale-95` :
        'mx-auto max-w-5xl rounded-lg my-8'
      }`}
      style={
        isPreview ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        } : undefined
      }
    >
      <div className={`${
        isMaximized ? 'w-full h-full' : 'w-full'
      } bg-background/50 backdrop-blur-xl rounded-lg border border-border shadow-2xl overflow-hidden`}>
        {/* Window Controls */}
        <div 
          className="bg-background/50 px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center justify-between"
          onMouseDown={handleMouseDown}
          onTouchStart={() => console.log('Touch start')}
        >
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button 
              onClick={handleMinimize}
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-destructive cursor-pointer hover:opacity-80 transition-opacity"
              title="Minimize"
            />
            <button
              onClick={handlePreview}
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 cursor-pointer hover:opacity-80 transition-opacity"
              title="Preview"
            />
            <button
              onClick={handleMaximize}
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 cursor-pointer hover:opacity-80 transition-opacity"
              title="Maximize"
            />
          </div>
          <div className="text-xs sm:text-sm font-mono text-foreground/80">{title}</div>
          <div className="flex items-center space-x-2 sm:space-x-4 text-foreground/60">
            <Minus 
              className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer hover:text-foreground transition-colors" 
              onClick={handleMinimize}
            />
            <Maximize2 
              className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer hover:text-foreground transition-colors" 
              onClick={handleMaximize}
            />
            <X 
              className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer hover:text-foreground transition-colors" 
              onClick={handlePreview}
            />
          </div>
        </div>
        
        {/* Back Button - Only shows in preview mode */}
        {isPreview && (
          <Button
            onClick={() => setIsPreview(false)}
            className="absolute top-16 left-4 font-bold text-lg bg-background/90 hover:bg-background/70 transition-all duration-300"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> ⬅️ Back
          </Button>
        )}

        {/* Content */}
        <div className={`${
          isMaximized ? 'h-[calc(100vh-3rem)]' : 'max-h-[calc(100vh-8rem)]'
        } overflow-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
};