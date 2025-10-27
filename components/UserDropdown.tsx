"use client";

import { UserCircle } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import Link from "next/link";
import Logout from "./Logout";

interface UserDropdownProps {
    email: string;
    username: string;
}

export default function UserDropdown({ email, username }: UserDropdownProps) {
    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-neutral-800"
            >
                <span className="text-sm font-medium text-foreground">
                    {username}
                </span>
                <UserCircle className="h-10 w-10 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
            className="w-56 bg-[#2a2a2a] border-neutral-700 text-white"
            align="end"
        >
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Signed in as</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                {email}
                </p>
            </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-neutral-700" />

            <DropdownMenuItem className="cursor-pointer hover:bg-neutral-700 focus:bg-neutral-700">
            <Link href="/profile" className="w-full block">
                Profile
            </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer hover:bg-neutral-700 focus:bg-neutral-700">
            <Link href="/preferences" className="w-full block">
                Preference
            </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer hover:bg-neutral-700 focus:bg-neutral-700">
            <Link href="/watchlist" className="w-full block">
                Watchlist
            </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-neutral-700" />

            <DropdownMenuItem asChild className="p-0">
            <Logout />
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    );
}
