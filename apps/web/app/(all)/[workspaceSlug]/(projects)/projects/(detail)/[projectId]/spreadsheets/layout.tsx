import { Outlet } from "react-router";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";

export default function SpreadsheetLayout() {
  return (
    <>
      <AppHeader header={<div className="flex h-full items-center px-4 text-13 font-medium">Spreadsheets</div>} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
