"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "./ui/card";
import Image from "next/image";
import { AnimeWithDetails } from "@/lib/types";
import { Button } from "./ui/button";
import Link from "next/link";

const HeroSection = () => (
    <div className="relative w-full h-[60vh] md:h-[70vh] rounded-lg overflow-hidden mb-12 shadow-2xl">
        <div
            className="absolute inset-0 bg-secondary bg-cover bg-center bg-no-repeat animate-bg-pan"
            style={{ backgroundImage: "url('/hero.png')" }}
        >
            <div className="absolute inset-0 bg-black/30"></div>
        </div>

        <div className="absolute top-1/2 right-4 md:right-8 transform -translate-y-1/2 rotate-180 origin-center animate-slide-in-right">
            <h1
                className="text-4xl md:text-6xl font-black text-foreground opacity-80"
                style={{ writingMode: 'vertical-rl' }}
            >
                HIMALIST
            </h1>
        </div>

        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-10 lg:p-16">
            <div className="max-w-xl text-foreground animate-fade-in-up">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                    Search Anime <br /> with your own taste!
                </h1>
                <p className="text-lg md:text-xl text-orange-100 mb-8 max-w-md">
                    Designed to Help You Search any anime with your own preferences.
                </p>
                <Link href="/gallery">
                    <Button
                        size="lg"
                        className="bg-foreground text-secondary-hover font-bold text-lg px-8 py-3 rounded-full hover:bg-orange-100 transition duration-300 animate-scale-pulse"
                    >
                        Start Exploring!
                    </Button>
                </Link>
            </div>
        </div>

        <style jsx global>{`
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideInRight {
                from { opacity: 0; transform: translateY(-50%) translateX(50px); }
                to { opacity: 1; transform: translateY(-50%) translateX(0); }
            }
            @keyframes scalePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            @keyframes bgPan {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            .animate-fade-in-up {
                animation: fadeInUp 1s ease-out forwards;
                opacity: 0;
            }
            .animate-slide-in-right {
                animation: slideInRight 1.2s ease-out forwards;
                opacity: 0;
            }
            .animate-scale-pulse {
                animation: scalePulse 2s infinite ease-in-out;
            }
            .animate-bg-pan {
                animation: bgPan 15s linear infinite alternate;
            }
        `}</style>
    </div>
);

export default function Dashboard() {
    const [animeList, setAnimeList] = useState<AnimeWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const fetchAnime = async () => {
            const { data, error } = await createClient()
                .from('anime')
                .select('*, studio(*), genre(*)')
                .order('created_at', { ascending: false }) 
                .limit(12);

            if (error) {
                console.error('Error fetching anime:', error);
            } else {
                setAnimeList(data || []);
            }
            setIsLoading(false);
        };

        fetchAnime();
    }, []);

    return (
        <div className="container mx-auto text-foreground">
            <HeroSection />

            <h2 className="text-3xl font-bold mb-8 text-center text-foreground">Recently Added Anime</h2>

            {isLoading && <p className="text-center text-muted-foreground">Loading anime...</p>}

            {!isLoading && animeList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {animeList.map((anime) => (
                        <Card
                            key={anime.id}
                            className="flex flex-col justify-between bg-[#2a2a2a] border border-muted rounded-lg text-foreground hover:scale-[1.03] transition-transform duration-300 shadow-lg overflow-hidden"
                        >
                            <CardContent className="p-0 flex flex-col flex-grow">
                                <Link href={`/anime/${anime.slug || anime.id}`} className="block relative w-full aspect-[2/3]"> {/* Aspect ratio */}
                                    <Image
                                        src={anime.image || '/placeholder.png'}
                                        alt={anime.name}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                        className="object-cover"
                                    />
                                </Link>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h4 className="font-semibold text-md mb-1 break-words line-clamp-2 leading-tight">
                                        {anime.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {anime.studio?.name || 'Unknown Studio'}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                        {anime.genre.length > 0 ? (
                                            anime.genre.slice(0, 3).map((g) => (
                                                <span
                                                    key={g.id}
                                                    className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full"
                                                >
                                                    {g.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No Genre</span>
                                        )}
                                        {anime.genre.length > 3 && (
                                            <span className="text-xs text-muted-foreground">...</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 border-t border-muted">
                                <Link href={`/anime/${anime.slug || anime.id}`} className="w-full">
                                    <Button variant="outline" className="w-full font-semibold text-xs py-1.5 h-auto border-neutral-600 hover:bg-neutral-700">
                                        View Details
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
            {!isLoading && animeList.length === 0 && (
                <p className="text-center text-muted-foreground">No anime found</p>
            )}
        </div>
    );
}