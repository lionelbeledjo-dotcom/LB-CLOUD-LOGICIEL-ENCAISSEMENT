import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? "/", `https://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const body = req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined;

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  try {
    const serverModule = await import("../dist/server/server.js");
    const server = serverModule.default;
    const response = await server.fetch(request, {}, {});

    res.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const text = await response.text();
    res.send(text);
  } catch (error: any) {
    console.error("SSR Error:", error);
    res.status(500).send("Internal Server Error");
  }
}
