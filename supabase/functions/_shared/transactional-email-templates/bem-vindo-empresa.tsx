/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BaseEmail, Paragraph, type BrandProps } from './layout.tsx'

interface Props extends BrandProps {
  adminName?: string
  companyName?: string
  loginUrl?: string
}

function BemVindoEmpresaEmail({
  brandName = 'NR-1 Pronto',
  logoUrl,
  primaryColor,
  siteUrl = 'https://nr-1pronto.com.br',
  adminName = 'Olá',
  companyName,
  loginUrl = 'https://nr-1pronto.com.br/auth',
}: Props) {
  return (
    <BaseEmail
      brandName={brandName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      siteUrl={siteUrl}
      preview={`Bem-vindo ao ${brandName}! Sua conta está ativa.`}
      heading={`Bem-vindo ao ${brandName}!`}
      ctaLabel="Acessar plataforma"
      ctaUrl={loginUrl}
    >
      <Paragraph>Olá, {adminName}.</Paragraph>
      <Paragraph>
        A conta {companyName ? `de ${companyName}` : 'da sua empresa'} foi criada com sucesso e já está
        ativa. Você pode entrar agora com o e-mail e a senha cadastrados e começar a configurar sua
        equipe.
      </Paragraph>
      <Paragraph>
        No primeiro acesso, um assistente rápido vai ajudar você a definir a identidade visual, cadastrar
        departamentos e cargos e convidar os primeiros colaboradores.
      </Paragraph>
    </BaseEmail>
  )
}

export const template = {
  component: BemVindoEmpresaEmail,
  subject: (data: Props) => `Bem-vindo ao ${data.brandName ?? 'NR-1 Pronto'}! Sua conta está ativa`,
  displayName: 'Boas-vindas (empresa)',
  previewData: {
    brandName: 'NR-1 Pronto',
    adminName: 'Josenildo Almeida',
    companyName: 'Empresa Exemplo LTDA',
    loginUrl: 'https://nr-1pronto.com.br/auth',
  },
}

export default BemVindoEmpresaEmail
