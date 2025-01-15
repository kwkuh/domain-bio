import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Skills } from "@/components/Skills";
import { Contact } from "@/components/Contact";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OSWindow } from "@/components/OSWindow";
import { Clock } from "@/components/Clock";

const domains = [
  "kukuh.co.id",
  "maskukuh.com",
  "maskukuh.id",
  "kukuh.biz.id",
  "kukuh.web.id",
  "kukuh.xyz",
  "kukuh.org",
  "kukuh.net",
  "kukuh.my",
  "kukuh.id",
  "kukuh.link"
];

const DomainStamps = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
      {domains.map((domain, index) => {
        const isMainDomain = domain === "kukuh.link";
        const isLeftSide = index < Math.ceil(domains.length / 2);
        const position = isLeftSide ? 
          { left: '5%', right: 'auto' } : 
          { right: '5%', left: 'auto' };
        const verticalPosition = `${15 + ((index % Math.ceil(domains.length / 2)) * 20)}%`;

        return (
          <div
            key={domain}
            className={`absolute font-mono text-sm md:text-base transform rotate-[-20deg] transition-all duration-500 ${
              isMainDomain ? 'opacity-30 dark:opacity-20' : 'opacity-20 dark:opacity-10'
            }`}
            style={{
              top: verticalPosition,
              ...position,
              animation: `stamp-fade-in 0.5s ease-out ${index * 0.1}s forwards`
            }}
          >
            <div className={`border-2 rounded-lg px-4 py-2 ${
              isMainDomain 
                ? 'border-purple-500 text-purple-500 dark:border-purple-400 dark:text-purple-400' 
                : 'border-primary text-primary'
            }`}>
              {domain}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Index = () => {
  return (
    <>
      <Clock />
      <DomainStamps />
      <LanguageProvider>
        <OSWindow>
          <div className="relative min-h-screen max-w-2xl mx-auto px-4 md:px-6 z-20">
            <Hero />
            <About />
            <Experience />
            <Skills />
            <Contact />
          </div>
        </OSWindow>
      </LanguageProvider>
    </>
  );
};

export default Index;