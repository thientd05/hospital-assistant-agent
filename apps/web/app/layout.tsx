import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FamilyHealth AI — Phòng khám gia đình thông minh",
    template: "%s · FamilyHealth AI",
  },
  description:
    "Phòng khám gia đình với trợ lý AI 24/7. Đặt lịch dễ, theo dõi sức khoẻ tại nhà, đội ngũ bác sĩ tận tâm tại TP.HCM và Hà Nội.",
  openGraph: {
    title: "FamilyHealth AI — Phòng khám gia đình thông minh",
    description:
      "Bác sĩ gia đình đồng hành cùng bạn, trợ lý AI hỗ trợ 24/7. 12 chuyên khoa, 50+ bác sĩ, đặt lịch trực tuyến.",
    locale: "vi_VN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#087E8B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
