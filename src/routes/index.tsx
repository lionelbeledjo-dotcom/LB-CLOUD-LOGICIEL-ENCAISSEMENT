import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ShieldCheck, Zap, Building2, Users, BarChart3 } from "lucide-react";
import { LbLogo } from "@/components/LbLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lb Cloud — Encaissement & gestion pour commerces français" },
      { name: "description", content: "Solution SaaS française multi-tenant pour boulangeries, supermarchés, tabacs et restaurants. Conforme NF525 & RGPD." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { Icon: Zap, title: "Caisse certifiée", desc: "Encaissement rapide multi-paiements, tickets conformes NF525." },
  { Icon: Building2, title: "Multi-entreprises", desc: "Données isolées par société, gestion centralisée pour les groupes." },
  { Icon: Users, title: "Rôles & permissions", desc: "Admin, caissier, comptable, employé — chacun à sa place." },
  { Icon: BarChart3, title: "Pilotage en temps réel", desc: "CA, paniers, marges, stocks. Tout, partout, instantané." },
  { Icon: ShieldCheck, title: "Sécurité française", desc: "Hébergement UE, chiffrement, sauvegardes, journal inaltérable." },
  { Icon: Check, title: "Prêt à l'usage", desc: "Boulangerie, tabac, restaurant : démarrez en moins d'une heure." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <LbLogo size={32} />
            <span className="font-semibold tracking-tight text-lg">Lb Cloud</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold bg-brand text-primary-foreground rounded-md hover:bg-brand/90 transition-all shadow-brand ring-1 ring-brand"
            >
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-brand/10 blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface ring-1 ring-border rounded-full text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            Conforme NF525 · RGPD
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-balance">
            L'encaissement français,{" "}
            <span className="text-brand">enfin moderne.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Lb Cloud unifie caisse, stock, comptabilité et équipes pour les commerces de
            proximité. Multi-entreprises, sécurisé, prêt pour l'inspection.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-brand text-primary-foreground px-6 py-3 rounded-md text-sm font-semibold hover:bg-brand/90 transition-all shadow-brand ring-1 ring-brand"
            >
              Démarrer l'essai gratuit
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#fonctionnalites"
              className="inline-flex items-center px-6 py-3 rounded-md text-sm font-medium text-foreground bg-surface ring-1 ring-border hover:bg-surface-elevated transition-colors"
            >
              Voir les fonctionnalités
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-[10px] font-semibold text-brand uppercase tracking-widest mb-2">
            Une plateforme, tous vos commerces
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Pensé pour le terrain français.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ Icon, title, desc }) => (
            <article
              key={title}
              className="bg-surface/60 ring-1 ring-border rounded-xl p-6 hover:ring-brand/30 transition-all"
            >
              <div className="size-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Icon className="size-5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-28">
        <div className="bg-surface/60 ring-1 ring-border rounded-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[400px] rounded-full bg-brand/15 blur-[120px] pointer-events-none" />
          <h2 className="relative text-3xl font-semibold tracking-tight">
            Prêt à digitaliser votre commerce ?
          </h2>
          <p className="relative mt-3 text-muted-foreground">
            14 jours d'essai. Sans engagement. Migration assistée.
          </p>
          <Link
            to="/login"
            className="relative mt-8 inline-flex items-center gap-2 bg-brand text-primary-foreground px-6 py-3 rounded-md text-sm font-semibold hover:bg-brand/90 transition-all shadow-brand ring-1 ring-brand"
          >
            Créer mon compte
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Lb Cloud — Tous droits réservés
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Hébergé en France · NF525 · RGPD
          </p>
        </div>
      </footer>
    </div>
  );
}
