import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Z — Video Superapp",
  description:
    "OS de video unificado para ingerir, procesar, distribuir y monetizar contenido en plataformas globales.",
};

export default function EsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
