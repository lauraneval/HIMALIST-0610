"use client";

import { Studio, Genre } from "@/lib/types";
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
import { handleAddAnime } from "@/actions/auth";

type InsertAnimeFormProps = {
    studios: Studio[];
    genres: Genre[];
    onSuccess: () => void;
};

export default function InsertAnimeForm({ studios, genres, onSuccess }: InsertAnimeFormProps){
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studioOpen, setStudioOpen] = useState(false);
    const [studioValue, setStudioValue] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const result = await handleAddAnime(formData);

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
                    <DialogTitle>Add Anime</DialogTitle>
                    <DialogDescription>
                        Insert new anime row
                    </DialogDescription>
                </DialogHeader>
                <div className="grid w-full gap-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" placeholder="Anime name" required disabled={isSubmitting} />
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
                                <CommandInput placeholder="Search studio..." onValueChange={(search) => {
                                    if (!studios.some(s => s.name.toLowerCase() === search.toLowerCase())) {
                                        setStudioValue("");
                                    }
                                }}/>
                                <CommandList>
                                    <CommandEmpty>No studio found</CommandEmpty>
                                    <CommandGroup>
                                    {studios.map((s) => (
                                        <CommandItem
                                        key={s.id}
                                        value={s.name}
                                        onSelect={(currentName) => {
                                            const selectedStudio = studios.find(
                                                (studio) => studio.name.toLowerCase() === currentName.toLowerCase()
                                            );
                                            if (selectedStudio) {
                                                const selectedId = selectedStudio.id.toString();
                                                setStudioValue(selectedId === studioValue ? "" : selectedId);
                                            }
                                            setStudioOpen(false);
                                        }}
                                        >
                                        <Check
                                            className={cn(
                                            "mr-2 h-4 w-4",
                                            studioValue === s.id.toString() ? "opacity-100" : "opacity-0"
                                            )}
                                        />
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
                                        id={`genre-${g.id}`}
                                        name="genre_ids"
                                        value={g.id.toString()}
                                        disabled={isSubmitting}
                                    />
                                    <Label htmlFor={`genre-${g.id}`} className="font-normal text-sm">
                                        {g.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="image">Image URL</Label>
                        <Input id="image" name="image" placeholder="https://..." disabled={isSubmitting} />
                    </div>

                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" placeholder="Synopsis..." required className="resize-none h-32" disabled={isSubmitting}/>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isSubmitting}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Adding Anime..." : "Add Anime"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}