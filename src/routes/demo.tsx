import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LbLogo } from "@/components/LbLogo";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Star, Shield, Zap, BarChart3, Users, CreditCard } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demander une démo — Lb Cloud" },
      { name: "description", content: "Découvrez Lb Cloud avec une démo personnalisée. Caisse certifiée NF525, gestion de stocks, comptabilité — tout-en-un pour votre commerce." },
    ],
  }),
  component: DemoPage,
});

const features = [
  { icon: CreditCard, title: "Caisse certifiée NF525", desc: "Encaissements, sessions de caisse, conformité légale intégrée" },
  { icon: BarChart3, title: "Comptabilité & TVA", desc: "Journal des ventes, multi-taux TVA, export FEC automatique" },
  { icon: Zap, title: "Stocks en temps réel", desc: "Mouvements, lots, dates d'expiration, alertes seuil" },
  { icon: Users, title: "Multi-employés", desc: "Rôles, permissions, suivi d'activité par caissier" },
  { icon: Shield, title: "Conformité RGPD", desc: "Anonymisation client, audit logs, archivage scellé" },
  { icon: Star, title: "Multi-entreprises", desc: "Gérez plusieurs commerces depuis un seul compte" },
];

const testimonials = [
  { name: "Marie L.", business: "Boulangerie du Marché", quote: "On a divisé par 3 le temps de clôture de caisse grâce à Lb Cloud." },
  { name: "Thomas R.", business: "Restaurant Le Comptoir", quote: "La conformité NF525 était un casse-tête. Maintenant c'est automatique." },
  { name: "Fatou D.", business: "Salon Beauté Zen", quote: "Interface claire, formation de mes employées en 30 minutes." },
];

function DemoPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    sector: "commerce",
    availability: "cette_semaine",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitted(true);
    setLoading(false);
    toast.success("Demande envoyée ! Nous vous recontactons sous 24h.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <LbLogo size={32} />
            <span className="text-xl font-semibold text-foreground">Lb Cloud</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="/#fonctionnalites" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="/#tarifs" className="text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
            <a href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Connexion</a>
            <a href="/demo" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-all">
              Voir une démo
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -left-32 size-[600px] rounded-full bg-primary/10 blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 size-[500px] rounded-full bg-secondary/10 blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center relative">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full ring-1 ring-primary/20 mb-6">
              <Shield className="size-3.5" /> Certifié NF525 · Conforme RGPD
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              La gestion de commerce,{" "}
              <span className="text-primary italic">simplifiée.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Lb Cloud est le logiciel de caisse et de gestion tout-en-un pour les TPE/PME françaises.
              Encaissements, stocks, comptabilité, conformité — tout depuis une seule interface.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#formulaire"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
              >
                Demander une démo <ArrowRight className="size-4" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 ring-1 ring-border text-foreground px-6 py-3 rounded-lg font-medium hover:bg-muted/50 transition-all"
              >
                Essai gratuit
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> 14 jours d'essai</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> Sans engagement</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> Support inclus</span>
            </div>
          </div>

          {/* Mockup card */}
          <div className="hidden lg:block">
            <div className="bg-card ring-1 ring-border rounded-2xl p-6 shadow-2xl shadow-primary/5 rotate-1 hover:rotate-0 transition-transform">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-amber-400" />
                <div className="size-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[10px] text-muted-foreground">pro-gestion-coeur.lovable.app/dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-primary uppercase font-semibold">CA du jour</p>
                  <p className="text-lg font-bold">2 485 €</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-primary uppercase font-semibold">Tickets</p>
                  <p className="text-lg font-bold">142</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-primary uppercase font-semibold">Articles</p>
                  <p className="text-lg font-bold">412</p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 h-32 flex items-end gap-1">
                {[40, 55, 48, 70, 62, 85, 78].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/80 rounded-t" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Tout ce dont votre commerce a besoin</h2>
            <p className="mt-3 text-muted-foreground">Un seul outil pour remplacer votre caisse, votre Excel et votre comptable du dimanche.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card ring-1 ring-border rounded-xl p-6 hover:ring-primary/40 hover:shadow-md transition-all">
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center mb-4">
                  <f.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Ils nous font confiance</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card ring-1 ring-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/20 grid place-items-center text-xs font-bold text-primary">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Form */}
      <section id="formulaire" className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-6">
          {submitted ? (
            <div className="text-center py-16">
              <CheckCircle2 className="size-16 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-foreground">Demande envoyée !</h2>
              <p className="mt-3 text-muted-foreground">
                Notre équipe vous recontacte sous 24h pour planifier votre démo personnalisée de 30 minutes.
              </p>
              <a href="/" className="inline-flex items-center gap-2 mt-8 text-sm text-primary hover:underline">
                Retour à l'accueil <ArrowRight className="size-3.5" />
              </a>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-full ring-1 ring-emerald-500/20 mb-4">
                  Réservation démo
                </span>
                <h2 className="text-3xl font-bold text-foreground">Découvrez Lb Cloud avec un expert</h2>
                <p className="mt-3 text-muted-foreground">
                  Démo personnalisée de 30 minutes, sans engagement. Nous vous rappelons dans les 24h.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="bg-card ring-1 ring-border rounded-2xl p-8 shadow-lg space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nom complet *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email professionnel *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      placeholder="contact@moncommerce.fr"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Téléphone *</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nom du commerce *</label>
                    <input
                      type="text"
                      required
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      placeholder="Boulangerie du Marché"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Secteur d'activité</label>
                    <select
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    >
                      <option value="commerce">Commerce de détail</option>
                      <option value="restauration">Restauration</option>
                      <option value="boulangerie">Boulangerie / Pâtisserie</option>
                      <option value="artisanat">Artisanat</option>
                      <option value="services">Services</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Disponibilité</label>
                    <select
                      value={form.availability}
                      onChange={(e) => setForm({ ...form, availability: e.target.value })}
                      className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    >
                      <option value="cette_semaine">Cette semaine</option>
                      <option value="semaine_prochaine">Semaine prochaine</option>
                      <option value="dans_15_jours">Dans 15 jours</option>
                      <option value="pas_urgent">Pas urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Message <span className="text-muted-foreground/60">(optionnel)</span></label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    maxLength={200}
                    rows={3}
                    className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none"
                    placeholder="Avez-vous des questions spécifiques ?"
                  />
                  <p className="text-[10px] text-muted-foreground text-right mt-1">{form.message.length}/200</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.99] shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {loading ? "Envoi en cours..." : "Recevoir un rappel"}
                </button>

                <p className="text-[10px] text-muted-foreground text-center">
                  En soumettant, vous acceptez d'être recontacté par notre équipe.
                  Vos données sont traitées conformément au RGPD.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LbLogo size={24} />
            <span className="text-sm font-medium text-foreground">Lb Cloud</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</a>
            <a href="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="/login" className="hover:text-foreground transition-colors">Connexion</a>
          </div>
          <p className="text-[10px] text-muted-foreground">© 2026 Lb Cloud — NF525 · RGPD · Hébergé en France</p>
        </div>
      </footer>
    </div>
  );
}
