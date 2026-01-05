import { Navbar } from "@/components/shared/navbar";

interface HomeLayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  );
}
