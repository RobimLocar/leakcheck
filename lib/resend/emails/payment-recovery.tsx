export type PaymentRecoveryProps = {
  customerName: string | null
  customerEmail: string
  amount: number
  currency: string
  failureReason: string
  updatePaymentUrl: string
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

export default function PaymentRecoveryEmail({
  customerName,
  customerEmail,
  amount,
  currency,
  failureReason,
  updatePaymentUrl,
}: PaymentRecoveryProps) {
  const name = customerName ?? customerEmail
  const amountStr = formatAmount(amount, currency)

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '48px 20px' }}>
                <table cellPadding={0} cellSpacing={0} style={{ maxWidth: '540px', width: '100%' }}>
                  <tbody>

                    {/* Card */}
                    <tr>
                      <td style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

                        {/* Red top bar */}
                        <table width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: '#ff3d3d', padding: '20px 32px' }}>
                                <table cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    <tr>
                                      <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.6)' }} />
                                      </td>
                                      <td style={{ verticalAlign: 'middle', color: '#ffffff', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>
                                        LeakCheck
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Body */}
                        <table width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '36px 32px 32px' }}>

                                <h1 style={{ margin: '0 0 8px', color: '#111', fontSize: '22px', fontWeight: 800, lineHeight: '1.3', letterSpacing: '-0.4px' }}>
                                  Action required: payment failed
                                </h1>
                                <p style={{ margin: '0 0 28px', color: '#555', fontSize: '14.5px', lineHeight: '1.6' }}>
                                  Hi {name}, a recent payment could not be processed. Please update your payment method to keep your access uninterrupted.
                                </p>

                                {/* Summary box */}
                                <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '28px', backgroundColor: '#fafafa', borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ padding: '20px 22px' }}>

                                        {/* Amount */}
                                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '14px' }}>
                                          <tbody>
                                            <tr>
                                              <td style={{ color: '#888', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Amount due</td>
                                              <td style={{ textAlign: 'right', color: '#111', fontSize: '18px', fontWeight: 800 }}>{amountStr}</td>
                                            </tr>
                                          </tbody>
                                        </table>

                                        {/* Divider */}
                                        <div style={{ height: '1px', backgroundColor: '#e8e8e8', marginBottom: '14px' }} />

                                        {/* Reason */}
                                        <table width="100%" cellPadding={0} cellSpacing={0}>
                                          <tbody>
                                            <tr>
                                              <td style={{ color: '#888', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Reason</td>
                                              <td style={{ textAlign: 'right' }}>
                                                <span style={{ display: 'inline-block', backgroundColor: '#fff0f0', color: '#cc2222', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', border: '1px solid #ffd5d5' }}>
                                                  {failureReason}
                                                </span>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>

                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                {/* CTA */}
                                <table cellPadding={0} cellSpacing={0} style={{ marginBottom: '24px' }}>
                                  <tbody>
                                    <tr>
                                      <td>
                                        <a
                                          href={updatePaymentUrl}
                                          style={{ display: 'inline-block', backgroundColor: '#ff3d3d', color: '#ffffff', fontSize: '14px', fontWeight: 700, padding: '13px 26px', borderRadius: '10px', textDecoration: 'none' }}
                                        >
                                          Update Payment Method →
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <p style={{ margin: 0, color: '#aaa', fontSize: '12.5px', lineHeight: '1.6' }}>
                                  If you have questions, reply to this email — we're happy to help.<br />
                                  This email was sent to {customerEmail}.
                                </p>

                              </td>
                            </tr>
                          </tbody>
                        </table>

                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ paddingTop: '24px', textAlign: 'center' }}>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>
                          Sent via LeakCheck · Failed payment recovery
                        </p>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

      </body>
    </html>
  )
}
