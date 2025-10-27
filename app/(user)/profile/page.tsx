"use client";

import { handleUpdateUsername } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { toast, Toaster } from "sonner";

type UserProfile = {
    id: string;
    email: string;
    username: string;
};

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const supabase = createClient();
        const fetchUserData = async () => {
            setIsLoading(true);
            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

            if (authError || !currentUser) {
                console.error("Error fetching user or not logged in:", authError);
                setUser(null);
                setProfile(null);
                setIsLoading(false);
                return;
            }
            setUser(currentUser);

            const { data: profileData, error: profileError } = await supabase
                .from('user')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (profileError) {
                console.error("Error fetching profile:", profileError);
                toast.error("Failed to load profile data.");
                setProfile(null);
                setUsername('');
            } else if (profileData) {
                setProfile(profileData as UserProfile);
                setUsername(profileData.username || '');
            }
            setIsLoading(false);
        };

        fetchUserData();
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (username === profile?.username) {
            toast.info("Username hasn't changed");
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append('username', username);

            const result = await handleUpdateUsername(formData);

            if (result.status === "error" || result.status === "warning") {
                toast.error(result.message);
            } else {
                toast.success(result.message);
                if (profile) {
                    setProfile({ ...profile, username: username });
                }
            }
        });
    };

    if (isLoading) {
        return <div className="container mx-auto py-8 text-center text-foreground">Loading profile...</div>;
    }

    if (!user || !profile) {
        return (
            <div className="container mx-auto py-8 text-center text-foreground">
                <p className="mb-4">You need to be logged in to view this page</p>
                <Link href="/login">
                    <Button>Login</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 text-foreground max-w-lg">
            <Toaster richColors theme="dark"/>
            <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 rounded-lg border border-muted">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        readOnly
                        disabled
                        className="bg-muted border-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                        minLength={3}
                        disabled={isPending}
                        className="bg-black border border-muted text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-secondary focus:border-secondary" // Styling input
                    />
                </div>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isPending || username === profile.username}
                        className="bg-secondary hover:bg-secondary-hover text-foreground"
                    >
                        {isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}