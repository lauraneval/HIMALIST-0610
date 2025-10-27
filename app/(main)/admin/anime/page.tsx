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
import { Ellipsis } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

export default function StudioList(){
    const [animes, setAnime] = useState<AnimeWithDetails[]>([]);
    const [studios, setStudio] = useState<Studio[]>([]);
    const [genres, setGenre] = useState<Genre[]>([]);
    const [createDialog, setCreateDialog] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedAnime, setSelectedAnime] = useState<{
        anime: AnimeWithDetails;
        action: 'edit' | 'delete';
    } | null>(null);

    useEffect(() => {
        const fetchStudio = async () => {
            const { data: animeData, error: animeError } = await createClient().from('anime').select('*, studio(*), genre(*)').order('name');
            const { data: studioData, error: studioError } = await createClient().from('studio').select('*').order('name');
            const { data: genreData, error: genreError } = await createClient().from('genre').select('*').order('name');

            if (animeError) {
                console.error('Error fetching list anime', animeError);
                toast.error("Failed to retrieve anime data");
            } else setAnime(animeData || []);

            if (studioError) {
                console.error('Error fetching list studio', studioError);
                toast.error("Failed to retrieve studio data");
            } else setStudio(studioData || []);

            if (genreError) {
                console.error('Error fetching list genre', genreError);
                toast.error("Failed to retrieve genre data");
            } else setGenre(genreData || []);
        };
        fetchStudio();
    }, [refreshKey]);

    return (
        <div className="container mx-auto py-8">
            <Toaster richColors theme="dark" />
            <div className="mb-6 w-full flex justify-between items-center">
                <h1 className="text-3xl font-bold">Anime</h1>
                <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="font-bold bg-secondary hover:bg-secondary-hover text-foreground">Add Anime</Button>
                    </DialogTrigger>
                    <InsertAnimeForm
                        studios={studios}
                        genres={genres}
                        onSuccess={() => {
                            setCreateDialog(false);
                            setRefreshKey(key => key + 1);
                    }}/>
                </Dialog>
            </div>

            <div className="w-full border border-border rounded-lg shadow-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border">
                            <TableHead className="text-foreground">Anime</TableHead>
                            <TableHead className="text-foreground">Studio</TableHead>
                            <TableHead className="text-foreground">Genre</TableHead>
                            <TableHead className="text-foreground">Description</TableHead>
                            <TableHead className="text-right text-foreground pr-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    No animes found
                                </TableCell>
                            </TableRow>
                        ) : (
                            animes.map((anime: AnimeWithDetails) => (
                                <TableRow key={anime.id} className="border-b border-border">
                                    <TableCell className="flex items-center gap-3 w-full font-medium">
                                        <Image width={40} height={60} src={anime.image || '/placeholder.png'} alt={anime.name} className="object-cover rounded"/>
                                        {anime.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{anime.studio?.name || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {anime.genre.slice(0, 3).map((g) => ( // Batasi jumlah genre
                                                <span key={g.id} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                                    {g.name}
                                                </span>
                                            ))}
                                            {anime.genre.length > 3 && (
                                                <span className="text-xs text-muted-foreground">...</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                        {anime.description || 'No description'}
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild className="cursor-pointer text-muted-foreground hover:text-foreground">
                                                <Button variant="ghost" size="icon">
                                                    <Ellipsis className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-40 border-border text-foreground" align="end">
                                                <DropdownMenuLabel className="font-semibold text-muted-foreground">Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-muted"/>
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer hover:bg-muted focus:bg-muted focus:text-foreground"
                                                        onClick={() => setSelectedAnime({ anime, action: 'edit' })}
                                                        onSelect={(e) => e.preventDefault()}
                                                    >
                                                        Update
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive cursor-pointer hover:bg-destructive-foreground focus:bg-destructive-foreground focus:text-foreground"
                                                        onClick={() => setSelectedAnime({anime, action: 'delete'})}
                                                        onSelect={(e) => e.preventDefault()}
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

            {selectedAnime && (
                <>
                    <Dialog
                        open={selectedAnime.action === 'edit'}
                        onOpenChange={(open) => { if (!open) setSelectedAnime(null); }}
                    >
                        <UpdateAnimeForm
                            anime={selectedAnime.anime}
                            studios={studios}
                            genres={genres}
                            onSuccess={() => {
                                setSelectedAnime(null);
                                setRefreshKey(key => key + 1);
                            }}
                        />
                    </Dialog>

                    <DeleteAnimeDialog
                        open={selectedAnime.action === 'delete'}
                        onOpenChange={(open) => { if (!open) setSelectedAnime(null); }}
                        onSuccess={() => {
                            setRefreshKey(key => key + 1);
                            setSelectedAnime(null);
                        }}
                        anime={selectedAnime.anime}
                    />
                </>
            )}
        </div>
    );
}