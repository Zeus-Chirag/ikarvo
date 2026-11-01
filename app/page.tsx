import Link from "next/link";

import { Container } from "~/components/Container";
import { Footer } from "~/components/Footer";

export default function HomePage() {
  return (
    <Container>
      <main>
        <h1>Ikarvo</h1>
        <p>Grow faster with better campaigns.</p>
        <nav>
          <ul>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
            <li>
              <Link href="/cookies">Cookies</Link>
            </li>
          </ul>
        </nav>
      </main>
      <Footer />
    </Container>
  );
}
