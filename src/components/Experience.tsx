import { Terminal, Minus, Maximize2, X, Link2 } from "lucide-react";
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
            <div className="border border-border rounded-lg p-4">
              <h3 className="text-xl font-bold text-purple-400 mb-2">Qwords</h3>
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