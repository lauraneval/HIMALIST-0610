"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings, ListVideo, Edit } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import clsx from "clsx";

export default function UserNav() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
            setIsLoading(false);
        };
        fetchUser();
    }, []);

    const navItems = [
        { href: "/profile", label: "Edit Profile", icon: Edit },
        { href: "/preferences", label: "My Preferences", icon: Settings },
        { href: "/watchlist", label: "Watched List", icon: ListVideo },
        { href: "/account-settings", label: "Account Settings", icon: Settings },
    ];

    return (
        <aside className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
            <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4 border-2 border-neutral-600">
                    <UserCircle className="w-16 h-16 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                    {isLoading ? "Loading..." : user?.user_metadata?.username || user?.email?.split('@')[0] || 'User Profile'}
                </h2>
            </div>

            <nav className="flex flex-col gap-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} passHref>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={clsx(
                                    "w-full justify-start text-left rounded-md py-3",
                                    isActive
                                        ? "bg-[#2a2a2a] text-foreground hover:bg-neutral-700 border border-secondary"
                                        : "text-neutral-300 hover:bg-neutral-700 hover:text-foreground"
                                )}
                                disabled={isActive}
                            >
                                <item.icon
                                    className={clsx(
                                        "mr-2 h-4 w-4",
                                        isActive && "text-secondary"
                                    )}
                                /> {item.label}
                            </Button>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}