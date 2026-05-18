import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "THV – Quản Lý Chấm Công",
  description: "Hệ thống quản lý chấm công THV – cấu hình tháng, phân bổ ca làm việc, xuất báo cáo Excel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
