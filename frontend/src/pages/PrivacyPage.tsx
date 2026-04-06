import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LegalPageShell } from '@/components/legal/LegalPageShell'

const LAST_UPDATED = 'April 6, 2026'

export function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <LegalPageShell title={t('legal.privacyTitle')} lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how <strong>My Closet</strong> (“we”, “us”) collects,
        uses, stores, and shares information when you use our Service (website, account
        features, uploads, outfit features, and payments).
      </p>
      <p>
        By using the Service, you agree to this policy. If you do not agree, please do not
        use the Service.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> email address, password hash, preferences, and
          language settings.
        </li>
        <li>
          <strong>Content you provide:</strong> photos of clothing and related metadata
          you choose to upload.
        </li>
        <li>
          <strong>Usage and diagnostics:</strong> app events, approximate technical data
          (e.g. device type, browser), and logs to keep the Service secure and reliable.
        </li>
        <li>
          <strong>Payment information:</strong> payments are handled by our payment
          provider (e.g. Razorpay). We receive limited payment status and transaction
          references—not your full card number.
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide, maintain, and secure accounts and features.</li>
        <li>
          Process uploads, run automated analysis (including AI) to label items and
          suggest outfits, and improve quality and safety of those features.
        </li>
        <li>Process Premium purchases and comply with tax or legal obligations.</li>
        <li>Communicate about the Service, support, and important notices.</li>
        <li>Detect abuse, fraud, and technical issues.</li>
      </ul>

      <h2>3. Legal bases (where applicable)</h2>
      <p>
        Depending on your region, we rely on <strong>contract</strong> (to deliver the
        Service), <strong>legitimate interests</strong> (security, improvement, analytics
        in line with this policy), and <strong>consent</strong> where required (e.g.
        certain cookies or marketing, if we offer them).
      </p>

      <h2>4. Sharing</h2>
      <p>We may share information with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> who host infrastructure, analytics, email, or
          AI APIs under strict use limitations.
        </li>
        <li>
          <strong>Payment processors</strong> to complete transactions you initiate.
        </li>
        <li>
          <strong>Authorities</strong> if required by law or to protect rights, safety,
          and security.
        </li>
      </ul>
      <p>We do not sell your personal information as a commodity.</p>

      <h2>5. Retention</h2>
      <p>
        We keep information only as long as needed for the purposes above, including
        legal, accounting, and dispute resolution needs. You may request deletion of your
        account subject to exceptions (e.g. fraud prevention, legal holds).
      </p>

      <h2>6. Security</h2>
      <p>
        We use reasonable technical and organisational measures to protect data. No method
        of transmission or storage is 100% secure.
      </p>

      <h2>7. Your choices and rights</h2>
      <ul>
        <li>
          Access, correction, or deletion requests where applicable law grants them.
        </li>
        <li>
          Withdraw consent where processing is consent-based, without affecting prior
          lawful processing.
        </li>
        <li>Object to certain processing where local law allows.</li>
      </ul>
      <p>
        To exercise rights, contact us via{' '}
        <Link
          to="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Contact
        </Link>
        . We may verify your identity before responding.
      </p>

      <h2>8. Cookies and similar technologies</h2>
      <p>
        We may use cookies or local storage for login sessions, preferences, and basic
        analytics. You can control cookies through your browser settings; some features
        may not work without them.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is not directed to children under the age required by applicable law
        to consent without parental permission. If you believe we collected a child’s data
        improperly, contact us.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Our providers may process data in India or other countries. Where required, we
        implement appropriate safeguards.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the new version
        and update the “Last updated” date.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy questions:{' '}
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
