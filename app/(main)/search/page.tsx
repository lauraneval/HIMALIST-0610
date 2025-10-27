import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { AnimeWithDetails } from '@/lib/types';

type SearchPageProps = {
    searchParams: { [key: string]: string | string[] | undefined };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';

    let searchResults: AnimeWithDetails[] = [];
    let fetchError: string | null = null;

    if (query) {
        const supabase =  await createClient();
        const { data, error } = await supabase
            .from('anime')
            .select(`
                *,
                studio ( name ),
                genre ( id, name )
            `)
            .ilike('name', `%${query}%`)
            .order('name')
            .limit(20);

        if (error) {
            console.error("Search fetch error:", error);
            fetchError = "Sorry, couldn't fetch search results.";
        } else {
            searchResults = data || [];
        }
    }

    return (
        <div className="container mx-auto py-8 text-foreground">
            <h1 className="text-3xl font-bold mb-6">
                Search Results {query ? `for "${query}"` : ''}
            </h1>

            {!query && (
                <p className="text-muted">Please enter a search term in the navigation bar.</p>
            )}

            {fetchError && (
                <p className="text-destructive">{fetchError}</p>
            )}

            {query && !fetchError && (
                <>
                    {searchResults.length === 0 ? (
                        <p className="text-muted-foreground">No anime found matching your search.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {searchResults.map((anime) => (
                                <Link key={anime.id} href={`/anime/${anime.slug}`} className="group bg-[#2a2a2a] border border-neutral-700 rounded-lg overflow-hidden hover:border-secondary-hover transition-all duration-200 block">
                                    <div className="relative aspect-[2/3] w-full">
                                        <Image
                                            src={anime.image || '/placeholder.png'}
                                            alt={anime.name}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-lg truncate group-hover:text-secondary">{anime.name}</h3>
                                        <p className="text-sm text-muted-foreground truncate">{anime.studio?.name || 'Unknown Studio'}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {anime.genre.slice(0, 2).map(g => (
                                                <span key={g.id} className="text-xs bg-neutral-700 text-muted-foreground px-2 py-0.5 rounded-full">{g.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}