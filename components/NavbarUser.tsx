import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import React from "react";
import NavbarClient from "./NavbarClient";

const NavbarUser = async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userRole = null;
    if (user) {
        const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("id", user.id)
        .single();
        if (!roleError) userRole = userData?.role;
    }
    const isAdmin = !!(user && userRole === "admin");

return (
        <nav className="sticky top-0 z-50 bg-[#1e1e1e] border-b border-muted w-full flex items-center px-4 md:px-6 shadow-md">
            <div className="flex w-full items-center justify-between h-16 gap-x-6 md:gap-x-8">
                <div className="flex items-center gap-x-4 flex-1">
                    <Link href="/" className="text-xl font-bold text-foreground whitespace-nowrap">
                        HimaList
                    </Link>
                </div>

                <NavbarClient isAdmin={isAdmin} />

                <div className="flex items-center">
                        {!user ? (
                            <Link href="/login">
                                <div className="bg-secondary text-foreground text-sm px-4 py-2 rounded hover:bg-secondary-hover">
                                    Login
                                </div>
                            </Link>
                        ) : (
                            null
                        )}
                    </div>
            </div>
        </nav>
    );
};

export default NavbarUser;
