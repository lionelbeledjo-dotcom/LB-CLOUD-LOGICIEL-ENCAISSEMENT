import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, ShieldCheck, Zap, Building2, Users, BarChart3, CreditCard, Star, CheckCircle2, Package, Receipt } from "lucide-react";
import { LbLogo } from "@/components/LbLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lb Cloud — Logiciel de caisse & gestion pour commerces français" },
      { name: "description", content: "Solution SaaS française de caisse certifiée NF525 pour boulangeries, restaurants, épiceries. Stocks, comptabilité, conformité RGPD — tout-en-un." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { Icon: CreditCard, title: "Caisse certifiée NF525", desc: "Encaissement rapide multi-paiements, tickets conformes, scellement cryptographique." },
  { Icon: Package, title: "Gestion des stocks", desc: "Mouvements, lots, dates d'expiration, alertes de seuil automatiques." },
  { Icon: BarChart3, title: "Comptabilité & TVA", desc: "Journal des ventes, multi-taux, export FEC pour votre comptable." },
  { Icon: Building2, title: "Multi-entreprises", desc: "Gérez plusieurs commerces depuis un seul compte, données isolées." },
  { Icon: Users, title: "Équipe & rôles", desc: "Admin, caissier, comptable — chacun voit ce qui le concerne." },
  { Icon: ShieldCheck, title: "Conformité totale", desc: "NF525, RGPD, audit logs, archivage inaltérable. Prêt pour le contrôle." },
];

const plans = [
  { name: "Standard", price: "19", yearly: "190", desc: "Pour les commerces indépendants", features: ["1 point de vente", "Caisse NF525", "Gestion stocks", "2 employés", "Support email"] },
  { name: "Premium", price: "49", yearly: "490", desc: "Pour les commerces en croissance", popular: true, features: ["3 points de vente", "Tout Standard +", "Multi-employés illimités", "Comptabilité avancée", "Export FEC", "Support prioritaire"] },
  { name: "Entreprise", price: "99", yearly: "990", desc: "Pour les groupes multi-sites", features: ["Sites illimités", "Tout Premium +", "API & intégrations", "Account manager dédié", "SLA garanti", "Formation sur site"] },
];

const testimonials = [
  { name: "Marie L.", business: "Boulangerie du Marché, Paris", quote: "On a divisé par 3 le temps de clôture de caisse. Mes employées sont autonomes en 30 minutes." },
  { name: "Thomas R.", business: "Restaurant Le Comptoir, Paris", quote: "La conformité NF525 était un casse-tête. Maintenant c'est automatique et je dors tranquille." },
  { name: "Fatou D.", business: "Épicerie Bio Verte, Lyon", quote: "Le suivi des stocks avec les dates d'expiration m'a fait économiser 400€/mois de pertes." },
];

