"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "./ui/button";

type SimpleAnime = {
    id: number;
    name: string;
    slug: string;
};

type SearchBarProps = {
    allAnime: SimpleAnime[];
};

export default function SearchBar({ allAnime }: SearchBarProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredAnime = inputValue
        ? allAnime.filter((anime) =>
            anime.name.toLowerCase().includes(inputValue.toLowerCase())
        )
        : [];

    const handleSelect = (slug: string) => {
        router.push(`/anime/${slug}`);
        setOpen(false);
        setInputValue("");
        inputRef.current?.blur();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full max-w-sm justify-start bg-[#2a2a2a] border border-neutral-700 rounded-full h-10 text-muted-foreground hover:text-foreground hover:bg-[#3a3a3a]" // Styling trigger
                    onClick={() => setOpen(true)}
                >
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    {inputValue || "Search anime..."}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        ref={inputRef}
                        placeholder="Search anime..."
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>

                        {inputValue && filteredAnime.length === 0 && (
                            <CommandEmpty>No anime found.</CommandEmpty>
                        )}
                        {inputValue && filteredAnime.length > 0 && (
                            <CommandGroup>
                                {filteredAnime.slice(0, 10).map((anime) => (
                                    <CommandItem
                                        key={anime.id}
                                        value={anime.name}
                                        onSelect={() => handleSelect(anime.slug)}
                                        className="cursor-pointer"
                                    >
                                        {anime.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        {inputValue && (
                            <CommandItem
                                key="view-all"
                                onSelect={() => {
                                    router.push(`/search?q=${encodeURIComponent(inputValue)}`);
                                    setOpen(false);
                                }}
                                className="cursor-pointer text-sm text-secondary justify-center"
                            >
                                View all results for {inputValue}
                            </CommandItem>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}