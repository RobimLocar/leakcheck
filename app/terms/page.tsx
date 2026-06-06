import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="legal-page">

      {/* Header */}
      <header style={{ padding: '20px 32px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontFamily: 'var(--D)', fontSize: '16px', fontWeight: 800, color: 'var(--tx)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)' }} />
          LeakCheck
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: 'var(--tx3)', textDecoration: 'none' }}>← Back to Home</Link>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 32px 80px' }}>

        <p style={{ fontSize: '12px', color: 'var(--tx3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</p>
        <h1 style={{ fontFamily: 'var(--D)', fontSize: '36px', fontWeight: 800, color: 'var(--tx)', marginBottom: '8px', letterSpacing: '-0.5px' }}>Terms of Service</h1>
        <p style={{ color: 'var(--tx3)', fontSize: '13px', marginBottom: '48px' }}>Last updated: June 5, 2026</p>

        {[
          {
            title: '1. Acceptance of terms',
            body: `By accessing or using LeakCheck ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.`,
          },
          {
            title: '2. Description of service',
            body: `LeakCheck is a SaaS tool that connects to your Stripe account via OAuth and displays a dashboard of failed payments. The Free plan provides read-only visibility. The Recovery plan ($29/month) and Lifetime plan ($149 one-time) provide additional automation features.

We reserve the right to modify or discontinue any feature of the Service at any time with reasonable notice.`,
          },
          {
            title: '3. Use of the service',
            body: `You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:

• Use the Service to transmit any unauthorized or unsolicited email or spam.
• Attempt to gain unauthorized access to any part of the Service or its related systems.
• Use the Service in any way that could damage, disable, or impair the Service.
• Resell or sublicense access to the Service without written permission.

You are responsible for maintaining the confidentiality of your account credentials.`,
          },
          {
            title: '4. Payments and billing',
            body: `Recovery plan: $29/month, billed monthly. You will be charged on the same day each month.

Lifetime plan: $149 one-time payment. This grants you lifetime access to the Service as it exists and all future features at no additional cost.

All payments are processed securely by Stripe. We do not store your credit card information.

If a payment fails, your account will be downgraded to the Free plan after a grace period. You can re-subscribe at any time.`,
          },
          {
            title: '5. Cancellation and refunds',
            body: `You may cancel your monthly subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period — you will not be charged again.

For the Lifetime plan, refunds are available within 14 days of purchase if you are not satisfied. After 14 days, the Lifetime plan is non-refundable.

We do not offer prorated refunds for partial months on the monthly plan.`,
          },
          {
            title: '6. Stripe connection',
            body: `By connecting your Stripe account, you authorize LeakCheck to access your Stripe data as described in our Privacy Policy. You can revoke this access at any time from your Stripe Dashboard. Revoking access will disable data syncing but will not affect your billing.`,
          },
          {
            title: '7. Limitation of liability',
            body: `THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

LeakCheck is not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to lost revenue, lost data, or business interruption.

Our total liability to you for any claim arising from or related to the Service is limited to the amount you paid us in the 12 months preceding the claim.`,
          },
          {
            title: '8. Governing law',
            body: `These Terms are governed by the laws of Brazil. Any disputes shall be resolved in the courts of Brazil.`,
          },
          {
            title: '9. Contact',
            body: `For questions about these Terms, contact us at:\n\nrobimlocar@gmail.com`,
          },
        ].map(section => (
          <section key={section.title} style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'var(--D)', fontSize: '18px', fontWeight: 700, color: 'var(--tx)', marginBottom: '12px' }}>{section.title}</h2>
            <p style={{ color: 'var(--tx2)', fontSize: '14.5px', lineHeight: '1.8', whiteSpace: 'pre-line' }}>{section.body}</p>
          </section>
        ))}

        <div style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--tx3)', fontSize: '13px', textDecoration: 'none' }}>← Back to Home</Link>
        </div>

      </div>
    </div>
  )
}
