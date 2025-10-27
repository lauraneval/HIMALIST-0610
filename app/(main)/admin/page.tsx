"use client";

import Link from "next/link";

export default function AdminPage(){
    return(
        <div className="flex items-center gap-x-5">
            <Link href="/admin/anime">Anime</Link>
            <Link href="/admin/studio">Studio</Link>
            <Link href="/admin/genre">Genre</Link>
        </div>
    )
}