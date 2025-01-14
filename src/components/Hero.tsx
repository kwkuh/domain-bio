import { WaveHandIcon } from "lucide-react";

export const Hero = () => {
  return (
    <div className="flex flex-col-reverse md:flex-row items-center justify-between py-20 px-6 max-w-6xl mx-auto gap-8">
      <div className="flex-1 space-y-4 text-center md:text-left animate-fade-in">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <h1 className="text-4xl md:text-5xl font-bold">Hi, I'm Kukuh</h1>
          <WaveHandIcon className="w-8 h-8 text-primary animate-[wave_2s_ease-in-out_infinite]" />
        </div>
        <h2 className="text-xl md:text-2xl text-muted-foreground">
          Digital Marketer | Domain Name Specialist | Brand Enabler
        </h2>
      </div>
      <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-primary animate-fade-in">
        <img
          src="/lovable-uploads/4f715b09-e167-437f-b287-12d986f7e323.png"
          alt="Kukuh Laksana"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};