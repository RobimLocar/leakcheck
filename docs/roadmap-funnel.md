# Roadmap — Funil de conversão (upsell, downsell, thank you, remarketing)

Documento de planejamento. Nada aqui está implementado ainda — é a base pra decidir o que construir e em que ordem.

Funil atual do LeakCheck: `/upgrade` (Free $0 · Recovery $29/mo · Lifetime $149) → `/api/checkout` → Stripe Checkout → volta pro `/dashboard`. Não existe hoje: página de obrigado dedicada, upsell/downsell pós-checkout, nem remarketing de quem abandona o checkout.

## Por que isso importa (dados reais, pesquisados)

- **Upsell pós-compra é a janela de menor risco**: a oferta aparece depois que o cliente já pagou, no clique único, sem repetir dados de cartão — não pode "estragar" a venda original. Conversão típica de 10–20% quando bem direcionada. [Yotpo](https://www.yotpo.com/blog/post-purchase-upsell/) · [Growth Suite](https://www.growthsuite.net/resources/shopify-upsell-cross-sell/post-purchase-upsell)
- **Ofertas relevantes convertem 2–4x mais que genéricas** — a oferta tem que vir de dado real de uso, não achismo. [Aftersell](https://www.aftersell.com/blog/tips-to-optimize-your-post-purchase-upsell-performance)
- **Downsell em fluxo de cancelamento salva 20–30% de quem ia cancelar**, chegando a 30–42% quando a oferta casa com o motivo real do cancelamento (não é só desconto genérico). [Userpilot](https://userpilot.com/blog/cancellation-flow-examples/) · [SaveMRR](https://savemrr.co/blog/saas-cancel-flow-best-practices)
- **Preço é o motivo real na maioria dos casos**: 34% dos clientes que cancelaram dizem que um desconto simples teria mudado a decisão; outros 34% dizem que um preço mais baixo resolveria. Dois terços do churn voluntário é por preço. [SaveMRR](https://savemrr.co/blog/saas-cancel-flow-best-practices)
- **⚠️ Cuidado legal**: a lei de renovação automática da Califórnia (em vigor desde jul/2025) limita a **uma única oferta de retenção** durante cancelamento, e exige que o botão de cancelar fique visível ao mesmo tempo que a oferta — não dá pra empurrar 3 telas de "espera, não vai!" antes de deixar cancelar. A UE vai ter regra parecida a partir de jun/2026. Isso afeta diretamente o desenho do Downsell 1/2.
- **Página de obrigado bem feita vira gatilho de onboarding**: estrutura recomendada é "3C" — confirma a ação, esclarece o próximo passo, um único CTA. É também o melhor momento pra pedir indicação (cliente está satisfeito e acabou de confiar no produto). [Khod.io](https://www.khod.io/resource-center/articles/thank-you-page-examples) · [Incredo](https://incredo.co/blog/saas-thank-you-page-best-practices)
- **Sequência de remarketing por email**: 2 a 4 emails ao longo de uma semana converte 69% mais que um email único. O desconto só deve aparecer no 2º ou 3º email — não no primeiro, pra não dar margem de graça pra quem converteria sem ele. [Rejoiner](https://www.rejoiner.com/resources/abandoned-cart-email-statistics) · [GetResponse](https://www.getresponse.com/blog/abandoned-cart-email-examples)
- **Recuperação de pagamento como nicho**: dunning manual recupera só 2–5%; é exatamente a categoria que o LeakCheck ataca, e funis de upsell/downsell bem feitos são o que separa um "SaaS de nicho" de um produto com LTV maior por cliente. [DealHub](https://dealhub.io/glossary/saas-dunning/) · [Superframeworks](https://superframeworks.com/articles/best-micro-saas-ideas-solopreneurs)

## MVP proposto (ordem de prioridade)

### 1. Página de obrigado (`/thank-you` ou `/checkout/success`)
Hoje o `success_url` do checkout manda direto pro `/dashboard` — sem nenhum momento de confirmação. Trocar por uma página intermediária:
- Confirma o plano comprado e o valor
- CTA único: "Conectar Stripe agora" (se ainda não conectou) ou "Ir pro Dashboard"
- Pedido de indicação leve (não obrigatório clicar): "Conhece outro founder perdendo dinheiro com pagamento falho? Indique e ganhe 1 mês grátis"

**Por quê primeiro**: zero risco, não interfere em nada existente, e é a base estrutural pra pendurar upsell/downsell depois.

### 2. Upsell 1 — entra na própria página de obrigado
Só dispara pra quem comprou **Recovery mensal** (não Lifetime, não tem o que oferecer pra quem já comprou tudo):
> "Trave o preço pra sempre — upgrade pra Lifetime por $149 e pare de pagar $29/mês" (mostrar economia: paga-se sozinho em ~5 meses)

Botão único, sem re-digitar cartão (usar Stripe Checkout em modo `mode: payment` com o customer_id já existente).

### 3. Downsell 1 — só dispara se Upsell 1 for recusado
Pra quem recusou o Lifetime, oferecer algo menor, não o mesmo produto mais barato:
> "Sem problema. Que tal um pacote de 100 SMS extras por $9 (uso único)?" — ou um add-on real que já exista no produto, não inventar feature nova só pra ter o que vender

### 4. Remarketing — abandono de checkout (sem comprar nada)
Sequência de email pra quem visitou `/upgrade`, clicou em "Start Recovery" mas não completou:
- Email 1 (1h depois): lembrete simples, sem desconto — "Você estava vendo a Recovery, ficou alguma dúvida?"
- Email 2 (2 dias depois): prova social — "200+ founders já recuperando, veja quanto X recuperou"
- Email 3 (5 dias depois): **aqui entra o desconto** — "Primeiro mês por $19 em vez de $29"

**Pré-requisito técnico**: hoje não existe rastreio de quem chegou no checkout e não completou — precisa logar isso (ex: evento ao clicar "Start Recovery", e webhook `checkout.session.expired` do Stripe pra saber quem abandonou de verdade).

### 5. Downsell 2 / Upsell 2 — só depois de validar 1–4
Não vale a pena desenhar a segunda camada antes de ver se a primeira converte. Quando houver dado real de quanto a Upsell 1 e a Downsell 1 convertem, decide-se se compensa adicionar mais um degrau ou se a complexidade não paga o retorno (a pesquisa aponta isso: "um único upsell bem pensado costuma superar um funil de 5 downsells").

### Fluxo de cancelamento (separado do funil de compra)
Quando o usuário Pro for cancelar (hoje só existe "Manage Billing / Cancel" indo direto pro portal do Stripe), considerar:
- Uma pergunta de motivo (5–7 opções) antes de abrir o portal
- **Uma única** oferta de retenção casada com o motivo (ex: motivo "caro" → oferta de desconto; motivo "não uso" → oferta de pausar a assinatura por 30 dias)
- Manter o botão de cancelar visível junto da oferta (exigência legal CA/UE)

## O que fica de fora do MVP (por enquanto)
- Upsell 2 / Downsell 2 — esperar dado real dos primeiros
- Personalização por uso (ex: "você teve 12 pagamentos falhos esse mês, considere X") — exige tracking de analytics que não existe ainda
- Remarketing pago (ads de retargeting) — fora do escopo de produto, é trabalho de marketing

## Trabalho técnico que isso implica
- Nova página `/thank-you` + trocar `success_url` do `/api/checkout`
- Tabela/evento pra rastrear abandono de checkout (sem isso, não tem quem mandar email de remarketing)
- Sequência de email automatizada (Resend, reaproveitando o que já existe em `lib/resend/client.ts`)
- Webhook novo: `checkout.session.expired` (hoje só escutamos `checkout.session.completed` e `customer.subscription.deleted`)
