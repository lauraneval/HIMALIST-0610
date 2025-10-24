"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "./ui/card";
import Image from "next/image";
import { AnimeWithDetails } from "@/lib/types";
import { Button } from "./ui/button";
import Link from "next/link";

export default function Dashboard() {
    const [animeList, setAnimeList] = useState<AnimeWithDetails[]>([]);

    useEffect(() => {
        const fetchAnime = async () => {
            const { data, error } = await createClient().from('anime').select('*, studio(*), genre(*)');
            if (error) console.error('Error fetching anime:', error);
            else setAnimeList(data || []);
        };

        fetchAnime();
    }, []);

    console.log(animeList);
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-4 text-center">Anime List</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {animeList.map((animeList: AnimeWithDetails) => (
                    <Card key={animeList.id}>
                        <CardContent>
                            <Image
                                src={animeList.image || '@/public/placeholder.svg'}
                                alt={animeList.name}
                                width={200}
                                height={300}
                                className="w-full object-cover rounded-lg mt-6"
                            />
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h4 className="font-semibold text-xl">{animeList.name}</h4>
                                    <p>{animeList.studio?.name || 'Unknown'}</p>
                                    {animeList.genre.map((g) => (
                                        <span key={g.id} className="text-xs px-2 py-1 rounded-full">
                                            {g.name || 'No Genre'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/anime/${animeList.slug}`} className="w-full">
                                <Button className="w-full font-bold" size="lg">
                                    Detail Anime
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
