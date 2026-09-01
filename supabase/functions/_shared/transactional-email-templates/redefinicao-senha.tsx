/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BaseEmail, Paragraph, type BrandProps } from './layout.tsx'

interface Props extends BrandProps {
  recipientName?: string
  resetUrl?: string
  expirationHours?: number
}

function RedefinicaoSenhaEmail({
  brandName = 'NR-1 Pronto',
  logoUrl,
  primaryColor,
  siteUrl = 'https://nr1pronto.com.br',
  recipientName,
  resetUrl = 'https://nr1pronto.com.br/atualizar-senha',
  expirationHours = 1,
}: Props) {
  return (
    <BaseEmail
      brandName={brandName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      siteUrl={siteUrl}
      preview={`Redefinição de senha — ${brandName}`}
      heading="Redefinição de senha"
      ctaLabel="Redefinir minha senha"
      ctaUrl={resetUrl}
      footerNote={`Este link expira em ${expirationHours} hora(s). Se não foi você que solicitou, ignore este e-mail.`}
    >
      <Paragraph>Olá{recipientName ? `, ${recipientName}` : ''}.</Paragraph>
      <Paragraph>
        Você solicitou a redefinição da sua senha de acesso ao {brandName}. Clique no botão abaixo para
        criar uma nova senha.
      </Paragraph>
    </BaseEmail>
  )
}

export const template = {
  component: RedefinicaoSenhaEmail,
  subject: (data: Props) => `Redefinição de senha — ${data.brandName ?? 'NR-1 Pronto'}`,
  displayName: 'Redefinição de senha',
  previewData: {
    brandName: 'NR-1 Pronto',
    recipientName: 'Maria Silva',
    resetUrl: 'https://nr1pronto.com.br/atualizar-senha#token=exemplo',
    expirationHours: 1,
  },
}

export default RedefinicaoSenhaEmail
