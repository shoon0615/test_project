import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "작은 게시판",
  description: "json-server로 동작하는 게시판 CRUD 데모",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
