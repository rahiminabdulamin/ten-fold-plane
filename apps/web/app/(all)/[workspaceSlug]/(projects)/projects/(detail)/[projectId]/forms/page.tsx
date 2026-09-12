import { SpreadsheetDocumentsPage } from "../spreadsheets/page";
import type { Route } from "./+types/page";

export default function FormsPage({ params }: Route.ComponentProps) {
  return <SpreadsheetDocumentsPage params={params} documentType="form" />;
}
