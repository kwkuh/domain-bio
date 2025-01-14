import { HandIcon } from "lucide-react";

export const Hero = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between py-20 px-6 max-w-4xl mx-auto gap-12">
      <div className="flex-1 space-y-6 text-left animate-fade-in order-2 md:order-1">
        <div className="flex items-center gap-3">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Hi, I'm Kukuh</h1>
          <HandIcon className="w-10 h-10 text-primary animate-[wave_2s_ease-in-out_infinite]" />
        </div>
        <h2 className="text-xl md:text-2xl text-muted-foreground font-normal leading-relaxed">
          Digital Marketer | Domain Name Specialist | Brand Enabler
        </h2>
      </div>
      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-primary animate-fade-in order-1 md:order-2">
        <img
          src="/lovable-uploads/4f715b09-e167-437f-b287-12d986f7e323.png"
          alt="Kukuh Laksana"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};