/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface AcessoLiberadoProps {
  siteName?: string
  siteUrl?: string
  recipientName?: string
  companyName?: string
  logoUrl?: string
  confirmationUrl?: string
  expirationHours?: number
}

export const template = {
  component: AcessoLiberadoEmail,
  subject: (data: AcessoLiberadoProps) =>
    data.siteName ? `Seu acesso ao ${data.siteName} foi liberado` : 'Seu acesso foi liberado',
  displayName: 'Acesso Liberado',
  previewData: {
    siteName: 'NR-1 Pronto',
    siteUrl: 'https://nr1pronto.com.br',
    recipientName: 'Maria Silva',
    companyName: 'Talent Group',
    confirmationUrl: 'https://nr1pronto.com.br/atualizar-senha#token=exemplo',
    expirationHours: 24,
  },
}

function AcessoLiberadoEmail({
  siteName = 'NR-1 Pronto',
  siteUrl = 'https://nr1pronto.com.br',
  recipientName = 'Colaborador',
  companyName = 'sua empresa',
  logoUrl,
  confirmationUrl = '#',
  expirationHours = 24,
}: AcessoLiberadoProps) {
  const primary = '#DC2626'
  const primaryForeground = '#FFFFFF'
  const foreground = '#0F172A'
  const mutedForeground = '#475569'
  const background = '#F8FAFC'
  const card = '#FFFFFF'
  const border = '#E2E8F0'

  return (
    <Html>
      <Head />
      <Preview>Seu acesso ao {siteName} foi liberado. Defina sua senha em até {expirationHours} horas.</Preview>
      <Body style={{ backgroundColor: background, fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container
          style={{
            backgroundColor: card,
            borderRadius: '12px',
            border: `1px solid ${border}`,
            margin: '24px auto',
            maxWidth: '560px',
            padding: '40px 32px',
          }}
        >
          {logoUrl ? (
            <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Img src={logoUrl} alt={siteName} style={{ maxHeight: '48px', margin: '0 auto' }} />
            </Section>
          ) : (
            <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Text
                style={{
                  color: primary,
                  fontSize: '24px',
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}
              >
                TALENT GROUP
              </Text>
            </Section>
          )}

          <Heading
            as="h1"
            style={{
              color: foreground,
              fontSize: '22px',
              fontWeight: 700,
              textAlign: 'center',
              margin: '0 0 24px 0',
            }}
          >
            Seu acesso foi liberado
          </Heading>

          <Text style={{ color: foreground, fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
            Olá, {recipientName}
          </Text>

          <Text style={{ color: mutedForeground, fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            O acesso ao <strong style={{ color: foreground }}>{siteName}</strong> foi liberado para você{' '}
            {companyName ? `em ${companyName}` : ''}. Para começar a usar o sistema, defina uma senha segura
            clicando no botão abaixo.
          </Text>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={confirmationUrl}
              style={{
                backgroundColor: primary,
                color: primaryForeground,
                borderRadius: '8px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Definir minha senha
            </Button>
          </Section>

          <Text
            style={{
              color: mutedForeground,
              fontSize: '14px',
              lineHeight: '1.5',
              textAlign: 'center',
              margin: '0 0 24px 0',
            }}
          >
            Este link expira em <strong style={{ color: foreground }}>{expirationHours} horas</strong> e é de uso
            único. Se não solicitou este acesso, ignore este e-mail.
          </Text>

          <Section
            style={{
              borderTop: `1px solid ${border}`,
              paddingTop: '24px',
              marginTop: '32px',
            }}
          >
            <Text style={{ color: mutedForeground, fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
              Se o botão não funcionar, copie e cole este link no navegador:
              <br />
              <a href={confirmationUrl} style={{ color: primary, wordBreak: 'break-all' }}>
                {confirmationUrl}
              </a>
            </Text>
          </Section>

          <Text
            style={{
              color: mutedForeground,
              fontSize: '12px',
              lineHeight: '1.4',
              textAlign: 'center',
              margin: '24px 0 0 0',
            }}
          >
            {siteName} — {siteUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AcessoLiberadoEmail
