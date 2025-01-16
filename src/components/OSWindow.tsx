import { Maximize2, Minus, X } from 'lucide-react';
import { useState } from 'react';

interface OSWindowProps {
  children: React.ReactNode;
  title?: string;
}

export const OSWindow = ({ children, title = "kukuh.link" }: OSWindowProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const handleMaximize = () => {
    console.log("Maximizing window");
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
    setIsPreview(false);
  };

  const handleMinimize = () => {
    console.log("Minimizing window");
    setIsMinimized(!isMinimized);
    setIsMaximized(false);
    setIsPreview(false);
  };

  const handlePreview = () => {
    console.log("Toggling preview mode");
    setIsPreview(!isPreview);
    setIsMaximized(false);
    setIsMinimized(false);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-background/50 backdrop-blur-xl rounded-lg border border-border shadow-lg p-2 cursor-pointer"
           onClick={() => setIsMinimized(false)}>
        <div className="text-xs font-mono text-foreground/80">{title}</div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${
      isMaximized ? 'fixed inset-0 m-0 rounded-none' : 
      isPreview ? 'fixed inset-4 rounded-lg' :
      'min-h-screen bg-background p-2 sm:p-4 md:p-8'
    }`}>
      <div className={`${
        isMaximized ? 'w-full h-full' : 'max-w-6xl mx-auto'
      } bg-background/50 backdrop-blur-xl rounded-lg md:rounded-xl border border-border shadow-2xl overflow-hidden`}>
        {/* Window Controls */}
        <div className="bg-background/50 px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center justify-between">
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
        
        {/* Content */}
        <div className={`${
          isMaximized ? 'h-[calc(100vh-3rem)]' : ''
        } p-4 sm:p-6 overflow-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
};