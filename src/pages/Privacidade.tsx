import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { PRIVACY_VERSION } from "@/lib/legal";

const sections: LegalSection[] = [
  {
    title: "Objeto e abrangência",
    paragraphs: [
      "Esta Política de Privacidade descreve como os dados pessoais são coletados, utilizados, armazenados e protegidos na plataforma, em conformidade com a Lei nº 13.709/2018 (LGPD).",
      "Aplica-se aos dados das empresas contratantes, de seus administradores e de seus colaboradores cadastrados.",
    ],
  },
  {
    title: "Papéis das partes",
    paragraphs: [
      "A empresa contratante é a controladora dos dados de seus colaboradores, definindo as finalidades do tratamento.",
      "A plataforma atua como operadora, tratando os dados exclusivamente conforme as instruções da controladora e as obrigações legais aplicáveis.",
    ],
  },
  {
    title: "Dados coletados",
    paragraphs: [
      "Dados cadastrais da empresa (razão social, CNPJ, endereço e contatos) e do administrador responsável.",
      "Dados de colaboradores necessários à gestão de pessoas e à saúde e segurança do trabalho, como identificação, cargo, jornada, registros de ponto, férias, treinamentos e respostas a questionários.",
      "Dados técnicos de acesso, como endereço IP, navegador, data e hora, usados para segurança e auditoria.",
    ],
  },
  {
    title: "Finalidades do tratamento",
    paragraphs: [
      "Prestar os serviços contratados, incluindo controle de jornada, avaliações, benefícios, treinamentos e gestão de riscos psicossociais (NR-1).",
      "Cumprir obrigações legais e regulatórias, gerar documentos obrigatórios e comprovar conformidade em fiscalizações.",
      "Garantir a segurança da informação, prevenir fraudes e registrar aceites e auditorias.",
    ],
  },
  {
    title: "Compartilhamento",
    paragraphs: [
      "Os dados não são vendidos nem cedidos a terceiros para fins publicitários.",
      "O compartilhamento ocorre apenas com prestadores de infraestrutura e envio de e-mails necessários à operação, com obrigações contratuais de confidencialidade, ou quando exigido por autoridade competente.",
    ],
  },
  {
    title: "Armazenamento e segurança",
    paragraphs: [
      "Os dados são armazenados em ambiente com controle de acesso por perfil, isolamento por empresa, criptografia em trânsito e rotinas de backup.",
      "Cada empresa acessa exclusivamente os próprios dados, conforme regras de segurança aplicadas na camada de banco de dados.",
    ],
  },
  {
    title: "Retenção e eliminação",
    paragraphs: [
      "Os dados são mantidos durante a vigência do contrato e pelos prazos legais de guarda aplicáveis à relação de trabalho e às obrigações de SST.",
      "Encerrados esses prazos ou atendida solicitação de eliminação, os dados são excluídos de forma definitiva, ressalvadas as hipóteses legais de conservação.",
    ],
  },
  {
    title: "Direitos do titular",
    paragraphs: [
      "O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamentos, revogação de consentimento e eliminação dos dados tratados com base no consentimento.",
      "As solicitações devem ser encaminhadas ao setor de recursos humanos da empresa empregadora, que é a controladora, ou diretamente ao encarregado indicado abaixo.",
    ],
  },
  {
    title: "Encarregado de dados (DPO)",
    paragraphs: [
      "O contato do encarregado pelo tratamento de dados pessoais é disponibilizado pela empresa contratante e também pelo canal de suporte da plataforma.",
    ],
  },
  {
    title: "Alterações desta Política",
    paragraphs: [
      "Esta Política pode ser atualizada a qualquer tempo, com identificação de nova versão e data de atualização nesta página.",
    ],
  },
];

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      version={PRIVACY_VERSION}
      sections={sections}
    />
  );
}
