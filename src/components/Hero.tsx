import { HandIcon, MoonIcon, SunIcon, Phone, Glasses } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { Clock } from "./Clock";

export const Hero = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSticky, setIsSticky] = useState(false);

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/6282260001011', '_blank');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {isSticky && (
        <div className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-lg z-50 py-2 px-4 border-b border-border transition-all duration-300">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-primary">kukuh.link</h2>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row items-center justify-between py-8 gap-6">
        <div className="flex-1 space-y-4 text-left animate-fade-in order-2 md:order-1">
          <div className="inline-flex items-center gap-3">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
              Kukuh Laksana
            </h1>
            <HandIcon className="w-12 h-12 text-yellow-400 animate-[wave_2s_ease-in-out_infinite]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg md:text-xl text-muted-foreground font-mono font-bold leading-relaxed">
              Digital Marketer | Domain Name Specialist | Brand Enabler
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span>hi@maskukuh.com</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleWhatsAppClick}
                className="inline-flex items-center gap-2 hover:text-green-500"
              >
                <Phone className="w-4 h-4" />
                +62 822-6000-1011
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="mt-2 hover:bg-primary/10 font-bold"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="relative w-24 h-24 md:w-28 md:h-28 order-1 md:order-2 group">
          <Glasses 
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 md:w-12 md:h-12 text-primary opacity-80 rotate-12 animate-pulse z-10" 
            strokeWidth={2.5}
          />
          <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-primary animate-fade-in hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-purple-400 via-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-3xl md:text-4xl font-black text-white font-mono relative">
              KL
            </span>
          </div>
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-mono animate-bounce shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Open to Work
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-green-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300 animate-pulse"></div>
          <Clock />
        </div>
      </div>
    </>
  );
};