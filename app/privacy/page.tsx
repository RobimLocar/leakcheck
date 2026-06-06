import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)', fontFamily: 'var(--B)' }}>

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
        <h1 style={{ fontFamily: 'var(--D)', fontSize: '36px', fontWeight: 800, color: 'var(--tx)', marginBottom: '8px', letterSpacing: '-0.5px' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--tx3)', fontSize: '13px', marginBottom: '48px' }}>Last updated: June 5, 2026</p>

        {[
          {
            title: '1. What we collect',
            body: `We collect the minimum data necessary to provide the service:

• Email address — used for authentication and to send you account-related emails (welcome, payment recovery notifications).
• Stripe OAuth token — a read-only access token obtained through Stripe Connect OAuth. This token allows us to read your invoice, charge, and customer data from Stripe. We never access your full card data or initiate any financial transactions.
• Failed payment data — invoice IDs, customer names, customer emails, amounts, currencies, and failure reasons fetched from your Stripe account and stored in our database for display in your dashboard.
• Usage data — basic analytics about how you use the service (page views, feature usage).`,
          },
          {
            title: '2. How we use your data',
            body: `We use your data solely to provide and improve LeakCheck:

• To display your failed payment dashboard.
• To send automated recovery emails to your customers on your behalf (Pro plan only).
• To send you transactional emails (welcome email, billing receipts).
• To calculate the total amount you have lost and could recover.

We do not use your data for advertising, profiling, or any purpose beyond operating the service.`,
          },
          {
            title: '3. We never sell your data',
            body: `We do not sell, rent, or share your personal data or your customers' data with any third party for commercial purposes. Full stop.

The only third parties that receive data are:
• Supabase — our database provider, used to store your account and payment data securely.
• Resend — our email delivery provider, used only to send emails you have explicitly triggered.
• Stripe — your payment processor, which is the source of the data we read via OAuth.`,
          },
          {
            title: '4. Data security',
            body: `All data is encrypted in transit (TLS) and at rest. Your Stripe access token is stored encrypted and is never exposed in client-side code or API responses. We use Supabase Row Level Security (RLS) to ensure each user can only access their own data.`,
          },
          {
            title: '5. Data retention',
            body: `We retain your data for as long as your account is active. If you delete your account, all associated data is permanently deleted within 30 days. You can request deletion at any time by contacting us.`,
          },
          {
            title: '6. Your rights',
            body: `You have the right to access, correct, or delete your personal data at any time. You can revoke LeakCheck's access to your Stripe account at any time from your Stripe Dashboard under Connected Applications.`,
          },
          {
            title: '7. Contact',
            body: `If you have any questions about this Privacy Policy, please contact us at:\n\nrobimlocar@gmail.com`,
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
