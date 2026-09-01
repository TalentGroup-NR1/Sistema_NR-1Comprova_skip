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

export interface BrandProps {
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  siteUrl?: string
}

export interface BaseEmailProps extends BrandProps {
  preview: string
  heading: string
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
  children: React.ReactNode
}

export const colors = {
  foreground: '#0F172A',
  muted: '#475569',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
}

export function BaseEmail({
  brandName = 'NR-1 Pronto',
  logoUrl,
  primaryColor = '#C8102E',
  siteUrl = 'https://nr-1pronto.com.br',
  preview,
  heading,
  ctaLabel,
  ctaUrl,
  footerNote,
  children,
}: BaseEmailProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: 'Inter, Arial, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: colors.card,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            margin: '24px auto',
            maxWidth: '560px',
            padding: '40px 32px',
          }}
        >
          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            {logoUrl ? (
              <Img src={logoUrl} alt={brandName} style={{ maxHeight: '48px', margin: '0 auto' }} />
            ) : (
              <Text
                style={{
                  color: primaryColor,
                  fontSize: '24px',
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: '-0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {brandName}
              </Text>
            )}
          </Section>

          <Heading
            as="h1"
            style={{
              color: colors.foreground,
              fontSize: '22px',
              fontWeight: 700,
              textAlign: 'center',
              margin: '0 0 24px 0',
            }}
          >
            {heading}
          </Heading>

          {children}

          {ctaLabel && ctaUrl ? (
            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button
                href={ctaUrl}
                style={{
                  backgroundColor: primaryColor,
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {ctaLabel}
              </Button>
            </Section>
          ) : null}

          {ctaLabel && ctaUrl ? (
            <Section
              style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '24px', marginTop: '24px' }}
            >
              <Text style={{ color: colors.muted, fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                Se o botão não funcionar, copie e cole este link no navegador:
                <br />
                <a href={ctaUrl} style={{ color: primaryColor, wordBreak: 'break-all' }}>
                  {ctaUrl}
                </a>
              </Text>
            </Section>
          ) : null}

          {footerNote ? (
            <Text
              style={{
                color: colors.muted,
                fontSize: '14px',
                lineHeight: '1.5',
                textAlign: 'center',
                margin: '24px 0 0 0',
              }}
            >
              {footerNote}
            </Text>
          ) : null}

          <Text
            style={{
              color: colors.muted,
              fontSize: '12px',
              lineHeight: '1.4',
              textAlign: 'center',
              margin: '24px 0 0 0',
            }}
          >
            {brandName} — {siteUrl}
            <br />
            Este é um e-mail automático, não responda.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: colors.muted, fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
      {children}
    </Text>
  )
}