function LandingPage() {
  const [demoForm, setDemoForm] = useState({ name: "", email: "", phone: "", company: "", sector: "commerce", message: "" });
  const [demoSent, setDemoSent] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setDemoSent(true);
    setDemoLoading(false);
    toast.success("Demande envoyée ! Nous vous rappelons sous 24h.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <LbLogo size={32} />
            <span className="font-semibold tracking-tight text-lg">Lb Cloud</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Démo</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Connexion
            </Link>
            <Link to="/login" className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all shadow-md shadow-primary/30">
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface ring-1 ring-border rounded-full text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Conforme NF525 · RGPD · Hébergé en France
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-balance">
            L'encaissement français,{" "}
            <span className="text-primary">enfin moderne.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Lb Cloud unifie caisse, stock, comptabilité et équipes pour les commerces de proximité.
            Multi-entreprises, sécurisé, prêt pour l'inspection.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/30">
              Démarrer l'essai gratuit <ArrowRight className="size-4" />
            </Link>
            <a href="#demo" className="inline-flex items-center px-6 py-3 rounded-md text-sm font-medium text-foreground bg-surface ring-1 ring-border hover:bg-surface-elevated transition-colors">
              Voir une démo
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> 14 jours gratuits</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> Support inclus</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-2">Tout-en-un</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Tout ce dont votre commerce a besoin</h2>
          <p className="mt-3 text-muted-foreground">Un seul outil pour remplacer votre caisse, votre Excel et votre comptable du dimanche.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ Icon, title, desc }) => (
            <article key={title} className="bg-surface/60 ring-1 ring-border rounded-xl p-6 hover:ring-primary/30 transition-all">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-surface/30 border-y border-border py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-center mb-10">Ils nous font confiance</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card ring-1 ring-border rounded-xl p-6">
                <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(i => <Star key={i} className="size-4 text-primary fill-primary" />)}</div>
                <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/20 grid place-items-center text-xs font-bold text-primary">{t.name.charAt(0)}</div>
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

      {/* Pricing */}
      <section id="tarifs" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-2">Tarifs transparents</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Un plan pour chaque commerce</h2>
          <p className="mt-3 text-muted-foreground">14 jours d'essai gratuit sur tous les plans. Sans engagement.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-6 ring-1 ${plan.popular ? "ring-primary bg-primary/5 shadow-lg shadow-primary/10" : "ring-border bg-surface/60"}`}>
              {plan.popular && <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full mb-3">Populaire</span>}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}€</span>
                <span className="text-sm text-muted-foreground">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground">ou {plan.yearly}€/an (2 mois offerts)</p>
              <Link to="/login" className={`mt-6 block w-full py-2.5 rounded-md text-sm font-semibold text-center transition-all ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30" : "bg-surface ring-1 ring-border hover:bg-surface-elevated text-foreground"}`}>
                Commencer l'essai gratuit
              </Link>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Form */}
      <section id="demo" className="border-t border-border py-20">
        <div className="max-w-2xl mx-auto px-6">
          {demoSent ? (
            <div className="text-center py-10">
              <CheckCircle2 className="size-16 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold">Demande envoyée !</h2>
              <p className="mt-3 text-muted-foreground">Notre équipe vous recontacte sous 24h pour votre démo personnalisée.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-2">Démo gratuite</p>
                <h2 className="text-3xl font-semibold">Découvrez Lb Cloud avec un expert</h2>
                <p className="mt-3 text-muted-foreground">Démo personnalisée de 30 minutes, sans engagement. Nous vous rappelons sous 24h.</p>
              </div>
              <form onSubmit={handleDemo} className="bg-card ring-1 ring-border rounded-2xl p-8 shadow-lg space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nom complet *</label>
                    <input type="text" required value={demoForm.name} onChange={(e) => setDemoForm({...demoForm, name: e.target.value})} className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="Jean Dupont" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email professionnel *</label>
                    <input type="email" required value={demoForm.email} onChange={(e) => setDemoForm({...demoForm, email: e.target.value})} className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="contact@moncommerce.fr" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Téléphone *</label>
                    <input type="tel" required value={demoForm.phone} onChange={(e) => setDemoForm({...demoForm, phone: e.target.value})} className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="06 12 34 56 78" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nom du commerce *</label>
                    <input type="text" required value={demoForm.company} onChange={(e) => setDemoForm({...demoForm, company: e.target.value})} className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="Boulangerie du Marché" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Secteur d'activité</label>
                  <select value={demoForm.sector} onChange={(e) => setDemoForm({...demoForm, sector: e.target.value})} className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none">
                    <option value="commerce">Commerce de détail</option>
                    <option value="restauration">Restauration</option>
                    <option value="boulangerie">Boulangerie / Pâtisserie</option>
                    <option value="tabac">Tabac / Presse</option>
                    <option value="epicerie">Épicerie / Supermarché</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Message (optionnel)</label>
                  <textarea value={demoForm.message} onChange={(e) => setDemoForm({...demoForm, message: e.target.value})} rows={3} maxLength={200} className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none" placeholder="Avez-vous des besoins spécifiques ?" />
                </div>
                <button type="submit" disabled={demoLoading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50">
                  {demoLoading ? "Envoi..." : "Recevoir un rappel sous 24h"}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">En soumettant, vous acceptez d'être recontacté. Données traitées conformément au RGPD.</p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LbLogo size={24} />
            <span className="text-sm font-medium">Lb Cloud</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Connexion</Link>
          </div>
          <p className="text-[10px] text-muted-foreground">© 2026 Lb Cloud — NF525 · RGPD · Hébergé en France</p>
        </div>
      </footer>
    </div>
  );
}
