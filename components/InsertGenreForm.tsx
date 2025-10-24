"use client";

import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { handleAddGenre } from "@/actions/auth";

type InsertGenreFormProps = {
    onSuccess: () => void;
};

export default function InsertGenreForm({ onSuccess }: InsertGenreFormProps){
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const result = await handleAddGenre(formData);

        if (result.status === "error") {
            toast.error(result.message);
        } else {
            toast.success(result.message);
            onSuccess();
        }

        setIsSubmitting(false);
    };
    return (
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                    <DialogTitle>Add Genre</DialogTitle>
                    <DialogDescription>
                        Insert new genre row
                    </DialogDescription>
                </DialogHeader>
                <div className="grid w-full gap-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" placeholder="Type genre name" required disabled={isSubmitting}/>
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
                    {isSubmitting ? "Adding..." : "Add"}
                </Button>
            </DialogFooter>
            </form>
        </DialogContent>
    )
}