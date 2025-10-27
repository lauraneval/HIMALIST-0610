"use client";

import { Button } from "@/components/ui/button";
import { AnimeWithDetails } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/sonner";
import { handleAddToHistory } from "@/actions/auth";
import clsx from "clsx";

export default function DetailAnime() {
    const { slug } = useParams();
    const [animeList, setAnimeList] = useState<AnimeWithDetails | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isInHistory, setIsInHistory] = useState(false);
    const [isCheckingHistory, setIsCheckingHistory] = useState(true);
    const [isLoadingAnime, setIsLoadingAnime] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const supabase = createClient();
        const fetchUser = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const supabase = createClient();
        const fetchAnime = async () => {
            if (!slug) {
                setAnimeList(null);
                setIsLoadingAnime(false);
                return;
            }

            setIsLoadingAnime(true);
            setAnimeList(null);

            const { data: animeData, error: animeError } = await supabase
                .from('anime')
                .select('*, studio(*), genre(*)')
                .eq('slug', slug as string)
                .single();

            if (animeError) {
                console.error('Error fetching anime:', animeError);
                toast.error("Failed to load anime details.");
                setAnimeList(null);
            } else {
                setAnimeList(animeData);
            }
            setIsLoadingAnime(false);
        };

        fetchAnime();
    }, [slug]);

    useEffect(() => {
        if (user && animeList) {
            setIsCheckingHistory(true);
            setIsInHistory(false);
            const supabase = createClient();

            supabase
                .from('history')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('anime_id', animeList.id)
                .then(({ count, error }) => {
                    if (!error && count !== null && count > 0) {
                        setIsInHistory(true);
                    } else if (error) {
                        console.error('Error checking history:', error);
                    }
                    setIsCheckingHistory(false);
                });
        } else {
            setIsInHistory(false);
            setIsCheckingHistory(false);
        }
    }, [user, animeList]);

    const addToHistory = () => {
        if (!user) {
            toast.error("Please login to add to history");
            return;
        }
        if (!animeList || isInHistory || isPending || isCheckingHistory) {
            return;
        }

        startTransition(async () => {
            const result = await handleAddToHistory(animeList.id);
            if (result.status === "error") {
                toast.error(result.message);
            } else {
                toast.success(result.message);
                setIsInHistory(true);
            }
        });
    };

    if (isLoadingAnime) {
        return <div className="container mx-auto py-8 text-center text-foreground">Loading anime details...</div>;
    }
    if (!animeList) {
        return <div className="container mx-auto py-8 text-center text-destructive">Anime not found or failed to load.</div>;
    }

    return (
        <div className="container mx-auto py-8 text-foreground">
            <Toaster richColors theme="dark" />
            <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start w-full">
                <div className="w-full md:w-1/3 flex-shrink-0">
                    <Image
                        src={animeList.image || '/placeholder.png'}
                        alt={animeList.name}
                        width={500}
                        height={750}
                        sizes="(max-width: 768px) 80vw, 33vw"
                        className="object-cover rounded-lg w-full h-auto shadow-lg"
                    />
                </div>
                <div className="w-full md:w-2/3">
                    <h1 className="text-3xl lg:text-5xl font-bold mb-4">{animeList.name}</h1>
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-4">
                        <p className="text-lg text-muted-foreground">{animeList.studio?.name || 'Unknown'}</p>
                        <div className="flex flex-wrap gap-2">
                            {animeList.genre.map((g) => (
                                <span key={g.id} className="text-xs me-1 rounded border border-secondary bg-transparent text-foreground px-2 py-0.5">
                                    {g.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <p className="mb-6 text-foreground/80 leading-relaxed">{animeList.description || "No description available."}</p>

                    <div className="flex gap-4 items-center">
                        <Button
                            variant="secondary"
                            size="lg"
                            className={clsx(
                                "text-lg py-6 font-bold cursor-pointer border transition-colors duration-200", // Class dasar
                                "disabled:opacity-70 disabled:cursor-not-allowed", // Class saat disabled
                                isInHistory
                                    ? "bg-secondary-watchlist border-secondary text-foreground hover:bg-secondary-hover" // Class jika SUDAH ada
                                    : "border-secondary hover:bg-muted-foreground hover:text-background hover:border-foreground" // Class jika BELUM ada
                            )}
                            onClick={addToHistory}
                            disabled={!user || isCheckingHistory || isPending || isInHistory}
                        >
                            { !user ? "Add to Watchlist"
                                : isCheckingHistory ? "Checking..."
                                : isPending ? "Adding..."
                                : isInHistory ? "✓ In Watchlist"
                                : "Add to Watched History"
                            }
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};