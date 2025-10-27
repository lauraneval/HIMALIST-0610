"use client";
import { signOut } from "@/actions/auth";
import React, { useState } from "react";

const Logout = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <div className="bg-muted hover:bg-muted-foreground text-white text-sm px-4 py-2 rounded-md cursor-pointer">
      <form onSubmit={handleLogout}>
        <button type="submit" disabled={loading}>
          {loading ? "Signing Out..." : "Sign Out"}
        </button>
      </form>
    </div>
  );
};

export default Logout;
