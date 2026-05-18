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
      <section className="prose prose-invert mt-8 space-y-4 text-sm leading-6 text-muted-foreground">
        <p><strong className="text-foreground">Éditeur</strong> : Lb Cloud SAS — à compléter (SIRET, capital, RCS, siège social).</p>
        <p><strong className="text-foreground">Directeur de la publication</strong> : à compléter.</p>
        <p><strong className="text-foreground">Hébergement</strong> : infrastructure cloud Européenne (UE).</p>
        <p><strong className="text-foreground">Contact</strong> : <a href="mailto:contact@lb-cloud.fr" className="underline">contact@lb-cloud.fr</a></p>
        <p>Conformité NF525 : Lb Cloud met en œuvre les exigences d'inaltérabilité, de sécurisation, de conservation et d'archivage des données de caisse conformément à l'article 88 de la loi de finances 2016 (CGI art. 286-I-3°bis).</p>
      </section>
    </main>
  );
}
