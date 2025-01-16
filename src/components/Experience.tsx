import { Terminal, Minus, Maximize2, X, Link2, Mail, Globe } from "lucide-react";
import { Button } from "./ui/button";

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

const qwordsSkills = [
  {
    title: "Domain Backorder",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Domain Auction",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Domain Management",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Hosting Services",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Corporate Sales",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Customer Retention",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Market Trends Analysis",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Landing Page Optimization",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Problem Solving & Consultation",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Proposal & Presentation",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Collaboration",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Event Participation",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Domain Investment",
    icon: Globe,
    color: "text-purple-400"
  },
  {
    title: "Innovation & Marketing Ideas",
    icon: Globe,
    color: "text-purple-400"
  }
];

export const Experience = () => {
  return (
    <section className="py-8 space-y-8">
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
            {/* ID Card with Lanyard */}
            <div className="relative perspective-1000 flex justify-center mb-8">
              <div className="id-card-container transform-style-3d w-64 hover:scale-105 transition-transform duration-300">
                {/* Enhanced 3D Lanyard with loading animation */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-[#F97316] via-[#FBBF24] to-[#F97316] origin-top animate-sway shadow-lg transform-style-3d">
                  {/* Rotating Lanyard Clip with enhanced 3D effect */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] shadow-lg border border-[#F97316]/20 animate-[spin_2s_ease-in-out_1]">
                    {/* 3D edges for the clip */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#F97316]/30 to-transparent transform rotate-45"></div>
                    <div className="absolute inset-0 border-2 border-[#FBBF24]/20 rounded-sm transform scale-90"></div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-full">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
                
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl transition-all duration-500 transform hover:rotate-y-10 hover:translate-z-10 animate-[float_6s_ease-in-out_infinite]">
                  {/* Card Header */}
                  <div className="p-2 text-xs text-gray-400 font-mono border-b border-gray-800 bg-black/30">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-[#FBBF24]">Corporate Sales</span>
                      <span className="text-[10px] text-[#F97316]">Domain Name Specialist</span>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-4 space-y-3 relative overflow-hidden">
                    {/* Holographic Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-45 translate-x-[-200%] animate-[shine_3s_ease-in-out_infinite]"></div>
                    
                    {/* Profile Picture Area */}
                    <div className="w-20 h-20 mx-auto rounded-lg overflow-hidden border-2 border-gray-700 transform hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full bg-gradient-to-br from-[#F97316]/20 to-[#FBBF24]/20 flex items-center justify-center">
                        {/* Character with glasses icon */}
                        <svg viewBox="0 0 24 24" className="w-16 h-16 text-white" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          <path d="M9 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                          <path d="M8.5 7h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Name and Roles */}
                    <div className="text-center space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-white">Kukuh Laksana</h3>
                      </div>
                      
                      {/* Main Company: Qwords */}
                      <div className="space-y-1 border-t border-gray-800 pt-2">
                        <div className="flex items-center justify-center gap-1 text-[10px]">
                          <Link2 className="w-3 h-3 text-[#FBBF24]" />
                          <a href="https://qwords.com" target="_blank" rel="noopener noreferrer" className="text-[#FBBF24] hover:text-[#F97316] transition-colors">
                            qwords.com
                          </a>
                        </div>
                        <p className="text-[10px] text-[#F97316]">Corporate Sales</p>
                        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                          <Mail className="w-3 h-3" />
                          <a href="mailto:kukuh@qwords.co.id" className="hover:text-[#F97316] transition-colors">
                            kukuh@qwords.co.id
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Aksara Data Section - Made Responsive */}
                    <div className="mt-4 space-y-2 pt-2 border-t border-gray-800">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        <div className="flex items-center gap-1 text-[10px]">
                          <Link2 className="w-3 h-3 text-[#FBBF24]" />
                          <a href="https://aksaradata.id" target="_blank" rel="noopener noreferrer" className="text-[#FBBF24] hover:text-[#F97316] transition-colors">
                            aksaradata.id
                          </a>
                        </div>
                        <p className="text-[10px] text-[#F97316] text-center sm:text-left">Domain Name Specialist</p>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                        <Mail className="w-3 h-3" />
                        <a href="mailto:kukuh@aksaradata.id" className="hover:text-[#F97316] transition-colors">
                          kukuh@aksaradata.id
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Qwords Skills Section - More Compact Grid */}
            <div className="mt-4">
              <div className="relative bg-black/40 border border-purple-500/20 rounded-lg p-4">
                <h3 className="text-lg font-bold text-center mb-4 text-purple-400 font-mono">
                  Qwords Experience & Skills
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {qwordsSkills.map((skill, index) => (
                    <div 
                      key={index}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-purple-500/10 blur-sm group-hover:bg-purple-400/20 transition-all duration-300" />
                      <div className="relative flex items-center p-2 bg-black/60 border border-purple-500/30 rounded-md hover:border-purple-400/60 transition-all duration-300">
                        <skill.icon className={`w-4 h-4 ${skill.color} group-hover:scale-110 transition-transform duration-300 mr-2 flex-shrink-0`} />
                        <span className="text-xs font-mono text-purple-300 group-hover:text-purple-200 truncate">
                          {skill.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LinkedIn Button */}
              <div className="border border-border rounded-lg p-3 mt-4">
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
      </div>
    </section>
  );
};
