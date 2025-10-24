"use client";

import { Button } from "@/components/ui/button";
import { AnimeWithDetails } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DetailAnime() {
    const { slug } = useParams();
    const [animeList, setAnimeList] = useState<AnimeWithDetails | null>(null);

    useEffect(() => {
        if(slug){
            const fetchAnime = async () => {
                            const { data, error } = await createClient()
                                .from('anime')
                                .select('*, studio(*), genre(*)')
                                .eq('slug', slug)
                                .single();
                            if (error) console.error('Error fetching anime:', error);
                            else setAnimeList(data);
                        };
                        fetchAnime();
        }
    }, [slug]);
    return (
        <div className="container mx-auto py-8">
            <div className="flex gap-16"></div>
            {animeList && (
                <div className="flex gap-16 items-center w-full">
                    <div className="w-1/3">
                        <Image
                            src={animeList.image || '@/public/placeholder.svg'}
                            alt={animeList.name}
                            width={360}
                            height={360}
                            className="object-cover rounded-2xl w-[50vh] "
                        />
                    </div>
                    <div className="w-2/3">
                        <h1 className="text-5xl font-bold mb-4">{animeList.name}</h1>
                        <div className="mb-2">
                            {animeList.genre.map((g) => (
                                        <span key={g.id} className="text-sm me-2 rounded-full bg-gray-200 text-gray-800 px-3 py-1">
                                            {g.name || 'No Genre'}
                                        </span>
                                    ))}
                        </div>
                        <p className="text-xl mb-4">{animeList.studio?.name || 'Unknown'}</p>
                        <p className="text-3xs mb-4 text-neutral-500">{animeList.description}</p>
                        <div className="flex gap-4 items-center">
                        <Button className="text-lg py-6 font-bold" size="lg">Add to list</Button>
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
};