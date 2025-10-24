"use client";

import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FormEvent, useState } from "react";
import { handleAddStudio } from "@/actions/auth";
import { toast } from "sonner";

type InsertStudioFormProps = {
    onSuccess: () => void;
};

export default function InsertStudioForm({ onSuccess }: InsertStudioFormProps){
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const result = await handleAddStudio(formData);

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
                    <DialogTitle>Add Studio</DialogTitle>
                    <DialogDescription>
                        Insert new studio row
                    </DialogDescription>
                </DialogHeader>
                <div className="grid w-full gap-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" placeholder="Type studio name" required disabled={isSubmitting}/>
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