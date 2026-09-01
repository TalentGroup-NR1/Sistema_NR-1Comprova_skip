/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BaseEmail, Paragraph, type BrandProps } from './layout.tsx'

interface Props extends BrandProps {
  companyName?: string
  reason?: string
  supportEmail?: string
}

function EmpresaSuspensaEmail({
  brandName = 'NR-1 Pronto',
  logoUrl,
  primaryColor,
  siteUrl = 'https://nr1pronto.com.br',
  companyName,
  reason,
  supportEmail = 'suporte@nr1pronto.com.br',
}: Props) {
  return (
    <BaseEmail
      brandName={brandName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      siteUrl={siteUrl}
      preview={`O acesso ${companyName ? `de ${companyName}` : 'da sua empresa'} foi suspenso.`}
      heading="Acesso suspenso"
      footerNote={`Para regularizar, entre em contato pelo e-mail ${supportEmail}.`}
    >
      <Paragraph>
        O acesso {companyName ? `de ${companyName}` : 'da sua empresa'} ao {brandName} foi suspenso
        temporariamente. Enquanto a suspensão estiver ativa, os usuários não conseguirão entrar na
        plataforma.
      </Paragraph>
      {reason ? <Paragraph>Motivo informado: {reason}</Paragraph> : null}
      <Paragraph>
        Os dados permanecem preservados e o acesso é restabelecido assim que a situação for regularizada.
      </Paragraph>
    </BaseEmail>
  )
}

export const template = {
  component: EmpresaSuspensaEmail,
  subject: (data: Props) => `Acesso suspenso — ${data.brandName ?? 'NR-1 Pronto'}`,
  displayName: 'Empresa suspensa',
  previewData: {
    brandName: 'NR-1 Pronto',
    companyName: 'Empresa Exemplo LTDA',
    reason: 'Pendência financeira',
  },
}

export default EmpresaSuspensaEmail
