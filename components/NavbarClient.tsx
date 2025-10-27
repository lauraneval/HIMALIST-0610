"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function NavbarClient({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname();

    return (
        <div className="hidden sm:flex items-center gap-x-5 text-sm font-medium text-muted-foreground">
            {isAdmin ? (
                <>
                <Link
                    href="/"
                    className={clsx(
                    "pb-1 transition-colors",
                    pathname === "/"
                        ? "text-foreground font-semibold border-b-2 border-secondary"
                        : "hover:text-foreground"
                    )}
                >
                    Dashboard
                </Link>
                <Link
                    href="/admin/anime"
                    className={clsx(
                    "pb-1 transition-colors",
                    pathname.startsWith("/admin/anime")
                        ? "text-foreground font-semibold border-b-2 border-secondary"
                        : "hover:text-foreground"
                    )}
                >
                    Anime
                </Link>
                <Link
                    href="/admin/studio"
                    className={clsx(
                    "pb-1 transition-colors",
                    pathname.startsWith("/admin/studio")
                        ? "text-foreground font-semibold border-b-2 border-secondary"
                        : "hover:text-foreground"
                    )}
                >
                    Studio
                </Link>
                <Link
                    href="/admin/genre"
                    className={clsx(
                    "pb-1 transition-colors",
                    pathname.startsWith("/admin/genre")
                        ? "text-foreground font-semibold border-b-2 border-secondary"
                        : "hover:text-foreground"
                    )}
                >
                    Genre
                </Link>
                </>
            ) : (
                <>
                <Link
                    href="/"
                    className={clsx(
                    "pb-1 transition-colors",
                    pathname === "/" ? "text-foreground font-semibold" : "hover:text-foreground"
                    )}
                >
                    Home
                </Link>
                <Link
                    href="/gallery"
                    className={clsx(
                    "pb-1 transition-colors",
                    pathname.startsWith("/gallery")
                        ? "text-foreground font-semibold"
                        : "hover:text-foreground"
                    )}
                >
                    Gallery
                </Link>
                </>
            )}
        </div>
    );
}
