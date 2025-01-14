import { HandIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/hooks/use-theme";

export const Hero = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col md:flex-row items-center justify-between py-12 gap-8">
      <div className="flex-1 space-y-4 text-left animate-fade-in order-2 md:order-1">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Hi, I'm Kukuh
          </h1>
          <HandIcon className="w-8 h-8 text-primary animate-[wave_2s_ease-in-out_infinite]" />
        </div>
        <h2 className="text-lg md:text-xl text-muted-foreground font-mono leading-relaxed">
          Digital Marketer | Domain Name Specialist | Brand Enabler
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="mt-4 hover:bg-primary/10"
        >
          {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </Button>
      </div>
      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-primary animate-fade-in order-1 md:order-2 hover:scale-105 transition-transform duration-300">
        <img
          src="/lovable-uploads/4f715b09-e167-437f-b287-12d986f7e323.png"
          alt="Kukuh Laksana"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};