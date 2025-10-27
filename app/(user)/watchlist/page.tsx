"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import { WatchlistItemWithDetails } from "@/lib/types";
import { handleRemoveFromHistory } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function WatchlistPage() {
    const [user, setUser] = useState<User | null>(null);
    const [watchlist, setWatchlist] = useState<WatchlistItemWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [isRemoveMode, setIsRemoveMode] = useState(false)
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();

        const fetchInitialData = async () => {
            setIsLoading(true);
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (currentUser) {
                const { data: historyData, error: historyError } = await supabase
                    .from('history')
                    .select(`
                        *,
                        anime(
                            *,
                            studio ( name ),
                            genre ( id, name )
                        )
                    `)
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (historyError) {
                    console.error("Error fetching watchlist:", historyError);
                    toast.error("Failed to load watchlist");
                    setWatchlist([]);
                } else {
                    const validData = historyData?.filter(
                        (item): item is WatchlistItemWithDetails => item.anime !== null
                    ) || [];
                    setWatchlist(validData);
                }
            } else {
                setWatchlist([]);
            }
            setIsLoading(false);
        };

        fetchInitialData();
    }, []);

    const filteredWatchlist = useMemo(() => {
        if (!searchQuery) return watchlist;
        return watchlist.filter(item =>
            item.anime?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [watchlist, searchQuery]);

    const handleRemove = (historyId: number) => {
        setPendingDeleteId(historyId);
        startTransition(async () => {
            const result = await handleRemoveFromHistory(historyId);
            if (result.status === "error") {
                toast.error(result.message)
            } else {
                toast.success(result.message)
                setWatchlist(prev => prev.filter(item => item.id !== historyId))
            }
            setPendingDeleteId(null)
        })
    }

    const handleCardClick = (item: WatchlistItemWithDetails) => {
        if (!item.anime) return;

        if (isRemoveMode) {
            handleRemove(item.id);
        } else {
            router.push(`/anime/${item.anime.slug || item.anime.id}`)
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-8 py-8 px-4 md:px-8 text-foreground min-h-screen bg-[#1e1e1e]">
            <Toaster richColors theme="dark" />
            <main className="w-full">
                <h1 className="text-3xl font-bold mb-4">My Watched List</h1>
                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Input
                        type="search"
                        placeholder="Search your watchlist..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full max-w-sm border border-muted rounded-md h-10 px-4 text-foreground placeholder-muted focus:ring-1 focus:ring-secondary focus:border-secondary"
                    />
                    {user && watchlist.length > 0 && (
                        <Button
                            variant={isRemoveMode ? "destructive" : "secondary"}
                            className="hover:bg-secondary-hover text-foreground"
                            onClick={() => setIsRemoveMode(!isRemoveMode)}
                        >
                            {isRemoveMode ? (
                                <>
                                    <X className="mr-2 h-4 w-4"/> Cancel Remove
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4"/> Remove Items
                                </>
                            )
                        }
                        </Button>
                    )}
                </div>

                {isRemoveMode && (
                    <p className="mb-4 text-secondary text-sm">Remove mode active: Click an item to remove it</p>
                )}

                {isLoading ? (
                    <p className="text-muted-foreground">Loading watchlist...</p>
                ) : !user ? (
                    <p className="text-muted-foreground">Please <Link href="/login" className="text-secondary hover:underline">login</Link> to view your watchlist.</p>
                ) : filteredWatchlist.length === 0 ? (
                    <p className="text-muted-foreground">
                        {searchQuery ? 'No matching anime found in your watchlist' : 'Your watchlist is empty.'}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredWatchlist.map((item) => (
                            item.anime && (
                                <div
                                    key={item.id}
                                    onClick={() => handleCardClick(item)}
                                    className={clsx(
                                        "group rounded-md overflow-hidden relative block aspect-[2/3] border transition-colors duration-200 shadow-md cursor-pointer",
                                        isRemoveMode
                                            ? "border-transparent hover:border-destructive"
                                            : "border-neutral-800 hover:border-secondary"
                                    )}
                                >
                                    <Image
                                            src={item.anime.image || '/placeholder.png'}
                                            alt={item.anime.name}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                            className="object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2 md:p-3 pointer-events-none">
                                        <h4 className={clsx(
                                            "text-foreground text-xs sm:text-sm font-medium truncate",
                                            !isRemoveMode && "group-hover:text-secondary-hover"
                                        )}>
                                            {item.anime.name}
                                        </h4>
                                    </div>

                                    <div className={clsx(
                                            "absolute inset-0 bg-red-600/60 flex items-center justify-center transition-opacity duration-300 rounded-md pointer-events-none",
                                            isRemoveMode ? "opacity-0 group-hover:opacity-100" : "opacity-0"
                                        )}
                                    >
                                        {isPending && pendingDeleteId === item.id ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                                        ) : (
                                            <Trash2 className="h-10 w-10 text-foreground" />
                                        )}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}