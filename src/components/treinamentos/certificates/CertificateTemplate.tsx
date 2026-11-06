import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  companyName?: string;
  companyLogoUrl?: string;
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ 
    colaboradorNome, 
    treinamentoTitulo, 
    cargaHoraria, 
    dataConclusao, 
    dataEmissao,
    certificateCode,
    validationUrl,
    companyName = NOME_PLATAFORMA,
    companyLogoUrl,
  }, ref) => {
    const dataConclusaoTexto = formatarDataConclusao(dataConclusao);
    const dataEmissaoTexto = formatarDataEmissaoCurta(dataEmissao);

    return (
      <div 
        ref={ref}
        className="certificate-template"
        style={{
          width: "297mm",
          height: "210mm",
          padding: "20mm",
          backgroundColor: "#ffffff",
          position: "relative",
          fontFamily: "'Times New Roman', Times, serif",
          boxSizing: "border-box",
        }}
      >
        {/* Borda decorativa */}
        <div
          style={{
            position: "absolute",
            top: "10mm",
            left: "10mm",
            right: "10mm",
            bottom: "10mm",
            border: "3px double #1a365d",
            borderRadius: "4px",
          }}
        />
        
        {/* Borda interna */}
        <div
          style={{
            position: "absolute",
            top: "14mm",
            left: "14mm",
            right: "14mm",
            bottom: "14mm",
            border: "1px solid #2c5282",
            borderRadius: "2px",
          }}
        />

        {/* Conteúdo */}
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10mm",
            textAlign: "center",
          }}
        >
          {/* Cabeçalho com Logo */}
          <div style={{ width: "100%" }}>
            {/* Container do Cabeçalho - Logo centralizado */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "15mm",
                marginBottom: "8mm",
              }}
            >
              {/* Logo da Empresa ou da Plataforma */}
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={`Logo ${companyName}`}
                  style={{
                    height: "80px",
                    width: "auto",
                    maxWidth: "120mm",
                    objectFit: "contain",
                  }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  style={{
                    height: "80px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4a5568",
                    fontSize: "18pt",
                    fontWeight: "bold",
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
          </div>

          {/* Corpo principal */}
          <div style={{ maxWidth: "220mm", margin: "10mm 0" }}>
            <p
              style={{
                fontSize: "14pt",
                color: "#2d3748",
                lineHeight: "2",
                margin: "0 0 8mm 0",
              }}
            >
              Certificamos que
            </p>
            
            <p
              style={{
                fontSize: "24pt",
                fontWeight: "bold",
                color: "#1a365d",
                margin: "0 0 8mm 0",
                borderBottom: "2px solid #2c5282",
                paddingBottom: "4mm",
              }}
            >
              {colaboradorNome}
            </p>
            
            <p
              style={{
                fontSize: "14pt",
                color: "#2d3748",
                lineHeight: "1.8",
                margin: "0",
              }}
            >
              concluiu com êxito o treinamento{" "}
              <strong style={{ color: "#1a365d" }}>"{treinamentoTitulo}"</strong>
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
                color: "#4a5568",
                fontStyle: "italic",
                marginTop: "8mm",
              }}
            >
              Para os devidos fins, apresentamos o presente certificado.
            </p>
          </div>

          {/* Rodapé com assinatura e validação */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {/* Assinatura */}
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: "80mm",
                  borderTop: "1px solid #2d3748",
                  paddingTop: "2mm",
                  margin: "0 auto",
                }}
              >
                <p style={{ fontSize: "10pt", color: "#2d3748", margin: "0" }}>
                  Instrutor / Responsável
                </p>
              </div>
            </div>

            {/* Informações de emissão */}
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: "10pt", color: "#4a5568", margin: "0 0 2mm 0" }}>
                Data de Emissão: {dataEmissaoTexto}
              </p>
              <p style={{ fontSize: "9pt", color: "#718096", margin: "0" }}>
                Código: <strong>{certificateCode}</strong>
              </p>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "2mm",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                }}
              >
                <QRCodeSVG
                  value={validationUrl}
                  size={80}
                  level="M"
                />
              </div>
              <p style={{ fontSize: "8pt", color: "#718096", margin: "2mm 0 0 0" }}>
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
