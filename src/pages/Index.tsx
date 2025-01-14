import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Skills } from "@/components/Skills";
import { Contact } from "@/components/Contact";

const Index = () => {
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 md:px-6">
      <Hero />
      <About />
      <Experience />
      <Skills />
      <Contact />
    </div>
  );
};

export default Index;