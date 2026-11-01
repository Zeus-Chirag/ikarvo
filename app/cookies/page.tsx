import type { Metadata } from "next";

import { Container } from "~/components/Container";

export const metadata: Metadata = {
  title: "Cookies — Ikarvo",
  description:
    "How Ikarvo uses cookies and similar technologies, and how you can control them.",
};

const Sections = [
  {
    heading: "Overview",
    body: [
      "Ikarvo uses cookies and similar tracking technologies to operate the service, remember your preferences, and understand how the product is used.",
      "This page explains what we use, why we use it, and how you can control it.",
    ],
  },
  {
    heading: "What a cookie is",
    body: [
      "A cookie is a small piece of data that a website stores on your device. Session cookies last only while your browser is open; persistent cookies remain until they expire or you remove them.",
      "We also use other technologies with similar purposes, such as local storage and analytics identifiers.",
    ],
  },
  {
    heading: "How we use cookies",
    body: [
      "Authentication and session state — so you can sign in and stay signed in as you move through the product.",
      "Security and abuse prevention — to detect suspicious activity and protect accounts.",
      "Preferences — to remember choices such as locale, team, and display settings.",
      "Analytics and performance — to understand how features are used and where failures occur so we can improve reliability.",
    ],
  },
  {
    heading: "Types of cookies we use",
    body: [
      "Essential cookies — required for the service to function. These cannot be turned off without breaking core features.",
      "Functional cookies — remember your settings and preferences.",
      "Analytics cookies — help us measure usage and product health.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can restrict or delete cookies through your browser settings. Most browsers also let you review and remove cookies site by site.",
      "If you disable essential cookies, some parts of the service may stop working as expected.",
      "You can also clear local storage from your browser settings.",
    ],
  },
  {
    heading: "Updates to this page",
    body: [
      "We may update this page when our cookie practices change. The date at the top of the page reflects the most recent revision.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <Container>
      <h1>Cookies</h1>
      <p>
        Last updated: 2024-01-01
      </p>
      {Sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <ul>
            {section.body.map((paragraph) => (
              <li key={paragraph}>{paragraph}</li>
            ))}
          </ul>
        </section>
      ))}
    </Container>
  );
}
