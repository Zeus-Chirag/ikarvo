import type { Metadata } from "next";

import { Container } from "~/components/Container";
import { Footer } from "~/components/Footer";

export const metadata: Metadata = {
  title: {
    template: "%s — Ikarvo",
    default: "Ikarvo",
  },
  description:
    "Ikarvo helps teams run better campaigns and grow faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Container>
          {children}
          <Footer />
        </Container>
      </body>
    </html>
  );
}
