"use client";

import { Studio, Genre, AnimeWithDetails } from "@/lib/types";
import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { handleUpdateAnime } from "@/actions/auth";

type UpdateAnimeFormProps = {
    anime: AnimeWithDetails;
    studios: Studio[];
    genres: Genre[];
    onSuccess: () => void;
};

export default function UpdateAnimeForm({ anime, studios, genres, onSuccess }: UpdateAnimeFormProps){
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studioOpen, setStudioOpen] = useState(false);
    const [studioValue, setStudioValue] = useState(anime.studio?.id.toString() || ""); 
    const [selectedGenreIds, setSelectedGenreIds] = useState<Set<string>>(
        new Set(anime.genre.map(g => g.id.toString()))
    );

    const handleGenreChange = (genreId: string) => {
        setSelectedGenreIds(prev => {
            const next = new Set(prev);
            if (next.has(genreId)) {
                next.delete(genreId);
            } else {
                next.add(genreId);
            }
            return next;
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        formData.delete('genre_ids');
        selectedGenreIds.forEach(id => {
            formData.append('genre_ids', id);
        });

        const result = await handleUpdateAnime(formData);

        if (result.status === "error" || result.status === "warning") {
            toast.error(result.message);
        } else {
            toast.success(result.message);
            onSuccess();
        }
        setIsSubmitting(false);
    };

    return (
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                    <DialogTitle>Update Anime</DialogTitle>
                    <DialogDescription>
                        Edit the name for anime: {anime.name}
                    </DialogDescription>
                </DialogHeader>
                <input type="hidden" name="id" value={anime.id} />
                <div className="grid w-full gap-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="name">New name</Label>
                        <Input id="name" name="name" placeholder="Insert new anime name" required defaultValue={anime.name} disabled={isSubmitting} />
                    </div>
                    <div className="grid w-full gap-1.5">
                        <Label>Studio</Label>
                        <Popover open={studioOpen} onOpenChange={setStudioOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={studioOpen}
                                className="w-full justify-between"
                                disabled={isSubmitting}
                                >
                                {studioValue
                                    ? studios.find((s) => s.id.toString() === studioValue)?.name
                                    : "Select or type studio..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                <CommandInput placeholder="Search studio..."/>
                                <CommandList>
                                    <CommandEmpty>No studio found.</CommandEmpty>
                                    <CommandGroup>
                                    {studios.map((s) => (
                                        <CommandItem
                                        key={s.id}
                                        value={s.name}
                                        onSelect={(currentName) => {
                                            const selectedStudio = studios.find(studio => studio.name.toLowerCase() === currentName.toLowerCase());
                                            if (selectedStudio) {
                                                setStudioValue(selectedStudio.id.toString());
                                            }
                                            setStudioOpen(false);
                                        }}
                                        >
                                        <Check className={cn("mr-2 h-4 w-4", studioValue === s.id.toString() ? "opacity-100" : "opacity-0")}/>
                                        {s.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <input type="hidden" name="studio_id" value={studioValue} required />
                    </div>
                    <div className="grid w-full gap-1.5">
                        <Label>Genre</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto rounded-md border p-3">
                            {genres?.map((g) => (
                                <div key={g.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`update-genre-${g.id}`}
                                        name="genre_ids"
                                        value={g.id.toString()}
                                        disabled={isSubmitting}
                                        checked={selectedGenreIds.has(g.id.toString())}
                                        onCheckedChange={() => handleGenreChange(g.id.toString())}
                                    />
                                    <Label htmlFor={`update-genre-${g.id}`} className="font-normal text-sm">
                                        {g.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="image">Image URL</Label>
                        <Input id="image" name="image" placeholder="https://..." defaultValue={anime.image || ''} disabled={isSubmitting} />
                    </div>
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" placeholder="Insert new description" required defaultValue={anime.description || ''} className="resize-none h-32" disabled={isSubmitting}/>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer border border-secondary hover:bg-muted-foreground hover:text-background hover:border-foreground"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" variant="secondary" className="cursor-pointer hover:bg-secondary-hover" disabled={isSubmitting}>
                        {isSubmitting ? "Updating..." : "Update"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}