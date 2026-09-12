import SpreadsheetEditorPage from "../../spreadsheets/[spreadsheetId]/page";
import type { Route } from "./+types/page";

export default function FormEditorPage({ params }: Route.ComponentProps) {
  return <SpreadsheetEditorPage params={params} />;
}
