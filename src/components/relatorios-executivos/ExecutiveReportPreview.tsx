import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";
import { ReportCoverPage } from "./ReportCoverPage";
import { ReportSummaryPage } from "./ReportSummaryPage";
import { ReportPeopleAnalyticsPage } from "./ReportPeopleAnalyticsPage";
import { ReportPromotionsPage } from "./ReportPromotionsPage";
import { ReportPerformancePage } from "./ReportPerformancePage";
import { ReportConsultingPage } from "./ReportConsultingPage";
import { ReportDesligamentosPage } from "./ReportDesligamentosPage";
import { ReportDiarioBordoPage } from "./ReportDiarioBordoPage";
import { ReportFeedbackAlertasPage } from "./ReportFeedbackAlertasPage";
import { ReportFeedbacksPage } from "./ReportFeedbacksPage";

interface Props {
  data: ExecutiveReportData;
  companyName: string;
  year: number;
  logoUrl?: string | null;
  parecerHtml: string;
}

export function ExecutiveReportPreview({ data, companyName, year, logoUrl, parecerHtml }: Props) {
  return (
    <div className="print-report-container bg-white shadow-lg rounded-xl overflow-hidden" style={{ maxWidth: '210mm' }}>
      <ReportCoverPage companyName={companyName} year={year} logoUrl={logoUrl} />
      <ReportSummaryPage data={data} year={year} />
      <ReportDesligamentosPage data={data} year={year} />
      <ReportPeopleAnalyticsPage data={data} year={year} />
      <ReportPromotionsPage data={data} year={year} />
      <ReportPerformancePage data={data} year={year} />
      <ReportDiarioBordoPage data={data} year={year} />
      <ReportFeedbackAlertasPage data={data} year={year} />
      <ReportFeedbacksPage data={data} year={year} />
      <ReportConsultingPage parecerHtml={parecerHtml} companyName={companyName} year={year} />
    </div>
  );
}
