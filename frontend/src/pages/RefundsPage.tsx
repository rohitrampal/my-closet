import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LegalPageShell } from '@/components/legal/LegalPageShell'

const LAST_UPDATED = 'April 6, 2026'

export function RefundsPage() {
  const { t } = useTranslation()

  return (
    <LegalPageShell title={t('legal.refundsTitle')} lastUpdated={LAST_UPDATED}>
      <p>
        This policy describes refunds and cancellations for <strong>My Closet</strong>{' '}
        Premium and related digital services. It is designed to be clear for customers and
        payment partners.
      </p>

      <h2>1. Nature of the product</h2>
      <p>
        Premium unlocks <strong>digital features</strong> inside the Service (e.g.
        enhanced outfit generation or limits). Unless we explicitly sell a physical good,
        nothing is shipped.
      </p>

      <h2>2. When you pay</h2>
      <p>
        Charges are shown in INR (or as displayed at checkout) before you confirm. You
        authorize our payment partner to charge the selected amount. Successful payment
        activates Premium according to the offer shown at purchase (e.g. monthly access if
        that is what we sell).
      </p>

      <h2>3. Cancellations</h2>
      <ul>
        <li>
          You may <strong>stop using</strong> Premium features at any time; that does not
          automatically refund past charges unless required below.
        </li>
        <li>
          If we offer <strong>subscription renewal</strong>, you can cancel before the
          next billing date to avoid future charges (where such billing is available in
          the product).
        </li>
      </ul>

      <h2>4. Refunds</h2>
      <ul>
        <li>
          <strong>Duplicate charge:</strong> If you were charged twice for the same
          purchase by mistake, contact us with transaction details; we will investigate
          and correct or refund the duplicate where confirmed.
        </li>
        <li>
          <strong>Technical failure:</strong> If Premium was not activated after a
          successful payment and our logs confirm it, we will either activate your access
          or refund the payment.
        </li>
        <li>
          <strong>Statutory rights:</strong> Nothing in this policy limits mandatory
          consumer rights under applicable law in India (or your jurisdiction, if we serve
          you there).
        </li>
        <li>
          <strong>Change of mind:</strong> Digital services may not be eligible for refund
          once access is delivered, except where law requires or we choose to offer a
          goodwill refund.
        </li>
      </ul>

      <h2>5. How to request help</h2>
      <p>
        Email or channel listed on our{' '}
        <Link
          to="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Contact
        </Link>{' '}
        page with your account email, date of payment, and (if available) payment or order
        ID from your receipt or bank SMS.
      </p>

      <h2>6. Chargebacks</h2>
      <p>
        Please contact us first so we can resolve issues quickly. Unwarranted chargebacks
        may lead to suspension of the account pending review.
      </p>

      <h2>7. Payment provider</h2>
      <p>
        Refunds, where issued, are typically processed back to the original payment method
        via our payment partner and may take several business days to appear on your
        statement.
      </p>

      <h2>8. Changes</h2>
      <p>We may update this policy; the “Last updated” date will change accordingly.</p>

      <h2>9. Related</h2>
      <p>
        Also read our{' '}
        <Link
          to="/terms"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Terms of Use
        </Link>{' '}
        and{' '}
        <Link
          to="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </LegalPageShell>
  )
}
