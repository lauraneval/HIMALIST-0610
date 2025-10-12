import { useEffect, useState } from "react";
import { IAnime } from "../types/anime";
import supabase from "@/lib/db";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function AnimeList() {
  const [animes, setAnime] = useState<IAnime[]>([]);

  useEffect(() => {
    const fetchAnime = async () => {
      const { data, error } = await supabase.from('anime').select('*');
      if (error) console.log('Error fetching anime:', error);
      else setAnime(data);
    };

    fetchAnime();
  }, []);

  console.log(animes);
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">List Anime</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {animes.map((anime: IAnime) => (
          <Card key={anime.id}>
            <CardContent>
              <Image
                src={anime.image}
                alt={anime.name}
                width={200}
                height={300}
                className="w-full object-cover rounded-lg"
              />
              <div className="mt-4 flex justify-between">
                <div>
                  <h4 className="font-semibold text-xl">{anime.name}</h4>
                  <p>{anime.genre}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="justify-between align-items-center flex w-full">
                <Button className="font-bold" size={"lg"}>See more</Button>
                <Button className="font-bold" size={"lg"}>Add to List</Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
