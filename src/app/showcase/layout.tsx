import ShowcaseHeader from "@/features/showcase/presentation/layout/showcase-header";
import { ReactNode } from "react";

interface ShowcaseLayoutProps {
  children: ReactNode;
}

const ShowcaseLayout = ({ children }: ShowcaseLayoutProps) => {
  return (
    <>
      <ShowcaseHeader />
      <main>{children}</main>
    </>
  );
};

export default ShowcaseLayout;
