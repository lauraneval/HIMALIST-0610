import NavbarUser from "@/components/NavbarUser";
import UserNav from "@/components/UserNav";
import React from "react";

export default function UserLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div>
            <NavbarUser />
            <div className="flex flex-1 md:flex-row py-8 text-foreground">
                <UserNav />
                <main className="w-full md:flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}