import { LegalPageLayout } from "./legal-page-layout";

export function TermsOfService() {
  return (
    <LegalPageLayout title="Terms of Service">
      <p>
        These Terms of Service govern your use of Ten-Fold, a work-management service operated by Kognitif AI
        Enterprise, Brunei Darussalam ("Kognitif", "we", "us", or "our"). By creating an account, joining a workspace,
        or using Ten-Fold, you agree to these terms.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-primary">1. The service</h2>
        <p>
          Ten-Fold provides tools for teams to plan, organize, and collaborate on work. We may update, improve, or
          discontinue features to maintain, secure, or develop the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">2. Accounts and workspaces</h2>
        <p>
          You must provide accurate account information and keep your credentials secure. Workspace owners and
          administrators are responsible for managing members, permissions, and the content submitted to their
          workspace. You must be authorized to use any email address, information, or content you provide.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">3. Acceptable use</h2>
        <p>You must not misuse Ten-Fold. In particular, you must not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>break the law, infringe rights, or submit harmful, deceptive, or unlawful material;</li>
          <li>attempt unauthorized access, disrupt the service, probe its security, or introduce malware;</li>
          <li>use the service to spam, harass, impersonate others, or collect data without permission; or</li>
          <li>reverse engineer, resell, or exploit the service except where applicable law permits it.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">4. Your content</h2>
        <p>
          You retain ownership of the content you submit to Ten-Fold. You grant Kognitif the limited right to host,
          process, transmit, back up, and display that content only as needed to operate, support, protect, and improve
          the service at your direction. You are responsible for ensuring that your content and its use comply with law
          and these terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">5. Third-party services</h2>
        <p>
          Ten-Fold may use third-party services, including identity providers, infrastructure providers, and email
          delivery providers. Your use of those services may also be subject to their terms and privacy notices. We are
          not responsible for third-party services that we do not control.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">6. Availability and support</h2>
        <p>
          We aim to keep Ten-Fold available and secure, but the service may be unavailable, delayed, or changed from
          time to time. We do not guarantee uninterrupted or error-free operation. Contact us at contact@kognitif.ai for
          support questions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">7. Suspension and termination</h2>
        <p>
          You may stop using Ten-Fold at any time. We may suspend or terminate access when reasonably necessary to
          protect the service, comply with law, address a breach of these terms, or prevent harm. Where practical, we
          will provide notice of material action affecting your account.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">8. Disclaimers and liability</h2>
        <p>
          Ten-Fold is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, Kognitif
          disclaims warranties of merchantability, fitness for a particular purpose, and non-infringement. To the
          maximum extent permitted by law, Kognitif will not be liable for indirect, incidental, special, consequential,
          or punitive damages, or for loss of data, profits, goodwill, or business opportunity.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">9. Changes to these terms</h2>
        <p>
          We may update these terms as Ten-Fold evolves. We will post the revised version here and update the effective
          date. Continuing to use Ten-Fold after a change takes effect means you accept the updated terms, unless law
          requires a different process.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">10. Contact</h2>
        <p>
          Questions about these terms may be sent to{" "}
          <a href="mailto:contact@kognitif.ai" className="text-accent hover:underline">
            contact@kognitif.ai
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
