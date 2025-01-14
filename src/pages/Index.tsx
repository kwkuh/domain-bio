import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Skills } from "@/components/Skills";
import { Contact } from "@/components/Contact";
import { LanguageProvider } from "@/contexts/LanguageContext";

const Index = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen max-w-2xl mx-auto px-4 md:px-6 animated-border">
        <Hero />
        <About />
        <Experience />
        <Skills />
        <Contact />
      </div>
    </LanguageProvider>
  );
};

export default Index;