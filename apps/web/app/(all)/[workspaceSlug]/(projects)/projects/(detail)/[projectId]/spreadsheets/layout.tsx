import { Outlet } from "react-router";
import { ContentWrapper } from "@/components/core/content-wrapper";

export default function SpreadsheetLayout() {
  return (
    <ContentWrapper>
      <Outlet />
    </ContentWrapper>
  );
}
