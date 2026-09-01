import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { TERMS_VERSION } from "@/lib/legal";

const sections: LegalSection[] = [
  {
    title: "Objeto",
    paragraphs: [
      "Estes Termos de Uso regulam o acesso e a utilização da plataforma de gestão de pessoas e saúde e segurança do trabalho disponibilizada em modelo de assinatura às empresas contratantes.",
      "Ao concluir o cadastro, a empresa contratante declara ter lido e aceito integralmente estes Termos e a Política de Privacidade.",
    ],
  },
  {
    title: "Cadastro e acesso",
    paragraphs: [
      "O cadastro é realizado pelo responsável indicado pela empresa, que passa a ser o administrador da conta e responde pela criação e pela manutenção dos demais acessos.",
      "As credenciais são pessoais e intransferíveis. A empresa é responsável por manter seus dados cadastrais atualizados e por comunicar imediatamente qualquer uso não autorizado.",
    ],
  },
  {
    title: "Responsabilidades da contratante",
    paragraphs: [
      "A empresa é responsável pela veracidade, exatidão e legalidade das informações inseridas na plataforma, inclusive dos dados de seus colaboradores.",
      "É vedado utilizar a plataforma para finalidades ilícitas, para tentar obter acesso não autorizado a dados de terceiros ou para comprometer a disponibilidade do serviço.",
    ],
  },
  {
    title: "Responsabilidades da plataforma",
    paragraphs: [
      "A plataforma envida os melhores esforços para manter o serviço disponível, íntegro e seguro, adotando medidas técnicas e organizacionais adequadas.",
      "Podem ocorrer interrupções programadas para manutenção, comunicadas sempre que possível com antecedência.",
    ],
  },
  {
    title: "Dados pessoais e LGPD",
    paragraphs: [
      "O tratamento de dados pessoais observa a Lei nº 13.709/2018 (LGPD) e está detalhado na Política de Privacidade, que integra estes Termos.",
      "A empresa contratante atua como controladora dos dados de seus colaboradores e a plataforma como operadora, seguindo as instruções da contratante.",
    ],
  },
  {
    title: "Propriedade intelectual",
    paragraphs: [
      "O software, a marca, os layouts, os modelos de documento e os conteúdos disponibilizados são de titularidade da plataforma, sendo concedida à contratante apenas uma licença de uso durante a vigência do contrato.",
      "Os dados inseridos pela contratante permanecem de sua titularidade e podem ser exportados a qualquer momento.",
    ],
  },
  {
    title: "Suspensão e cancelamento",
    paragraphs: [
      "O acesso pode ser suspenso em caso de inadimplência, violação destes Termos ou uso que coloque em risco a segurança da plataforma ou de terceiros.",
      "Encerrada a relação contratual, a contratante poderá solicitar a exportação de seus dados dentro do prazo informado antes da eliminação definitiva.",
    ],
  },
  {
    title: "Alterações destes Termos",
    paragraphs: [
      "Estes Termos podem ser atualizados a qualquer tempo, com identificação de nova versão e data de atualização nesta página.",
      "Alterações relevantes são comunicadas aos administradores das contas ativas.",
    ],
  },
  {
    title: "Foro",
    paragraphs: [
      "Fica eleito o foro da comarca da sede da plataforma para dirimir controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.",
    ],
  },
];

export default function Termos() {
  return <LegalPage title="Termos de Uso" version={TERMS_VERSION} sections={sections} />;
}
