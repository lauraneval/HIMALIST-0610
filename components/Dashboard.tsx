"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import Image from "next/image";
import { AnimeWithDetails } from "@/lib/types";

export default function Dashboard() {
    // async function getAnimeDetails(id: number) {
    //     const { data, error } = await createClient()
    //         .from('anime')
    //         .select('*, studio(*), genre(*)')
    //         .eq('id', id)
    //         .single();

    //     if (error) {
    //         console.error('Error fetching anime details:', error.message);
    //         return null;
    //     }
    //     return data;
    // }

    const [animeList, setAnimeList] = useState<AnimeWithDetails[]>([]);
    // const [genres , setGenres] = useState<Genre[]>([]);
    // const [selectedGenre, setSelectedGenre] = useState<string>('all');

    useEffect(() => {
        // const fetchGenres = async () => {
        //     const { data, error } = await createClient().from('genre').select('*');
        //     if (data) setGenres(data);
        // }

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
                    </Card>
                ))}
            </div>
        </div>
    );
}
