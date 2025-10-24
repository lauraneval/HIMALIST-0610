import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import React from "react";
import Logout from "./Logout";

const Navbar = async () => {

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = null;
  if (user) {
    const { data: userData, error: roleError } = await supabase
      .from('user')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError) {
      console.error("Error fetching user role:", roleError.message);
    } else {
      userRole = userData?.role;
    }
  }

  const isAdmin = user && userRole === 'admin';

  return (
    <nav className="border-b bg-background w-full flex items-center">
      <div className="flex w-full items-center justify-between my-4">
        <h1 className="font-bold">
          HimaList
        </h1>

        <div className="flex items-center gap-x-5">
          {isAdmin ? (
            <>
              <Link href="/">Dashboard</Link>
              <Link href="/admin/anime">Anime</Link>
              <Link href="/admin/studio">Studio</Link>
              <Link href="/admin/genre">Genre</Link>
            </>
          ) : (
            <>
              <Link href="/">Home</Link>
              <Link href="/admin/anime">Gallery</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-x-5">
        {!user ? (
          <Link href="/login">
            <div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-sm">
              Login
            </div>
          </Link>
          ) : (
          <div className="flex items-center gap-x-2 text-sm">
            {user?.email}
            <Logout />
          </div>
          )
        }
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
