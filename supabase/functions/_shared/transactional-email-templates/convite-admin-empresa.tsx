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

interface ConviteAdminEmpresaProps {
  siteName?: string
  siteUrl?: string
  adminName?: string
  companyName?: string
  logoUrl?: string
  confirmationUrl?: string
  expirationHours?: number
}

export const template = {
  component: ConviteAdminEmpresaEmail,
  subject: (data: ConviteAdminEmpresaProps) =>
    data.companyName
      ? `Sua empresa ${data.companyName} foi cadastrada — defina sua senha`
      : 'Sua empresa foi cadastrada — defina sua senha',
  displayName: 'Convite Admin Empresa',
  previewData: {
    siteName: 'NR-1 Pronto',
    siteUrl: 'https://nr1pronto.com.br',
    adminName: 'João Silva',
    companyName: 'Empresa XYZ',
    confirmationUrl: 'https://nr1pronto.com.br/atualizar-senha#token=exemplo',
    expirationHours: 24,
  },
}

function ConviteAdminEmpresaEmail({
  siteName = 'NR-1 Pronto',
  siteUrl = 'https://nr1pronto.com.br',
  adminName = 'Administrador',
  companyName = 'sua empresa',
  logoUrl,
  confirmationUrl = '#',
  expirationHours = 24,
}: ConviteAdminEmpresaProps) {
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
      <Preview>
        {companyName} foi cadastrada no {siteName}. Defina sua senha de administrador em até{' '}
        {expirationHours} horas.
      </Preview>
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
            Bem-vindo ao painel administrativo
          </Heading>

          <Text style={{ color: foreground, fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
            Olá, {adminName}!
          </Text>

          <Text style={{ color: mutedForeground, fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
            A empresa <strong style={{ color: foreground }}>{companyName}</strong> foi cadastrada
            na plataforma <strong style={{ color: foreground }}>{siteName}</strong>. Você foi
            configurado como administrador desta empresa.
          </Text>

          <Text style={{ color: mutedForeground, fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            Para acessar o painel administrativo, clique no botão abaixo e defina uma senha segura.
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
            único. Se você não esperava este e-mail, entre em contato com o suporte.
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

export default ConviteAdminEmpresaEmail
