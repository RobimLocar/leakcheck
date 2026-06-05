const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://leakcheck-three.vercel.app'

const STEPS = [
  {
    n: '1',
    title: 'Connect Stripe',
    desc: 'OAuth em 2 cliques. Acesso read-only — nunca tocamos no seu dinheiro.',
  },
  {
    n: '2',
    title: 'Veja seus dados reais',
    desc: 'Scan dos últimos 90 dias. Veja exatamente o que falhou e por quê.',
  },
  {
    n: '3',
    title: 'Ative o Recovery',
    desc: 'Retentativas automáticas + emails de recuperação enviados aos seus clientes.',
  },
]

export default function WelcomeEmail({ email }: { email: string }) {
  void email // passed for future personalisation
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0d0d0d', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '40px 20px' }}>
                <table cellPadding={0} cellSpacing={0} style={{ maxWidth: '560px', width: '100%' }}>
                  <tbody>

                    {/* Logo */}
                    <tr>
                      <td style={{ paddingBottom: '28px' }}>
                        <table cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff3d3d' }} />
                              </td>
                              <td style={{ verticalAlign: 'middle', color: '#ffffff', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.4px' }}>
                                LeakCheck
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Card */}
                    <tr>
                      <td style={{ backgroundColor: '#161616', borderRadius: '16px', padding: '40px', border: '1px solid #222' }}>

                        {/* Badge */}
                        <p style={{ margin: '0 0 12px', color: '#ff3d3d', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                          Welcome to LeakCheck
                        </p>

                        {/* Headline */}
                        <h1 style={{ margin: '0 0 14px', color: '#ffffff', fontSize: '24px', fontWeight: 800, lineHeight: '1.3', letterSpacing: '-0.5px' }}>
                          Stop losing money<br />you've already earned.
                        </h1>
                        <p style={{ margin: '0 0 32px', color: '#888', fontSize: '14.5px', lineHeight: '1.65' }}>
                          Você está dentro. LeakCheck monitora sua conta Stripe em busca de pagamentos falhos e mostra exatamente quanto é recuperável — antes que seja tarde demais.
                        </p>

                        {/* Steps */}
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '32px' }}>
                          <tbody>
                            {STEPS.map((step, idx) => (
                              <tr key={step.n}>
                                <td style={{ paddingBottom: idx < STEPS.length - 1 ? '20px' : 0 }}>
                                  <table cellPadding={0} cellSpacing={0}>
                                    <tbody>
                                      <tr>
                                        <td style={{ verticalAlign: 'top', paddingRight: '14px' }}>
                                          <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: '#1c1c1c', border: '1px solid #2e2e2e', color: '#ff3d3d', fontSize: '12px', fontWeight: 700, textAlign: 'center', lineHeight: '28px' }}>
                                            {step.n}
                                          </div>
                                        </td>
                                        <td style={{ verticalAlign: 'top' }}>
                                          <p style={{ margin: '0 0 3px', color: '#e8e8e8', fontSize: '13.5px', fontWeight: 600 }}>{step.title}</p>
                                          <p style={{ margin: 0, color: '#666', fontSize: '13px', lineHeight: '1.55' }}>{step.desc}</p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Divider */}
                        <div style={{ height: '1px', backgroundColor: '#222', marginBottom: '28px' }} />

                        {/* CTA */}
                        <table cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td>
                                <a
                                  href={`${APP_URL}/onboarding`}
                                  style={{ display: 'inline-block', backgroundColor: '#ff3d3d', color: '#ffffff', fontSize: '14px', fontWeight: 700, padding: '13px 26px', borderRadius: '10px', textDecoration: 'none', letterSpacing: '0.1px' }}
                                >
                                  Connect Stripe →
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ margin: '16px 0 0', color: '#444', fontSize: '12px' }}>
                          🔒 Read-only OAuth · We never touch your money
                        </p>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ paddingTop: '28px', textAlign: 'center' }}>
                        <p style={{ margin: 0, color: '#3d3d3d', fontSize: '12px', lineHeight: '1.7' }}>
                          You received this because you signed up for LeakCheck.<br />
                          <a href={APP_URL} style={{ color: '#555', textDecoration: 'underline' }}>leakcheck.app</a>
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
