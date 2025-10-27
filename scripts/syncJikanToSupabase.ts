import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";
import dotenv from "dotenv";
import cliProgress from "cli-progress";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeFetch(url: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
        } catch (err) {
        console.warn(`⚠️ Fetch error on ${url}, retry ${i + 1}/${retries}:`, err);
        await delay(3000);
        }
    }
    throw new Error(`❌ Failed to fetch ${url} after ${retries} retries`);
}

async function syncAnimeFromJikan() {
    let page = 1;
    let hasNextPage = true;
    let totalInserted = 0;
    const progressBar = new cliProgress.SingleBar(
        {
        format: "📦 Page {page} | Progress [{bar}] {percentage}% | {value}/{total} anime synced",
        hideCursor: true,
        },
        cliProgress.Presets.shades_classic
    );

    while (hasNextPage) {
        console.log(`\n📥 [PAGE ${page}] Fetching anime list...`);
        const { data, pagination } = await safeFetch(
        `https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`
        );

        if (!data || data.length === 0) {
        console.log("⚠️ No data found on this page, stopping...");
        break;
        }

        progressBar.start(data.length, 0, { page });

        for (const [index, anime] of data.entries()) {
        try {
            const slug = slugify(anime.title, { lower: true });
            const studioName = anime.studios?.[0]?.name || "Unknown Studio";

            // --- Studio ---
            const { data: studioFound, error: studioError } = await supabase
            .from("studio")
            .select("id")
            .eq("name", studioName)
            .single();

            if (studioError && studioError.code !== "PGRST116") continue;

            let studioData = studioFound;

            if (!studioData) {
            const { data: newStudio } = await supabase
                .from("studio")
                .insert({ name: studioName })
                .select()
                .single();

            studioData = newStudio;
            }

            // --- Anime ---
            const { data: animeData, error: animeError } = await supabase
            .from("anime")
            .upsert(
                {
                id: anime.mal_id,
                name: anime.title,
                description: anime.synopsis,
                image: anime.images?.jpg?.large_image_url,
                studio_id: studioData?.id || null,
                slug,
                },
                { onConflict: "id" }
            )
            .select()
            .single();

            if (animeError) continue;

            totalInserted++;

            // --- Genre ---
            for (const genre of anime.genres || []) {
            const { data: genreDataRaw, error: genreError } = await supabase
                .from("genre")
                .select("id")
                .eq("name", genre.name)
                .single();

            if (genreError && genreError.code !== "PGRST116") continue;

            let genreData = genreDataRaw;

            if (!genreData) {
                const { data: newGenre } = await supabase
                .from("genre")
                .insert({ id: genre.mal_id, name: genre.name })
                .select()
                .single();

                genreData = newGenre;
            }

            if (genreData && genreData.id && animeData && animeData.id) {
                await supabase
                .from("anime_genres")
                .upsert(
                    {
                    anime_id: animeData.id,
                    genre_id: genreData.id,
                    },
                    { onConflict: "anime_id,genre_id" }
                );
            }
            }

            progressBar.update(index + 1);
            await delay(500);
        } catch (err) {
            console.error("💥 Unexpected error processing anime:", err);
            await delay(2000);
        }
        }

        progressBar.stop();
        console.log(`✅ Page ${page} completed. Total so far: ${totalInserted}`);
        hasNextPage = pagination?.has_next_page ?? false;
        page++;
        await delay(2000);
    }

    console.log(`\n🎉 Sync finished successfully! Total inserted: ${totalInserted}`);
}

syncAnimeFromJikan().catch((err) => {
    console.error("💀 Fatal error:", err);
});
