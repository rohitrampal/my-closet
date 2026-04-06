import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LegalPageShell } from '@/components/legal/LegalPageShell'

const LAST_UPDATED = 'April 6, 2026'

export function TermsPage() {
  const { t } = useTranslation()

  return (
    <LegalPageShell title={t('legal.termsTitle')} lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Use (“Terms”) govern your access to and use of{' '}
        <strong>My Closet</strong> (the “Service”), including our website, mobile web
        experience, and related features such as uploading clothing images, AI-assisted
        outfit suggestions, and optional paid Premium features.
      </p>
      <p>
        By creating an account or using the Service, you agree to these Terms. If you do
        not agree, do not use the Service.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The Service is operated by the business or individual identified on our{' '}
        <Link
          to="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Contact
        </Link>{' '}
        page (“we”, “us”). Where we process payments, a third-party payment provider (such
        as Razorpay) may appear on checkout; their terms and privacy policy also apply to
        the payment step.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>
          You must provide accurate registration information and keep your password
          secure.
        </li>
        <li>You are responsible for activity under your account.</li>
        <li>You must be legally able to enter a contract in your jurisdiction.</li>
      </ul>

      <h2>3. The Service</h2>
      <p>
        My Closet helps you organize items you upload and may generate outfit ideas using
        automated systems. Output is <strong>informational and stylistic</strong>, not
        professional advice. We do not guarantee specific results, fit, or suitability for
        any occasion.
      </p>

      <h2>4. Your content</h2>
      <p>
        You retain rights to photos and content you upload. You grant us a licence to
        host, process, and display that content{' '}
        <strong>to operate and improve the Service</strong> (including machine learning or
        AI features where applicable), subject to our{' '}
        <Link
          to="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
      <p>
        You must not upload unlawful, infringing, or harmful content, or misuse others’
        likeness.
      </p>

      <h2>5. Premium and payments</h2>
      <p>
        Some features may require a one-time or recurring Premium purchase. Prices, taxes,
        and billing cadence are shown at checkout. Payments are processed by our payment
        partner; we do not store full card numbers on our servers.
      </p>
      <p>
        <strong>Taxes.</strong> You are responsible for any applicable taxes unless we
        state otherwise.
      </p>
      <p>
        See our{' '}
        {/* <Link
          to="/refunds"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Refund &amp; cancellation policy
        </Link>{' '} */}
        <span className="font-medium text-foreground">
          Refund &amp; cancellation policy
        </span>{' '}
        for refunds and cancellations.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>No reverse engineering, scraping, or attempts to overload the Service.</li>
        <li>No unlawful, fraudulent, or abusive behaviour.</li>
        <li>No infringement of intellectual property or privacy rights of others.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        The Service’s software, branding, and materials (excluding your uploads) are owned
        by us or our licensors. You receive a limited, revocable licence to use the
        Service for personal, non-commercial purposes unless we agree otherwise in
        writing.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided <strong>“as is”</strong> to the fullest extent permitted
        by law. We disclaim implied warranties where allowed. AI-generated suggestions may
        be incorrect or inappropriate; use your own judgment.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, we are not liable for indirect,
        incidental, special, consequential, or punitive damages, or loss of profits or
        data, arising from your use of the Service. Our aggregate liability for claims
        relating to the Service is limited to the greater of (a) the amount you paid us in
        the twelve (12) months before the claim or (b) a reasonable nominal amount where
        no fees were paid, unless mandatory law requires otherwise.
      </p>

      <h2>10. Suspension and termination</h2>
      <p>
        We may suspend or terminate access for breach of these Terms, risk, or legal
        requirements. You may stop using the Service at any time. Provisions that by
        nature should survive will survive termination.
      </p>

      <h2>11. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of <strong>India</strong>, without regard to
        conflict-of-law rules. Courts at a venue we specify on the Contact page (or, if
        none, in India) shall have jurisdiction, subject to any consumer protections that
        apply to you.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms by posting a revised version and updating the “Last
        updated” date. Continued use after changes means you accept the updated Terms, to
        the extent permitted by law.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms: see{' '}
        <Link
          to="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Contact
        </Link>
        .
      </p>
    </LegalPageShell>
  )
}
