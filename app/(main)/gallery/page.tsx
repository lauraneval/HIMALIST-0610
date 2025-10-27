"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import { AnimeWithDetails, Genre, Studio } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListFilter } from "lucide-react";

export default function GalleryPage() {
    const [allAnime, setAllAnime] = useState<AnimeWithDetails[]>([]);
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [allStudios, setAllStudios] = useState<Studio[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGenreIds, setSelectedGenreIds] = useState<Set<number>>(new Set());
    const [selectedStudioId, setSelectedStudioId] = useState<string>("all");

    useEffect(() => {
        const supabase = createClient();
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [animeRes, genreRes, studioRes] = await Promise.all([
                    supabase.from('anime').select('*, studio(*), genre(*)').order('name'),
                    supabase.from('genre').select('*').order('name'),
                    supabase.from('studio').select('*').order('name')
                ]);

                if (animeRes.error) throw animeRes.error;
                setAllAnime(animeRes.data || []);

                if (genreRes.error) throw genreRes.error;
                setAllGenres(genreRes.data || []);

                if (studioRes.error) throw studioRes.error;
                setAllStudios(studioRes.data || []);

            } catch (error: unknown) {
                console.error("Error fetching gallery data:", error);
                if (error instanceof Error) {
                    toast.error(`Failed to load data: ${error.message}`);
                } else {
                    toast.error("Failed to load data due to an unknown error");
                }
                setAllAnime([]);
                setAllGenres([]);
                setAllStudios([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const filteredAnime = useMemo(() => {
        let result = allAnime;

        const trimmedQuery = searchQuery.trim().toLowerCase();
        if (trimmedQuery) {
            result = result.filter(anime =>
                anime.name.toLowerCase().includes(trimmedQuery)
            );
        }

        if (selectedGenreIds.size > 0) {
            result = result.filter(anime =>
                anime.genre.some(g => selectedGenreIds.has(g.id))
            );
        }

        if (selectedStudioId !== "all") {
            const studioIdNum = parseInt(selectedStudioId, 10);
            if (!isNaN(studioIdNum)) {
                result = result.filter(anime =>
                    anime.studio?.id === studioIdNum
                );
            }
        }

        return result;
    }, [allAnime, searchQuery, selectedGenreIds, selectedStudioId]);

    const handleGenreChange = (genreId: number, checked: boolean) => {
        setSelectedGenreIds(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(genreId);
            } else {
                next.delete(genreId);
            }
            return next;
        });
    };

    return (
        <div className="container mx-auto py-8 text-muted-foreground">
            <Toaster richColors theme="dark" />
            <h1 className="text-3xl font-bold mb-6 text-foreground">Anime Gallery</h1>

            <div className="mb-8 p-4 bg-[#2a2a2a] border border-muted rounded-lg flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:flex-1">
                    <Label htmlFor="search-anime" className="sr-only">Search Anime</Label>
                    <Input
                        id="search-anime"
                        type="search"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#1e1e1e] border border-muted text-foreground placeholder-muted focus:ring-1 focus:ring-secondary focus:border-secondary h-10 px-4"
                    />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto border-muted bg-[#1e1e1e] hover:bg-muted text-foreground h-10">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Genre ({selectedGenreIds.size > 0 ? selectedGenreIds.size : 'All'})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-[#2a2a2a] border-muted text-foreground max-h-80 overflow-y-auto">
                        <DropdownMenuLabel>Filter by Genre</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-muted" />
                        {allGenres.map((genre) => (
                            <DropdownMenuCheckboxItem
                                key={genre.id}
                                checked={selectedGenreIds.has(genre.id)}
                                onCheckedChange={(checked) => handleGenreChange(genre.id, !!checked)}
                                className="cursor-pointer focus:bg-muted"
                            >
                                {genre.name}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Select value={selectedStudioId} onValueChange={setSelectedStudioId}>
                    <SelectTrigger className="w-full sm:w-[180px] border-muted bg-[#1e1e1e] hover:bg-muted text-foreground h-10">
                        <SelectValue placeholder="Studio (All)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-muted text-foreground max-h-80 overflow-y-auto">
                        <SelectItem value="all" className="cursor-pointer focus:bg-muted">Studio (All)</SelectItem>
                        {allStudios.map((studio) => (
                            <SelectItem key={studio.id} value={studio.id.toString()} className="cursor-pointer focus:bg-muted">
                                {studio.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <p className="text-muted-foreground text-center py-10">Loading anime...</p>
            ) : filteredAnime.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">
                    No anime found matching your criteria.
                </p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredAnime.map((anime) => (
                        <Link
                            key={anime.id}
                            href={`/anime/${anime.slug || anime.id}`}
                            className="group rounded-md overflow-hidden relative block aspect-[2/3] border border-transparent hover:border-secondary transition-colors duration-200 shadow-md bg-[#2a2a2a]" // Tambah bg
                        >
                            <Image
                                src={anime.image || '/placeholder.png'}
                                alt={anime.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16.6vw" // Sesuaikan sizes
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2 md:p-3">
                                <h4 className="text-foreground text-xs sm:text-sm font-medium truncate group-hover:text-secondary">
                                    {anime.name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{anime.studio?.name || 'Unknown'}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}