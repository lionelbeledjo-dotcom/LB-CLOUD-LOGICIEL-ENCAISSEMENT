import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Lb Cloud" },
      { name: "description", content: "Mentions légales de Lb Cloud." },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-xs text-muted-foreground hover:underline">← Retour</Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Mentions légales</h1>
      <section className="prose prose-invert mt-8 space-y-6 text-sm leading-6 text-muted-foreground">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Éditeur du site</h2>
          <p><strong className="text-foreground">Lb Cloud</strong> — Société par actions simplifiée (SAS)</p>
          <p>Siège social : Douala, Cameroun</p>
          <p>Email : <a href="mailto:contact@lb-cloud.fr" className="underline">contact@lb-cloud.fr</a></p>
          <p>Téléphone : +237 6 99 00 00 00</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Directeur de la publication</h2>
          <p>Lionel Beledjo — Fondateur & CEO</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Hébergement</h2>
          <p><strong className="text-foreground">Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
          <p><strong className="text-foreground">Supabase Inc.</strong> — 970 Toa Payoh North, Singapore 318992</p>
          <p>Infrastructure cloud avec réplication en Union Européenne.</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Conformité</h2>
          <p><strong className="text-foreground">NF525</strong> : Lb Cloud met en œuvre les exigences d'inaltérabilité, de sécurisation, de conservation et d'archivage des données de caisse conformément à l'article 88 de la loi de finances 2016 (CGI art. 286-I-3°bis).</p>
          <p><strong className="text-foreground">RGPD</strong> : Traitement des données personnelles conforme au Règlement (UE) 2016/679. Droit d'accès, de rectification et de suppression : <a href="mailto:rgpd@lb-cloud.fr" className="underline">rgpd@lb-cloud.fr</a></p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Propriété intellectuelle</h2>
          <p>L'ensemble du contenu du site (textes, graphismes, logos, icônes, images, logiciel) est la propriété exclusive de Lb Cloud ou de ses partenaires. Toute reproduction est interdite sans autorisation préalable.</p>
        </div>
      </section>
    </main>
  );
}
