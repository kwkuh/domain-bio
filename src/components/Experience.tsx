import { Terminal, Minus, Maximize2, X, Link2, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const currentProjects = [
  {
    name: "Kukuh.Link",
    url: "https://kukuh.link"
  },
  {
    name: "Maskukuh.com",
    url: "https://maskukuh.com"
  },
  {
    name: "Kukuh.co.id",
    url: "https://kukuh.co.id"
  },
  {
    name: "Kukuh.biz.id",
    url: "https://kukuh.biz.id"
  },
  {
    name: "Kukuh.web.id",
    url: "https://kukuh.web.id"
  },
  {
    name: "Kukuh.xyz",
    url: "https://kukuh.xyz"
  }
];

export const Experience = () => {
  return (
    <section className="py-8 space-y-8">
      {/* Career Section */}
      <div className="os-window">
        <div className="os-window-header flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="font-mono">career.sh</span>
          </div>
          <div className="flex items-center space-x-4">
            <Minus className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            <Maximize2 className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            <X className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="relative perspective-1000 flex justify-center">
              {/* Animated ID Card */}
              <div className="id-card-container transform-style-3d w-64 hover:scale-105 transition-transform duration-300">
                {/* Lanyard */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gradient-to-b from-gray-800 to-gray-600 origin-top animate-sway">
                  {/* Lanyard Clip */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400"></div>
                </div>
                
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl transition-all duration-500 transform hover:rotate-y-10 hover:translate-z-10 animate-[float_6s_ease-in-out_infinite]">
                  {/* Card Header */}
                  <div className="p-2 text-xs text-gray-400 font-mono border-b border-gray-800 bg-black/30">
                    <span>PT Qwords Company International</span>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-4 space-y-3 relative overflow-hidden">
                    {/* Holographic Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-45 translate-x-[-200%] animate-[shine_3s_ease-in-out_infinite]"></div>
                    
                    {/* Profile Picture Area */}
                    <div className="w-20 h-20 mx-auto rounded-lg overflow-hidden border-2 border-gray-700 transform hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-16 h-16 text-white" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          <path d="M12 8.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/>
                          <path d="M15 7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1V8c0-.55-.45-1-1-1z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Name and Title */}
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-bold text-white">Kukuh Laksana</h3>
                      <p className="text-[10px] text-gray-400 font-mono">Corporate Sales / Domain Name Specialist</p>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 pt-2 border-t border-gray-800">
                      <Mail className="w-3 h-3" />
                      <a href="mailto:kukuh@qwords.co.id" className="hover:text-purple-400 transition-colors">
                        kukuh@qwords.co.id
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 mt-8">
              <h3 className="text-xl font-bold text-purple-400 mb-2">PT Qwords Company International</h3>
              <p className="text-muted-foreground mb-2">Staff Karyawan - Corporate Sales / Domain Name Specialist (March 2024 - Present)</p>
              <p className="text-sm text-muted-foreground mb-4">
                Membantu brand untuk tumbuh dan dikenal di dunia digital adalah misi utama. Fokus saya membantu bisnis menemukan nama domain yang tepat sesuai identitas digital mereka, serta mengembangkan strategi domain yang memperkuat eksistensi brand secara online. Selalu mengikuti tren terbaru dan mencari peluang baru untuk memastikan kesuksesan klien adalah prioritas utama!
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-300"
                onClick={() => window.open('https://linkedin.com/in/kukuh-satrio-wibowo', '_blank')}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Yuk, Kenalan di LinkedIn! 👋
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="os-window">
        <div className="os-window-header flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="font-mono text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2 animated-border"
                      onClick={() => window.open('https://kuk.uh', '_blank')}
                    >
                      kuk.uh
                      <Link2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to visit kuk.uh</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-4">
              <Minus className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
              <Maximize2 className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
              <X className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Project Yang Lagi Dikerjain 🚀
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentProjects.map((project, index) => (
              <div key={index} className="group relative transform transition-all duration-300 hover:scale-105">
                <div className="p-4 rounded-lg glass-effect hover:border-purple-500/40 transition-all duration-300 h-full">
                  <h4 className="text-purple-400 font-mono font-bold text-center">
                    {project.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};