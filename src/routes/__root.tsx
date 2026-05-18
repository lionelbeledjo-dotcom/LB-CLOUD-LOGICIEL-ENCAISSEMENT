import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Réessayez ou revenez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lb Cloud — Encaissement & Gestion pour commerces" },
      { name: "description", content: "Lb Cloud : solution SaaS française d'encaissement et de gestion pour boulangeries, supermarchés, tabacs et restaurants. Multi-tenant, sécurisé, conforme NF525 & RGPD." },
      { name: "author", content: "Lb Cloud" },
      { property: "og:title", content: "Lb Cloud — Encaissement & Gestion pour commerces" },
      { property: "og:description", content: "Lb Cloud : solution SaaS française d'encaissement et de gestion pour boulangeries, supermarchés, tabacs et restaurants. Multi-tenant, sécurisé, conforme NF525 & RGPD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Lb Cloud — Encaissement & Gestion pour commerces" },
      { name: "twitter:description", content: "Lb Cloud : solution SaaS française d'encaissement et de gestion pour boulangeries, supermarchés, tabacs et restaurants. Multi-tenant, sécurisé, conforme NF525 & RGPD." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5fb48f68-83e4-4590-be2d-24e12147d865/id-preview-c992ad5d--09bda121-13de-4921-88b8-252199a8f27c.lovable.app-1779136380603.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5fb48f68-83e4-4590-be2d-24e12147d865/id-preview-c992ad5d--09bda121-13de-4921-88b8-252199a8f27c.lovable.app-1779136380603.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster
          theme="light"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-card !text-foreground !border !border-border !shadow-xl !shadow-secondary/15 !rounded-xl",
              title: "!text-secondary !font-semibold",
              description: "!text-muted-foreground",
              actionButton: "!bg-primary !text-primary-foreground !rounded-md",
              cancelButton: "!bg-muted !text-muted-foreground !rounded-md",
              success: "!border-secondary/40",
              error: "!border-destructive/40",
              warning: "!border-primary/50",
              info: "!border-secondary/40",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
