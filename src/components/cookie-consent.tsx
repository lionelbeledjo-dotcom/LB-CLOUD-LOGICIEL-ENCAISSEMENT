import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const KEY = "lb_cookie_consent_v1";

type Consent = { essential: true; analytics: boolean; date: string };

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  const save = (analytics: boolean) => {
    const c: Consent = { essential: true, analytics, date: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(c));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-surface/95 p-5 shadow-2xl backdrop-blur">
      <h3 className="text-sm font-semibold text-foreground">Cookies & vie privée</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Nous utilisons des cookies essentiels au fonctionnement du service. Les cookies
        d'analyse (anonymes) nous aident à améliorer Lb Cloud — vous pouvez les refuser.
        Voir notre <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save(true)}>Tout accepter</Button>
        <Button size="sm" variant="outline" onClick={() => save(false)}>Refuser</Button>
      </div>
    </div>
  );
}
