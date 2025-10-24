"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
    const pathname = usePathname();
    const noNavPaths = ["/login", "/register"];
    const hideNavbar = noNavPaths.some((path) => pathname.startsWith(path));
    if (hideNavbar) return null;
    return <Navbar />;
}
