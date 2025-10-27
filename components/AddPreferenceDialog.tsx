"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Genre } from "@/lib/types";
import { handleAddPreferences } from "@/actions/auth";

type AddPreferenceDialogProps = {
    type: 'like' | 'dislike';
    allGenres: Genre[];
    excludeGenreIds: Set<number>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function AddPreferenceDialog({ type, allGenres, excludeGenreIds, open, onOpenChange, onSuccess }: AddPreferenceDialogProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isPending, startTransition] = useTransition();

    const availableGenres = allGenres.filter(
        (genre) => !excludeGenreIds.has(genre.id)
    );

    const handleCheckboxChange = (genreId: number, checked: boolean | 'indeterminate') => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked === true) {
                next.add(genreId);
            } else {
                next.delete(genreId);
            }
            return next;
        });
    };

    const handleAddSelected = () => {
        if (selectedIds.size === 0) {
            toast.info("Please select at least one genre");
            return;
        }

        startTransition(async () => {
            let successCount = 0;
            const promises = Array.from(selectedIds).map(genreId =>
                handleAddPreferences(genreId, type)
            );

            const results = await Promise.all(promises);

            results.forEach(result => {
                if (result.status === 'success') {
                    successCount++;
                } else if (result.status === 'error') {
                    toast.error(result.message);
                }
            });

            if (successCount > 0) {
                toast.success(`${successCount} genre(s) added successfully`);
                setSelectedIds(new Set());
                onSuccess();
                onOpenChange(false);
            } else if (results.every(r => r.status === 'info')) {
                toast.info("Selected genres were already in the list");
                onOpenChange(false);
            }
        });
    };

    useEffect(() => {
        setSelectedIds(new Set());
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-[#1e1e1e] border border-muted text-foreground">
                <DialogHeader>
                    <DialogTitle>Add {type === 'like' ? 'Liked' : 'Disliked'} Genres</DialogTitle>
                    <DialogDescription>
                        Select genres to add to your {type} list
                    </DialogDescription>
                </DialogHeader>
                {/* Scrollable list of checkboxes */}
                <ScrollArea className="max-h-[50vh] pr-4">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {availableGenres.length === 0 ? (
                            <p className="col-span-2 text-center text-muted-foreground">No more genres to add</p>
                        ) : (
                            availableGenres.map((genre) => (
                                <div key={genre.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`add-${type}-${genre.id}`}
                                        checked={selectedIds.has(genre.id)}
                                        onCheckedChange={(checked) => handleCheckboxChange(genre.id, checked)}
                                        disabled={isPending}
                                    />
                                    <Label htmlFor={`add-${type}-${genre.id}`} className="font-normal text-sm">
                                        {genre.name}
                                    </Label>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer border border-secondary hover:bg-muted-foreground hover:text-background hover:border-foreground"
                            disabled={isPending}
                            >
                                Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleAddSelected}
                        disabled={isPending || selectedIds.size === 0}
                        className="bg-secondary hover:bg-secondary-hover text-foreground" // Style Add button
                    >
                        {isPending ? "Adding..." : `Add Selected (${selectedIds.size})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}