import { Github, Linkedin, Twitter, Home } from "lucide-react";

export const Contact = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Want to discuss your digital marketing needs? Feel free to reach out!
        </p>
        <div className="flex justify-center gap-6">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-6 h-6" />
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            <Github className="w-6 h-6" />
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            <Linkedin className="w-6 h-6" />
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            <Twitter className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  );
};