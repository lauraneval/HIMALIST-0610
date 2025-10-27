
import type { Tables } from '@/types/database3';

export type Anime = Tables<'anime'>;
export type Genre = Tables<'genre'>;
export type Studio = Tables<'studio'>;
export type History = Tables<'history'>;
export type Preference = Tables<'preference'>;

export type AnimeWithDetails = Anime & {
    studio: Studio | null;
    genre: Genre[];
};

export type StudioGenre = {
    studio: Studio[];
    genre: Genre[];
};

export type WatchlistItemWithDetails = History & {
    anime: AnimeWithDetails | null;
};

export type PreferenceWithGenre = Preference & {
    genre: Genre | null;
};