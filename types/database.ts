export interface IAnime {
    id: number;
    name: string;
    description: string | null;
    studio_id: number | null;
    image: string | null;
}

export interface IStudio {
    id: number;
    name: string;
}

export interface IGenre {
    id: number;
    name: string;
}

export interface IAnimeGenre {
    id: number;
    anime_id: number;
    genre_id: number;
}

/**
 * Merge Interface (for join queries)
 */
export interface IAnimeWithRelations {
    id: number;
    name: string;
    description: string | null;
    studio: IStudio;
    genres: IGenre[];
    image: string;
}
