import type { ComponentType } from 'npm:@types/react@18.3.1'
import { template as acessoLiberado } from './acesso-liberado.tsx'
import { template as bemVindoEmpresa } from './bem-vindo-empresa.tsx'
import { template as empresaSuspensa } from './empresa-suspensa.tsx'
import { template as empresaReativada } from './empresa-reativada.tsx'
import { template as redefinicaoSenha } from './redefinicao-senha.tsx'

export interface TemplateEntry {
  component: ComponentType<Record<string, unknown>>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'acesso-liberado': acessoLiberado,
  'bem-vindo-empresa': bemVindoEmpresa,
  'empresa-suspensa': empresaSuspensa,
  'empresa-reativada': empresaReativada,
  'redefinicao-senha': redefinicaoSenha,
}
