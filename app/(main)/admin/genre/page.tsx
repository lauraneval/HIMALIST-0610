"use client";

import DeleteGenreDialog from "@/components/DeleteGenreDialog";
import InsertGenreForm from "@/components/InsertGenreForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UpdateGenreForm from "@/components/UpdateGenreForm";
import { Genre } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

export default function GenreList(){
    const [genres, setGenre] = useState<Genre[]>([]);
    const [createDialog, setCreateDialog] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedGenre, setSelectedGenre] = useState<{
        genre: Genre;
        action: 'edit' | 'delete';
    } | null>(null);

    useEffect(() => {
        const fetchGenre = async () => {
            const { data: genreData, error: genreError } = await createClient().from('genre').select('*').order('name', { ascending: true });

            if (genreError) {
                console.error('Error fetching list genre', genreError);
                toast.error("Failed to retrieve genre data");
            }
            else setGenre(genreData || []);
        };
        fetchGenre();
    }, [refreshKey]);

    return (
        <div className="container mx-auto py-8">
            <Toaster richColors theme="dark" />
            <div className="mb-6 w-full flex justify-between items-center">
                <h1 className="text-3xl font-bold">Genre</h1>
                <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="font-bold bg-secondary hover:bg-secondary-hover text-foreground">Add Genre</Button>
                    </DialogTrigger>
                    <InsertGenreForm onSuccess={() => {
                        setCreateDialog(false);
                        setRefreshKey(key => key + 1);
                    }}/>
                </Dialog>
            </div>

            <div className="w-full border border-border rounded-lg shadow-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border">
                            <TableHead className="w-[100px] text-foreground">Id</TableHead>
                            <TableHead className="text-foreground">Name</TableHead>
                            <TableHead className="text-right text-foreground pr-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {genres.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                                    No genres found
                                </TableCell>
                            </TableRow>
                        ) : (
                            genres.map((genre: Genre) => (
                                <TableRow key={genre.id} className="border-b border-border">
                                    <TableCell className="font-medium">{genre.id}</TableCell>
                                    <TableCell>{genre.name}</TableCell>
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
                                                        onClick={() => setSelectedGenre({ genre, action: 'edit' })}
                                                        onSelect={(e) => e.preventDefault()}
                                                    >
                                                        Update
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive cursor-pointer hover:bg-destructive-foreground focus:bg-destructive-foreground focus:text-foreground"
                                                        onClick={() => setSelectedGenre({genre, action: 'delete'})}
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

            {selectedGenre && (
                <>
                    <Dialog
                        open={selectedGenre.action === 'edit'}
                        onOpenChange={(open) => { if (!open) setSelectedGenre(null); }}
                    >
                        <UpdateGenreForm
                            genre={selectedGenre.genre}
                            onSuccess={() => {
                                setSelectedGenre(null);
                                setRefreshKey(key => key + 1);
                            }}
                        />
                    </Dialog>

                    <DeleteGenreDialog
                        open={selectedGenre.action === 'delete'}
                        onOpenChange={(open) => { if (!open) setSelectedGenre(null); }}
                        onSuccess={() => {
                            setRefreshKey(key => key + 1);
                            setSelectedGenre(null);
                        }}
                        genre={selectedGenre.genre}
                    />
                </>
            )}
        </div>
    );
}