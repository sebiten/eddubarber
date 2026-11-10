import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Eddu Barber Studio",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
