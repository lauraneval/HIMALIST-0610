// lib/types.ts (atau di mana pun Anda ingin menempatkan tipe kustom)
import type { Tables } from '@/types/database2.types';

// Tipe dasar untuk Anime, Genre, dan Studio dari Supabase
export type Anime = Tables<'anime'>;
export type Genre = Tables<'genre'>;
export type Studio = Tables<'studio'>;

// Tipe gabungan untuk hasil query kita.
// Sebuah Anime dengan detail Studio (bisa null) dan array dari Genre.
export type AnimeWithDetails = Anime & {
    studio: Studio | null;
    genre: Genre[];
};