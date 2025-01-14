import { HandIcon, MoonIcon, SunIcon, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/hooks/use-theme";

export const Hero = () => {
  const { theme, toggleTheme } = useTheme();

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/6282260001011', '_blank');
  };

  return (
    <>
      <div className="text-sm text-muted-foreground text-center mb-4 font-mono">
        Selamat datang di kukuh.link
      </div>
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
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-primary animate-fade-in order-1 md:order-2 hover:scale-105 transition-transform duration-300">
          <img
            src="/photo-1581092795360-fd1ca04f0952"
            alt="Profile Photo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </>
  );
};