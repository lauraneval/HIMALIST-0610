"use client";

import DeleteAnimeDialog from "@/components/DeleteAnimeDialog";
import InsertAnimeForm from "@/components/InsertAnimeForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UpdateAnimeForm from "@/components/UpdateAnimeForm";
import { AnimeWithDetails, Genre, Studio } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { Ellipsis, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Input } from "@/components/ui/input";

export default function AnimeList() {
    const [animes, setAnime] = useState<AnimeWithDetails[]>([]);
    const [studios, setStudio] = useState<Studio[]>([]);
    const [genres, setGenre] = useState<Genre[]>([]);
    const [createDialog, setCreateDialog] = useState(false);
    const [selectedAnime, setSelectedAnime] = useState<{
        anime: AnimeWithDetails;
        action: "edit" | "delete";
    } | null>(null);

    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const supabase = createClient();

    const fetchAnime = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
            .from("anime")
            .select("*, studio(*), genre(*)", { count: "exact" })
            .order("name")
            .range((page - 1) * limit, page * limit - 1);

            if (search.trim() !== "") {
            query = query.ilike("name", `%${search}%`);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            setAnime(data || []);
            setTotal(count || 0);
        } catch (err: unknown) {
            if (err instanceof Error) console.error("Error fetching anime:", err.message);
            else console.error("Unknown error:", err);
            toast.error("Failed to retrieve anime data");
        } finally {
            setLoading(false);
        }
    }, [page, search, limit, supabase]);

    const fetchSupportingData = useCallback(async () => {
    try {
        const [{ data: studioData }, { data: genreData }] = await Promise.all([
        supabase.from("studio").select("*").order("name"),
        supabase.from("genre").select("*").order("name"),
        ]);
        setStudio(studioData || []);
        setGenre(genreData || []);
    } catch (err) {
        console.error("Error fetching studios/genres:", err);
    }
    }, [supabase]);

    useEffect(() => {
        fetchSupportingData();
    }, [fetchSupportingData]);

    useEffect(() => {
        fetchAnime();
    }, [fetchAnime]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="container mx-auto py-8">
        <Toaster richColors theme="dark" />
        <div className="mb-6 w-full flex justify-between items-center">
            <h1 className="text-3xl font-bold">Anime</h1>

            <div className="relative w-full sm:w-[400px] lg:w-[500px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search anime..."
                    className="w-full bg-background border border-muted rounded-md h-10 pl-10 pr-4 placeholder-muted focus:ring-1 focus:ring-secondary focus:border-secondary"
                    value={search}
                    onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                    }}
                />
            </div>

            <Dialog open={createDialog} onOpenChange={setCreateDialog}>
            <DialogTrigger asChild>
                <Button className="font-bold bg-secondary hover:bg-secondary-hover text-foreground">
                Add Anime
                </Button>
            </DialogTrigger>
            <InsertAnimeForm
                studios={studios}
                genres={genres}
                onSuccess={() => {
                setCreateDialog(false);
                fetchAnime();
                }}
            />
            </Dialog>
        </div>

        <div className="w-full border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <Table>
                <TableHeader>
                <TableRow className="border-b border-border sticky top-0 bg-background z-10">
                    <TableHead className="text-foreground">Anime</TableHead>
                    <TableHead className="text-foreground">Studio</TableHead>
                    <TableHead className="text-foreground">Genre</TableHead>
                    <TableHead className="text-foreground">Description</TableHead>
                    <TableHead className="text-right text-foreground pr-6"></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                        <Loader2 className="animate-spin inline-block mr-2" />
                        Loading anime...
                    </TableCell>
                    </TableRow>
                ) : animes.length === 0 ? (
                    <TableRow>
                    <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-10"
                    >
                        No animes found
                    </TableCell>
                    </TableRow>
                ) : (
                    animes.map((anime) => (
                    <TableRow
                        key={anime.id}
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                        <TableCell className="flex items-center gap-3 w-full font-medium">
                        <Image
                            width={40}
                            height={60}
                            src={anime.image || "/placeholder.png"}
                            alt={anime.name}
                            className="object-cover rounded"
                        />
                        {anime.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                        {anime.studio?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {anime.genre.slice(0, 3).map((g) => (
                            <span
                                key={g.id}
                                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                            >
                                {g.name}
                            </span>
                            ))}
                            {anime.genre.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                                ...
                            </span>
                            )}
                        </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {anime.description || "No description"}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Ellipsis className="h-5 w-5" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                            className="w-40 border-border text-foreground"
                            align="end"
                            >
                            <DropdownMenuLabel className="font-semibold text-muted-foreground">
                                Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                onClick={() =>
                                    setSelectedAnime({ anime, action: "edit" })
                                }
                                >
                                Update
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                    setSelectedAnime({ anime, action: "delete" })
                                }
                                >
                                Delete
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            </div>
        </div>

        <div className="flex justify-center items-center gap-3 mt-4">
            <Button
            variant="outline"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            >
            Prev
            </Button>
            <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
            </span>
            <Button
            variant="outline"
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            >
            Next
            </Button>
        </div>

        {selectedAnime && (
            <>
            <Dialog
                open={selectedAnime.action === "edit"}
                onOpenChange={(open) => {
                if (!open) setSelectedAnime(null);
                }}
            >
                <UpdateAnimeForm
                anime={selectedAnime.anime}
                studios={studios}
                genres={genres}
                onSuccess={() => {
                    setSelectedAnime(null);
                    fetchAnime();
                }}
                />
            </Dialog>

            <DeleteAnimeDialog
                open={selectedAnime.action === "delete"}
                onOpenChange={(open) => {
                if (!open) setSelectedAnime(null);
                }}
                onSuccess={() => {
                fetchAnime();
                setSelectedAnime(null);
                }}
                anime={selectedAnime.anime}
            />
            </>
        )}
        </div>
    );
}
