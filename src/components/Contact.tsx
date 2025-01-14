import { Github, Linkedin, Twitter, Home } from "lucide-react";

export const Contact = () => {
  return (
    <section className="py-16">
      <div className="space-y-8">
        <h2 className="text-2xl font-bold font-mono text-primary">Get in Touch</h2>
        <div className="flex justify-start gap-6">
          <a href="https://kukuhlaksana.com" className="text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-6 h-6" />
          </a>
          <a href="https://linkedin.com/in/kukuh-laksana" className="text-muted-foreground hover:text-primary transition-colors">
            <Linkedin className="w-6 h-6" />
          </a>
          <a href="https://x.com/kwkuh" className="text-muted-foreground hover:text-primary transition-colors">
            <Twitter className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  );
};