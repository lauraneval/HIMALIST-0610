"use client";

import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AnimeWithDetails } from "@/lib/types";
import { handleDeleteAnime } from "@/actions/auth";

type DeleteAnimeProps = {
    anime: AnimeWithDetails;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function DeleteAnimeDialog({ anime, open, onOpenChange, onSuccess }: DeleteAnimeProps){
    const [isDeleting, setIsDeleting] = useState(false);

    const onDelete = async () => {
        setIsDeleting(true);
        const result = await handleDeleteAnime(anime.id);

        if (result.status === "error" || result.status === "warning") {
            toast.error(result.message);
        } else {
            toast.success(result.message);
            onSuccess();
        }
        setIsDeleting(false);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                    This action cannot be undone. This will permanently delete the
                    anime: <strong>{anime.name}</strong>
                </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            className="cursor-pointer border border-secondary hover:bg-muted-foreground hover:text-background hover:border-foreground"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        className="cursor-pointer text-foreground hover:bg-destructive-foreground"
                        onClick={onDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}