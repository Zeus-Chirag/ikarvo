import type { Metadata } from "next";

import { Container } from "~/components/Container";

export const metadata: Metadata = {
  title: "Terms — Ikarvo",
  description:
    "The terms that govern your use of Ikarvo and its services.",
};

const Sections = [
  {
    heading: "Overview",
    body: [
      "These terms explain the rules for using Ikarvo.",
      "By using the service, you agree to these terms.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "You are responsible for keeping your account credentials confidential.",
      "You must not share your account with others unless the product expressly allows it.",
    ],
  },
  {
    heading: "Permitted use",
    body: [
      "You may use the service for its intended purpose.",
      "You must not misuse the service or attempt to interfere with its operation.",
    ],
  },
  {
    heading: "Restrictions",
    body: [
      "You may not reverse engineer the service.",
      "You may not use the service to distribute unlawful material.",
      "You may not attempt to gain unauthorized access to the service.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "Ikarvo owns the service and its intellectual property.",
      "Your content remains yours, subject to the license you grant us to operate the service.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "We are not responsible for indirect or incidental losses where the law allows.",
      "Our total liability is limited to the extent permitted by law.",
    ],
  },
  {
    heading: "Termination",
    body: [
      "We may suspend or terminate access where required by these terms or applicable law.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms from time to time.",
      "The updated version will apply from the date shown below.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "If you have questions about these terms, contact support through the product.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Container>
      <h1>Terms</h1>
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
