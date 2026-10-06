/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BaseEmail, Paragraph, type BrandProps } from './layout.tsx'

interface Props extends BrandProps {
  companyName?: string
  loginUrl?: string
}

function EmpresaReativadaEmail({
  brandName = 'NR-1Comprova',
  logoUrl,
  primaryColor,
  siteUrl = 'https://nr1pronto.com.br',
  companyName,
  loginUrl = 'https://nr1pronto.com.br/auth',
}: Props) {
  return (
    <BaseEmail
      brandName={brandName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      siteUrl={siteUrl}
      preview={`O acesso ${companyName ? `de ${companyName}` : 'da sua empresa'} foi restabelecido.`}
      heading="Acesso restabelecido"
      ctaLabel="Entrar na plataforma"
      ctaUrl={loginUrl}
      footerNote="Bem-vindo de volta!"
    >
      <Paragraph>
        Boas notícias: o acesso {companyName ? `de ${companyName}` : 'da sua empresa'} ao {brandName} foi
        reativado.
      </Paragraph>
      <Paragraph>
        Todos os usuários já podem entrar normalmente, com os mesmos dados de acesso de antes. Nenhuma
        informação foi perdida durante a suspensão.
      </Paragraph>
    </BaseEmail>
  )
}

export const template = {
  component: EmpresaReativadaEmail,
  subject: (data: Props) => `Acesso restabelecido — ${data.brandName ?? 'NR-1Comprova'}`,
  displayName: 'Empresa reativada',
  previewData: {
    brandName: 'NR-1Comprova',
    companyName: 'Empresa Exemplo LTDA',
    loginUrl: 'https://nr1pronto.com.br/auth',
  },
}

export default EmpresaReativadaEmail
