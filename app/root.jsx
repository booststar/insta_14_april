import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import modernStyles from "./styles/modern.css?url";
import plansStyles from "./styles/plans.css?url";

export const links = () => [
  { rel: "preconnect", href: "https://cdn.shopify.com", crossOrigin: "anonymous" },
  { rel: "dns-prefetch", href: "https://cdn.shopify.com" },
  { rel: "preconnect", href: "https://images.unsplash.com" },
  { rel: "preconnect", href: "https://picsum.photos" },
  { rel: "preload", href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css", as: "style" },
  { rel: "stylesheet", href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css" },
  { rel: "stylesheet", href: modernStyles },
  { rel: "stylesheet", href: plansStyles },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
