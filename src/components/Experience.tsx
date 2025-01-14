import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  description: {
    en: string;
    id: string;
  };
}

const experiences: ExperienceItem[] = [
  {
    company: "Qwords",
    role: "Corporate Sales / Domain Name Specialist",
    period: "March 2024 - Present",
    description: {
      en: "Currently working as a Corporate Sales and Domain Name Specialist, helping businesses establish and optimize their online presence through strategic domain management.",
      id: "Jadi jagoan digital di Qwords, ngurusin domain-domain keren buat perusahaan biar eksis di dunia maya. Spesialis yang bikin strategi biar brand-brand pada ngehits di internet! 🚀"
    }
  }
];

const currentProjects = [
  {
    name: "Indonesias.com",
    description: {
      en: "Digital Platform for Indonesian Business",
      id: "Platform Digital Asli Indonesia Banget! 🇮🇩"
    }
  },
  {
    name: "Terbaiq.com",
    description: {
      en: "Premium Domain Marketplace",
      id: "Surganya Domain Premium Berkelas ✨"
    }
  },
  {
    name: "Red.co.id",
    description: {
      en: "Digital Solutions Platform",
      id: "Solusi Digital Masa Kini 🎯"
    }
  }
];

export const Experience = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <section className="py-12">
      <div className="space-y-8">
        <div className="flex justify-end gap-2 mb-8">
          <button
            onClick={() => setLanguage('en')}
            className={`p-2 rounded-full transition-transform hover:scale-110 ${language === 'en' ? 'ring-2 ring-primary' : ''}`}
            aria-label="Switch to English"
          >
            🇬🇧
          </button>
          <button
            onClick={() => setLanguage('id')}
            className={`p-2 rounded-full transition-transform hover:scale-110 ${language === 'id' ? 'ring-2 ring-primary' : ''}`}
            aria-label="Ganti ke Bahasa Indonesia"
          >
            🇮🇩
          </button>
        </div>

        <h2 className="text-2xl font-bold font-mono text-primary">
          {language === 'en' ? 'Work Experience' : 'Jejak Karir Gue ✨'}
        </h2>
        
        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div key={index} className="group flex flex-col md:flex-row gap-4 animate-fade-in hover:bg-muted/50 p-4 rounded-lg transition-colors">
              <div className="md:w-1/3">
                <h3 className="text-lg font-bold text-primary font-mono">{exp.company}</h3>
                <p className="text-muted-foreground text-sm mt-1">{exp.period}</p>
              </div>
              <div className="md:w-2/3">
                <h4 className="text-base font-semibold">{exp.role}</h4>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  {exp.description[language]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.open('https://www.linkedin.com/in/kukuh-laksana/', '_blank')}
          >
            <Link className="w-4 h-4" />
            {language === 'en' ? 'Connect on LinkedIn for full experience' : 'Kepoin LinkedIn Gue Buat Lebih Lengkapnya! 🔍'}
          </Button>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold font-mono text-primary mb-6">
            {language === 'en' ? 'Currently Building' : 'Lagi Bikin Yang Keren-Keren Nih! 🛠️'}
          </h2>
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Web and SaaS Projects:' : 'Project Digital Yang Lagi Diracik:'}
            </h3>
            <ul className="space-y-4">
              {currentProjects.map((project, index) => (
                <li 
                  key={index} 
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <h4 className="text-primary font-mono font-bold group-hover:translate-x-2 transition-transform">
                    {project.name}
                  </h4>
                  <p className="text-muted-foreground text-sm mt-1 group-hover:translate-x-2 transition-transform">
                    {project.description[language]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};