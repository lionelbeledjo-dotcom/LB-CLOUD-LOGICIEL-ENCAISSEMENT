import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Lb Cloud" },
      { name: "description", content: "Politique de confidentialité de Lb Cloud, conforme RGPD." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-xs text-muted-foreground hover:underline">← Retour</Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Politique de confidentialité</h1>
      <p className="mt-2 text-xs text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

      <section className="prose prose-invert mt-8 space-y-6 text-sm leading-6 text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground">1. Responsable du traitement</h2>
          <p>Lb Cloud collecte et traite vos données personnelles dans le respect du Règlement (UE) 2016/679 (RGPD) et de la loi Informatique et Libertés.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
          <ul className="list-disc pl-5">
            <li>Identification : nom, e-mail, téléphone</li>
            <li>Données d'utilisation : connexions, actions journalisées (audit)</li>
            <li>Données commerciales : factures, ventes (conservées 10 ans — obligation comptable)</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">3. Finalités</h2>
          <p>Exécution du service d'encaissement, conformité légale (NF525, comptabilité), sécurité, amélioration produit.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">4. Durée de conservation</h2>
          <ul className="list-disc pl-5">
            <li>Compte utilisateur : durée de l'abonnement + 3 ans</li>
            <li>Factures et journal des ventes : 10 ans (obligation Code de commerce)</li>
            <li>Logs d'audit : 1 an</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">5. Vos droits</h2>
          <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation. Pour exercer ces droits, contactez l'administrateur de votre entreprise ou écrivez à <a href="mailto:dpo@lb-cloud.fr" className="underline">dpo@lb-cloud.fr</a>.</p>
          <p>Note NF525 : les données comptables liées aux factures ne peuvent être supprimées avant 10 ans ; les données identifiantes (nom, contact) sont anonymisées sur demande.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
          <p>Seuls les cookies strictement nécessaires sont déposés par défaut. Les cookies d'analyse sont activés uniquement après consentement explicite.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">7. Réclamation</h2>
          <p>Vous pouvez introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" className="underline">www.cnil.fr</a>).</p>
        </div>
      </section>
    </main>
  );
}
