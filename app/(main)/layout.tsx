import Navbar from "@/components/Navbar";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      <div className="flex-grow">{children}</div>
    </>
  );
}
