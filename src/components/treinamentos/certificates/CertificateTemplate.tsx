import { forwardRef } from "react";
import { 
  formatarDataConclusao, 
  formatarDataEmissaoCurta,
  NOME_PLATAFORMA 
} from "@/lib/certificadoBranding";

interface CertificateTemplateProps {
  colaboradorNome: string;
  treinamentoTitulo: string;
  cargaHoraria: number;
  dataConclusao: string | Date;
  dataEmissao: string | Date;
  certificateCode: string;
  validationUrl: string;
  qrCodeDataUrl?: string;
  companyName?: string;
  companyLogoUrl?: string;
}

const CornerOrnament = ({ style }: { style: React.CSSProperties }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    style={{ position: "absolute", zIndex: 2, ...style }}
  >
    <path
      d="M2 2H16V5H5V16H2V2Z"
      fill="#1a365d"
    />
    <path
      d="M7 7H14V9H9V14H7V7Z"
      fill="#c5a059"
    />
  </svg>
);

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ 
    colaboradorNome, 
    treinamentoTitulo, 
    cargaHoraria, 
    dataConclusao, 
    dataEmissao,
    certificateCode,
    validationUrl,
    qrCodeDataUrl,
    companyName = NOME_PLATAFORMA,
    companyLogoUrl,
  }, ref) => {
    const dataConclusaoTexto = formatarDataConclusao(dataConclusao);
    const dataEmissaoTexto = formatarDataEmissaoCurta(dataEmissao);

    // Ajuste 4: Nome longo (>40 caracteres) reduz para 20pt para evitar quebra feia
    const nomeFontSize = (colaboradorNome || '').length > 40 ? "20pt" : "24pt";

    // Ajuste 4: Título do treinamento em itálico e truncar com "..." se exceder 90 caracteres
    const tituloFormatado = (treinamentoTitulo || '').length > 90 
      ? (treinamentoTitulo || '').slice(0, 87) + '...' 
      : (treinamentoTitulo || '');

    return (
      <div 
        ref={ref}
        className="certificate-template"
        style={{
          width: "297mm",
          height: "210mm",
          padding: "16mm",
          backgroundColor: "#ffffff",
          position: "relative",
          fontFamily: "'Times New Roman', Times, Georgia, serif",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Moldura externa fina dourada (1px) */}
        <div
          style={{
            position: "absolute",
            top: "9mm",
            left: "9mm",
            right: "9mm",
            bottom: "9mm",
            border: "1px solid #c5a059",
            borderRadius: "2px",
            pointerEvents: "none",
          }}
        />
        
        {/* Moldura interna azul marinho (2px) com margem clássica de diploma */}
        <div
          style={{
            position: "absolute",
            top: "12mm",
            left: "12mm",
            right: "12mm",
            bottom: "12mm",
            border: "2px solid #1a365d",
            borderRadius: "2px",
            pointerEvents: "none",
          }}
        />

        {/* Detalhes ornamentais clássicos nos 4 cantos da moldura */}
        <CornerOrnament style={{ top: "12mm", left: "12mm" }} />
        <CornerOrnament style={{ top: "12mm", right: "12mm", transform: "scaleX(-1)" }} />
        <CornerOrnament style={{ bottom: "12mm", left: "12mm", transform: "scaleY(-1)" }} />
        <CornerOrnament style={{ bottom: "12mm", right: "12mm", transform: "scale(-1, -1)" }} />

        {/* Marca d'água discreta do logo ao centro (opacidade 0.04) */}
        {companyLogoUrl && (
          <img
            src={companyLogoUrl}
            alt=""
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "120mm",
              maxHeight: "80mm",
              objectFit: "contain",
              opacity: 0.04,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}

        {/* Conteúdo Principal */}
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6mm 10mm 0 10mm",
            textAlign: "center",
            zIndex: 1,
          }}
        >
          {/* Cabeçalho */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10mm",
                marginBottom: "4mm",
              }}
            >
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={`Logo ${companyName}`}
                  style={{
                    height: "65px",
                    width: "auto",
                    maxWidth: "110mm",
                    objectFit: "contain",
                  }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  style={{
                    height: "65px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1a365d",
                    fontSize: "18pt",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                  }}
                >
                  {companyName}
                </div>
              )}
            </div>
            
            <h1
              style={{
                fontSize: "36pt",
                fontWeight: "bold",
                color: "#1a365d",
                margin: "0",
                letterSpacing: "8px",
                textTransform: "uppercase",
              }}
            >
              CERTIFICADO
            </h1>

            {/* Linha divisória dourada sutil abaixo do título */}
            <div
              style={{
                width: "60mm",
                height: "2px",
                backgroundColor: "#c5a059",
                margin: "3mm auto 0 auto",
              }}
            />
          </div>

          {/* Corpo do Certificado */}
          <div style={{ maxWidth: "230mm", margin: "4mm 0" }}>
            <p
              style={{
                fontSize: "14pt",
                color: "#334155",
                lineHeight: "1.6",
                margin: "0 0 4mm 0",
              }}
            >
              Certificamos que
            </p>
            
            <p
              style={{
                fontSize: nomeFontSize,
                fontWeight: "bold",
                color: "#0f2340",
                margin: "0 auto 6mm auto",
                borderBottom: "2px solid #c5a059",
                paddingBottom: "3mm",
                maxWidth: "210mm",
                wordBreak: "break-word",
              }}
            >
              {colaboradorNome}
            </p>
            
            <p
              style={{
                fontSize: "14pt",
                color: "#1e293b",
                lineHeight: "1.8",
                margin: "0",
              }}
            >
              concluiu com êxito o treinamento{" "}
              <em style={{ fontStyle: "italic", fontWeight: "bold", color: "#1a365d" }}>
                "{tituloFormatado}"
              </em>
              {cargaHoraria > 0 && (
                <>, com carga horária de <strong>{cargaHoraria} hora{cargaHoraria > 1 ? "s" : ""}</strong></>
              )}
              , realizado em{" "}
              <strong>
                {dataConclusaoTexto}
              </strong>
              .
            </p>
            
            <p
              style={{
                fontSize: "12pt",
                color: "#475569",
                fontStyle: "italic",
                marginTop: "6mm",
                marginBottom: "0",
              }}
            >
              Para os devidos fins, apresentamos o presente certificado.
            </p>
          </div>

          {/* Rodapé: Grid de 3 Colunas Perfeitamente Alinhadas na Linha de Base */}
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              alignItems: "end",
              columnGap: "8mm",
              paddingBottom: "6mm",
              boxSizing: "border-box",
            }}
          >
            {/* Coluna 1: Assinatura com espaço reservado >= 60px acima da linha */}
            <div
              style={{
                minHeight: "65px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                textAlign: "center",
                alignSelf: "end",
              }}
            >
              <div
                style={{
                  width: "75mm",
                  borderTop: "1px solid #1e293b",
                  paddingTop: "2mm",
                  margin: "0 auto",
                }}
              >
                <p style={{ fontSize: "10pt", color: "#1e293b", margin: "0", fontWeight: 600 }}>
                  Instrutor / Responsável
                </p>
              </div>
            </div>

            {/* Coluna 2: Informações de Emissão e Código */}
            <div
              style={{
                textAlign: "center",
                alignSelf: "end",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              {/* Ajuste 3.2: Label com dois-pontos sem ponto final */}
              <p style={{ fontSize: "10pt", color: "#1e293b", margin: "0 0 2mm 0" }}>
                Data de Emissão: <strong>{dataEmissaoTexto}</strong>
              </p>
              <p style={{ fontSize: "9.5pt", color: "#334155", margin: "0", fontFamily: "monospace" }}>
                Código: <strong>{certificateCode}</strong>
              </p>
            </div>

            {/* Coluna 3: QR Code em PNG Base64 */}
            <div
              style={{
                textAlign: "center",
                alignSelf: "end",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code de Validação"
                  width={80}
                  height={80}
                  style={{
                    width: "80px",
                    height: "80px",
                    display: "block",
                    border: "1px solid #cbd5e1",
                    padding: "2px",
                    backgroundColor: "#ffffff",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: "8pt",
                    color: "#64748b",
                  }}
                >
                  QR Code
                </div>
              )}
              <p style={{ fontSize: "8pt", color: "#475569", margin: "2mm 0 0 0" }}>
                Escaneie para validar
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = "CertificateTemplate";
