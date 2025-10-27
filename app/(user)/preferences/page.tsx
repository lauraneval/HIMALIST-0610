"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { PreferenceWithGenre, Genre } from "@/lib/types";
import AddPreferenceDialog from "@/components/AddPreferenceDialog";
import { X } from "lucide-react";
import { handleRemovePreferences } from "@/actions/auth";

export default function PreferencesPage() {
    const [user, setUser] = useState<User | null>(null);
    const [likedPreferences, setLikedPreferences] = useState<PreferenceWithGenre[]>([]);
    const [dislikedPreferences, setDislikedPreferences] = useState<PreferenceWithGenre[]>([]);
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [addLikedOpen, setAddLikedOpen] = useState(false);
    const [addDislikedOpen, setAddDislikedOpen] = useState(false);

    const [isRemoving, startRemoveTransition] = useTransition();
    const [removingId, setRemovingId] = useState<number | null>(null);


    useEffect(() => {
        const supabase = createClient();
        const fetchInitialData = async () => {
            setIsLoading(true);
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            const { data: genresData, error: genresError } = await supabase
                .from('genre')
                .select('*')
                .order('name');
            if (genresError) {
                toast.error("Failed to load genres");
            } else {
                setAllGenres(genresData || []);
            }

            if (currentUser) {
                const { data: preferenceData, error: preferenceError } = await supabase
                    .from('preference')
                    .select(`*, genre (*)`)
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (preferenceError) {
                    console.error("Error fetching preferences:", preferenceError);
                    toast.error("Failed to load preferences");
                    setLikedPreferences([]);
                    setDislikedPreferences([]);
                } else {
                    const validData = preferenceData?.filter((p): p is PreferenceWithGenre => p.genre !== null) || [];
                    setLikedPreferences(validData.filter(p => p.type === 'like'));
                    setDislikedPreferences(validData.filter(p => p.type === 'dislike'));
                }
            } else {
                setLikedPreferences([]);
                setDislikedPreferences([]);
            }
            setIsLoading(false);
        };
        fetchInitialData();
    }, []);

    const handleRemove = (preference: PreferenceWithGenre) => {
        setRemovingId(preference.id);
        startRemoveTransition(async () => {
            const result = await handleRemovePreferences(preference.id);
            if (result.status === 'error') {
                toast.error(result.message);
            } else {
                toast.success(result.message);
                if (preference.type === 'like') {
                    setLikedPreferences(prev => prev.filter(p => p.id !== preference.id));
                } else {
                    setDislikedPreferences(prev => prev.filter(p => p.id !== preference.id));
                }
            }
            setRemovingId(null);
        });
    };

    const existingPreferenceGenreIds = useMemo(() => {
        const likedIds = likedPreferences.map(p => p.genre_id);
        const dislikedIds = dislikedPreferences.map(p => p.genre_id);
        return new Set([...likedIds, ...dislikedIds]);
    }, [likedPreferences, dislikedPreferences]);

    const refreshPreferences = async () => {
        setIsLoading(true);
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            const { data, error } = await supabase.from('preference').select(`*, genre (*)`).eq('user_id', currentUser.id);
            if (!error) {
                const validData = data?.filter((p): p is PreferenceWithGenre => p.genre !== null) || [];
                setLikedPreferences(validData.filter(p => p.type === 'like'));
                setDislikedPreferences(validData.filter(p => p.type === 'dislike'));
            }
        }
        setIsLoading(false);
    }

    return (
        <div className="container mx-auto py-8 text-foreground max-w-3xl md:ml-8">
            <Toaster richColors theme="dark" />
            <h1 className="text-3xl font-bold mb-6 border-b border-muted pb-4 text-foreground">Genre Preference</h1>

            {isLoading ? (
                <p className="text-muted-foreground text-center">Loading preferences...</p>
            ) : !user ? (
                <p className="text-muted-foreground text-center">Please <Link href="/login" className="text-orange-500 hover:underline">login</Link> to set your preferences.</p>
            ) : (
                <div className="space-y-10">
                    <section>
                        <div className="flex justify-between items-center mb-4 border-b border-muted pb-2">
                            <h2 className="text-2xl font-semibold text-foreground">Liked</h2>
                            <Button
                                onClick={() => setAddLikedOpen(true)}
                                className="bg-secondary hover:bg-secondary-hover text-foreground text-sm px-4 py-1 h-auto"
                            >
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {likedPreferences.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No liked genres yet</p>
                            ) : (
                                likedPreferences.map((pref) => (
                                    <div key={pref.id} className="relative group bg-success text-foreground text-sm px-3 py-1 rounded-md flex items-center gap-1 border border-success">
                                        {pref.genre?.name}
                                        <button
                                            onClick={() => handleRemove(pref)}
                                            disabled={isRemoving && removingId === pref.id}
                                            className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
                                            aria-label={`Remove ${pref.genre?.name}`}
                                        >
                                            {isRemoving && removingId === pref.id ?
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-foreground"></div> :
                                                <X className="h-3 w-3 text-foreground"/>
                                            }
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section>
                        <div className="flex justify-between items-center mb-4 border-b border-muted pb-2">
                            <h2 className="text-2xl font-semibold text-foreground">Disliked</h2>
                            <Button
                                onClick={() => setAddDislikedOpen(true)}
                                className="bg-secondary hover:bg-secondary-hover text-foreground text-sm px-4 py-1 h-auto"
                            >
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {dislikedPreferences.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No disliked genres yet</p>
                            ) : (
                                dislikedPreferences.map((pref) => (
                                    <div key={pref.id} className="relative group bg-destructive-foreground text-foreground text-sm px-3 py-1 rounded-md flex items-center gap-1 border border-destructive-foreground">
                                        {pref.genre?.name}
                                        <button
                                            onClick={() => handleRemove(pref)}
                                            disabled={isRemoving && removingId === pref.id}
                                            className="absolute -top-1 -right-1 bg-neutral-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
                                            aria-label={`Remove ${pref.genre?.name}`}
                                        >
                                            {isRemoving && removingId === pref.id ?
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-foreground"></div> :
                                                <X className="h-3 w-3 text-foreground"/>
                                            }
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            )}

            <AddPreferenceDialog
                type="like"
                allGenres={allGenres}
                excludeGenreIds={existingPreferenceGenreIds}
                open={addLikedOpen}
                onOpenChange={setAddLikedOpen}
                onSuccess={refreshPreferences}
            />

            <AddPreferenceDialog
                type="dislike"
                allGenres={allGenres}
                excludeGenreIds={existingPreferenceGenreIds}
                open={addDislikedOpen}
                onOpenChange={setAddDislikedOpen}
                onSuccess={refreshPreferences}
            />
        </div>
    );
}