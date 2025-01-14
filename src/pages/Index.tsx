import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Skills } from "@/components/Skills";
import { Stats } from "@/components/Stats";
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
  "kukuh.my"
];

const DomainStamps = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {domains.map((domain, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        return (
          <div
            key={domain}
            className="absolute font-mono text-sm md:text-base opacity-10 dark:opacity-5 transform rotate-[-20deg] transition-all duration-500"
            style={{
              top: `${20 + (row * 25)}%`,
              left: `${15 + (col * 30)}%`,
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
        <div className="relative min-h-screen max-w-2xl mx-auto px-4 md:px-6 animated-border z-10">
          <Hero />
          <About />
          <Stats />
          <Experience />
          <Skills />
          <Contact />
        </div>
      </LanguageProvider>
    </>
  );
};

export default Index;