import type { Metadata } from "next";

import { Container } from "~/components/Container";

export const metadata: Metadata = {
  title: "Privacy — Ikarvo",
  description:
    "How Ikarvo collects, uses, and protects your personal information.",
};

const Sections = [
  {
    heading: "Overview",
    body: [
      "This privacy notice explains how Ikarvo treats information we collect through the service.",
      "It applies to anyone who uses Ikarvo, including account holders and visitors to the website.",
    ],
  },
  {
    heading: "Information we collect",
    body: [
      "Account information — such as name and email — when you create or update an account.",
      "Usage information — such as feature use, errors, and performance data — to operate and improve the service.",
      "Integration information — when you connect an external service, we store the minimum data needed to operate that connection.",
    ],
  },
  {
    heading: "How we use information",
    body: [
      "To provide and maintain the service.",
      "To communicate with you about your account.",
      "To understand usage and improve reliability.",
      "To comply with legal obligations where applicable.",
    ],
  },
  {
    heading: "Sharing and transfers",
    body: [
      "We do not sell personal information.",
      "We may share information with service providers that help us operate the product.",
      "We may disclose information where we are required to do so by law.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You can access, correct, or delete information associated with your account through the product or by contacting support.",
      "You can request a copy of the personal information we hold about you.",
    ],
  },
  {
    heading: "Data retention",
    body: [
      "We keep information only as long as needed to provide the service and meet our legal and operational obligations.",
    ],
  },
  {
    heading: "Security",
    body: [
      "We use reasonable technical and organizational measures to protect information against unauthorized access and loss.",
    ],
  },
  {
    heading: "Children",
    body: [
      "The service is not intended for children, and we do not knowingly collect information from children.",
    ],
  },
  {
    heading: "Changes to this notice",
    body: [
      "We may update this privacy notice from time to time. The updated version will apply from the date shown below.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Container>
      <h1>Privacy</h1>
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
