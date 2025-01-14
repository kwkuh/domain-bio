import { HandIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/hooks/use-theme";

export const Hero = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col md:flex-row items-center justify-between py-8 gap-6">
      <div className="flex-1 space-y-4 text-left animate-fade-in order-2 md:order-1">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Hi, I'm Kukuh
          </h1>
          <HandIcon className="w-6 h-6 text-primary animate-[wave_2s_ease-in-out_infinite]" />
        </div>
        <h2 className="text-lg md:text-xl text-muted-foreground font-mono font-bold leading-relaxed">
          Digital Marketer | Domain Name Specialist | Brand Enabler
        </h2>
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
  );
};