import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Skills } from "@/components/Skills";
import { Contact } from "@/components/Contact";
import { LanguageProvider } from "@/contexts/LanguageContext";

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
  "kukuh.id"
];

const DomainStamps = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {domains.map((domain, index) => {
        // Calculate position to only place stamps on the sides
        const isLeftSide = index < Math.ceil(domains.length / 2);
        const position = isLeftSide ? 
          { left: '5%', right: 'auto' } : 
          { right: '5%', left: 'auto' };
        
        // Distribute vertically
        const verticalPosition = `${15 + ((index % Math.ceil(domains.length / 2)) * 20)}%`;

        return (
          <div
            key={domain}
            className="absolute font-mono text-sm md:text-base opacity-10 dark:opacity-5 transform rotate-[-20deg] transition-all duration-500"
            style={{
              top: verticalPosition,
              ...position,
              animation: `stamp-fade-in 0.5s ease-out ${index * 0.1}s forwards`
            }}
          >
            <div className="border-2 border-primary rounded-lg px-4 py-2">
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
      <DomainStamps />
      <LanguageProvider>
        <div className="relative min-h-screen max-w-2xl mx-auto px-4 md:px-6 z-10">
          <Hero />
          <About />
          <Experience />
          <Skills />
          <Contact />
        </div>
      </LanguageProvider>
    </>
  );
};

export default Index;