import { LegalPageLayout } from "./legal-page-layout";

export function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how Kognitif AI Enterprise, Brunei Darussalam ("Kognitif", "we", "us", or "our")
        handles personal data when you use Ten-Fold. Questions or requests can be sent to contact@kognitif.ai.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-primary">1. Information we collect</h2>
        <p>
          We collect information needed to provide Ten-Fold, including your name, email address, profile image,
          authentication details, workspace membership and permissions, and the work content, comments, files, and
          settings you or your workspace submit. We also collect limited technical and security information such as IP
          address, browser and device information, log records, and usage events.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">2. Google sign-in</h2>
        <p>
          If you choose Google sign-in, we receive the basic identity information that Google provides to authenticate
          you, such as your name, email address, profile picture, and a provider account identifier. We use that
          information only to create or access your Ten-Fold account and keep it connected to your chosen sign-in
          method. We do not use Google data for advertising.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">3. How we use information</h2>
        <p>
          We use information to operate and secure Ten-Fold, create and administer accounts and workspaces, provide
          collaboration features, respond to support requests, send service notices, prevent abuse, and understand how
          to maintain and improve the service. We process workspace content on behalf of the workspace that submits it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">4. Service providers and disclosures</h2>
        <p>
          We use service providers to run Ten-Fold. DigitalOcean provides hosting and object storage for application
          data and uploads. Resend delivers transactional emails. We may share information with these providers only as
          necessary for their services, subject to contractual or technical safeguards. We may also disclose information
          when required by law or when reasonably necessary to protect users, Ten-Fold, Kognitif, or the public.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">5. Data security</h2>
        <p>
          We use reasonable administrative, technical, and organizational safeguards intended to protect information. No
          online service can guarantee absolute security, so you should protect your account credentials and notify us
          promptly of suspected unauthorized access.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">6. Retention</h2>
        <p>
          We retain information for as long as necessary to provide Ten-Fold, meet legal obligations, resolve disputes,
          enforce agreements, and maintain security. Workspace administrators may manage workspace content and member
          access. Some information may remain in backups for a limited period before routine deletion.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">7. Your choices and requests</h2>
        <p>
          You may update account information through Ten-Fold and contact your workspace administrator regarding
          workspace content. Subject to applicable law, you may ask us to access, correct, delete, or restrict the use
          of personal data we hold about you. Send requests to contact@kognitif.ai; we may need to verify your identity
          and authority before acting.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">8. International processing</h2>
        <p>
          Ten-Fold and our providers may process information in countries other than the country where you live. Those
          countries may have different data-protection laws. We take reasonable steps to protect information as
          described in this policy when using service providers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">9. Changes and contact</h2>
        <p>
          We may update this policy from time to time. We will post the updated version here and revise its effective
          date. For privacy questions, contact{" "}
          <a href="mailto:contact@kognitif.ai" className="text-accent hover:underline">
            contact@kognitif.ai
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
