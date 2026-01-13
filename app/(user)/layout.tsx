import { UserNavbar } from "@/components/user-navbar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserNavbar />
      {children}
    </>
  );
}
