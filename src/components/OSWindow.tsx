import { Maximize2, Minus, X } from 'lucide-react';

interface OSWindowProps {
  children: React.ReactNode;
  title?: string;
}

export const OSWindow = ({ children, title = "kukuh.link" }: OSWindowProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
        {/* Window Controls */}
        <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:bg-red-600 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer hover:bg-yellow-600 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-500 cursor-pointer hover:bg-green-600 transition-colors" />
          </div>
          <div className="text-sm font-mono text-gray-400">{title}</div>
          <div className="flex items-center space-x-4 text-gray-400">
            <Minus className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
            <Maximize2 className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
            <X className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};