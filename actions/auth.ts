"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServerAdmin } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { userAgent } from "next/server";
import { FetchedAnimeDetails, RecommendedAnime } from "@/lib/types";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handleJoinWaitlist(formData: FormData) {
    const email = formData.get('email') as string;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const audienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID;

    // Validasi dasar
    if (!email || !fromEmail || !audienceId) {
        return { status: "error", message: "Konfigurasi server tidak lengkap." };
    }
    if (!email.includes('@')) {
        return { status: "error", message: "Alamat email tidak valid." };
    }

    // Gunakan client Supabase RLS (asumsi policy INSERT publik sudah dibuat)
    const supabase = await createClient();

    try {
        // --- Langkah 1: Simpan ke Supabase ---
        const { error: supabaseError } = await supabase
            .from('waitlist')
            .insert({ email: email, status: 'pending' });

        if (supabaseError) {
            // Kode '23505' adalah error 'unique constraint violation' (email duplikat)
            if (supabaseError.code === '23505') {
                return { status: "info", message: "Email ini sudah terdaftar di daftar tunggu!" };
            }
            throw supabaseError; // Lempar error lain
        }

        // --- Langkah 2: Tambahkan ke Resend Audience ---
        const { error: audienceError } = await resend.contacts.create({
            email: email,
            audienceId: audienceId,
        });

        // Log error ini, tapi jangan hentikan proses jika gagal (Supabase adalah utama)
        if (audienceError) {
            console.warn("Gagal menambahkan kontak ke Resend Audience:", audienceError.message);
        }

        // --- Langkah 3: Kirim Email Konfirmasi "Selamat Datang" ---
        const { error: emailError } = await resend.emails.send({
            from: `HimaList <${fromEmail}>`, // Nama pengirim kustom
            to: email,
            subject: "You're on the HimaList Waitlist! 🚀",
            html: `
                <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <h1 style="color: #ff6600;">HimaList</h1>
                    <h2>You&apos;re Officially on the Waitlist!</h2>
                    <p>Terima kasih telah mendaftar. Kami akan segera menghubungimu jika pendaftaran penuh sudah dibuka.</p>
                    <p style="font-size: 0.9em; color: #777;">Stay tuned!</p>
                </div>
            `,
        });

        if (emailError) {
            console.warn("Gagal mengirim email konfirmasi waitlist:", emailError.message);
            // Tetap kembalikan sukses karena user sudah terdaftar
        }

        return { status: "success", message: "Berhasil! Silakan cek email konfirmasi Anda." };

    } catch (error: unknown) { // <-- Change 'any' to 'unknown'
        let errorMessage = "An unknown error occurred.";
        // Check if it's an Error object to safely access .message
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error("Error:", errorMessage);
        return { status: "error", message: errorMessage };
    }
}

export async function getUserSession() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        return null;
    }
    return { status: "success", user: data?.user };
}

export async function signUp(formData: FormData) {
    const supabase = await createClient();

    const credentials = {
        username: formData.get("username") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`;

    const { error, data } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            data: {
                username: credentials.username,
            },
            emailRedirectTo: confirmationUrl,
        },
    });

    if (error) {
        return {
            status: error?.message,
            user: null
        };
    } else if (data?.user?.identities?.length === 0) {
        return {
            status: "User with this email already exists. Please sign in instead.",
            user: null
        };
    }

    if (data.user) {
        // Ambil ID Audience dari .env
        const audienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID;

        if (audienceId) {
            try {
                // 3. Tambahkan ke tabel 'waitlist' Supabase
                // Kita gunakan supabaseAdmin di sini agar bisa insert
                // ATAU pastikan 'createClient()' bisa insert ke 'waitlist'
                const { error: waitlistError } = await supabase
                    .from('waitlist')
                    .insert({
                        email: credentials.email,
                        name: credentials.username,
                        status: 'pending_confirmation' // Status baru, misal 'menunggu konfirmasi email'
                    });

                if (waitlistError) {
                    // Abaikan error duplikat, tapi log error lain
                    if (waitlistError.code !== '23505') {
                        console.warn("Error adding to waitlist table:", waitlistError.message);
                    }
                }

                // 4. Tambahkan ke Resend Audience
                const { error: audienceError } = await resend.contacts.create({
                    email: credentials.email,
                    audienceId: audienceId,
                    // Opsional: tambahkan nama depan/belakang jika ada
                    // firstName: credentials.username,
                });

                if (audienceError) {
                    // Log error tapi jangan hentikan proses sign up
                    console.warn("Error adding to Resend Audience:", audienceError.message);
                }

            } catch (e: unknown) {
                // Tangani error jika proses Resend/Waitlist gagal total
                console.error("Failed to add user to waitlist/audience:", e);
                // Jangan hentikan proses sign up, cukup log
            }
        } else {
            console.warn("RESEND_WAITLIST_AUDIENCE_ID not set. Skipping audience add.");
        }
    }

    return {
        status: "success",
        user: data.user
    };
}

export async function signIn(formData: FormData) {
    const supabase = await createClient();

    const credentials = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error, data } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
        return {
            status: error?.message,
            user: null
        };
    }

    const { data: existingUser } = await supabase
        .from("user")
        .select("*")
        .eq("email", credentials?.email)
        .limit(1)
        .single();

    if (!existingUser) {
        const { error: insertError } = await supabase.from("user").insert({
            email: data.user?.email,
            username: data.user?.user_metadata?.username
        });
        if (insertError) {
            return {
                status: insertError?.message,
                user: null
            };
        }
    }

    revalidatePath("/", "layout");
    return {
        status: "success",
        user: data.user
    };
}

export async function signOut() {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        redirect("/error");
    }

    revalidatePath("/", "layout");
    redirect("/login");
}

export async function forgotPassword(formData: FormData){
    const supabase = await createClient();
    const origin = (await headers()).get("origin");

    const { error } = await supabase.auth.resetPasswordForEmail(
        formData.get("email") as string,
        {
            redirectTo: `${origin}/reset-password`
        }
    );

    if (error) {
        return {
            status: error?.message,
            user: null
        };
    }
    return { status: "success" };
}

export async function resetPassword(formData: FormData, code: string) {
    const supabase = await createClient();
    const { error: CodeError } = await supabase.auth.exchangeCodeForSession(code);

    if (CodeError) {
        return { status: CodeError?.message };
    }

    const { error } = await supabase.auth.updateUser({
        password: formData.get("password") as string
    });

    if (error) {
        return { status: error?.message };
    }
    return { status: "success" };
}

export async function handleUpdateUsername(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const newUsername = formData.get('username') as string;

    if (!newUsername || newUsername.trim().length < 3) {
        return { status: "error", message: "Username must be at least 3 characters long" };
    }

    const trimmedUsername = newUsername.trim();

    const { error: updateError } = await supabase
        .from('user')
        .update({ username: trimmedUsername })
        .eq('id', user.id)

    if (updateError) {
        console.error("Supabase update error:", updateError);
        if (updateError.code === '23505') {
            return { status: "error", message: "Username already taken" };
        }
        return { status: "error", message: "Failed to update username to databse" };
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { username: trimmedUsername } }
    );

    if (metaError) {
        console.error("Supabase update metadata error:", metaError);
        return { status: "warning", message: "Username updated, but failed to sync metadata" };
    }

    revalidatePath("/profile");
    return { status: "success", message: "Username updated successfully" };
}

export async function handleAddStudio(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can add studios"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const name = formData.get('name') as string;
    if (!name) {
        return { status: "error", message: "The studio name cannot be empty"}
    }

    const { error: insertError } = await supabaseAdmin
        .from("studio")
        .insert({ name: name });

    if (insertError) {
        console.error("Supabase insert error:", insertError.message);
        if (insertError.code === '23505') {
            return { status: "error", message: "A studio with that name already exists" };
        }
        return { status: "error", message: "Failed to add studio to database" };
    }

    revalidatePath("/admin/studio");
    return { status: "success", message: "Studio added successfully" };
}

export async function handleDeleteStudio(studioId: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can delete studios"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!studioId) {
        return { status: "error", message: "Invalid studio id" }
    }

    const { error: deleteError } = await supabaseAdmin
        .from('studio')
        .delete()
        .eq('id', studioId)

    if (deleteError) {
        console.error("Supabase delete error:", deleteError.message);
        return { status: "error", message: "Failed to delete studio" };
    }

    revalidatePath("/admin/studio");
    return { status: "success", message: "Studio deleted successfully" };
}

export async function handleUpdateStudio(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can add studios"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;

    if (!id || isNaN(Number(id))) {
        return { status: "error", message: "Invalid studio id" };
    }
    if (!name) {
        return { status: "error", message: "The studio name cannot be empty"}
    }

    const studioId = Number(id);

    const { error: updateError } = await supabaseAdmin
        .from("studio")
        .update({ name: name })
        .eq('id', studioId);

    if (updateError) {
        console.error("Supabase update error:", updateError.message);
        if (updateError.code === '23505') {
            return { status: "error", message: "Another studio with that name already exists" };
        }
        return { status: "error", message: "Failed to update studio to database" };
    }

    revalidatePath("/admin/studio");
    return { status: "success", message: "Studio updated successfully" };
}

export async function handleAddGenre(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can add genres"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const name = formData.get('name') as string;
    if (!name) {
        return { status: "error", message: "The genre name cannot be empty"}
    }

    const { error: insertError } = await supabaseAdmin
        .from("genre")
        .insert({ name: name });

    if (insertError) {
        console.error("Supabase insert error:", insertError.message);
        if (insertError.code === '23505') {
            return { status: "error", message: "A genre with that name already exists" };
        }
        return { status: "error", message: "Failed to add genre to database" };
    }

    revalidatePath("/admin/genre");
    return { status: "success", message: "Genre added successfully" };
}

export async function handleUpdateGenre(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can add genres"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;

    if (!id || isNaN(Number(id))) {
        return { status: "error", message: "Invalid genre id" };
    }
    if (!name) {
        return { status: "error", message: "The genre name cannot be empty"}
    }

    const genreId = Number(id);

    const { error: updateError } = await supabaseAdmin
        .from("genre")
        .update({ name: name })
        .eq('id', genreId);

    if (updateError) {
        console.error("Supabase update error:", updateError.message);
        if (updateError.code === '23505') {
            return { status: "error", message: "Another genre with that name already exists" };
        }
        return { status: "error", message: "Failed to update genre to database" };
    }

    revalidatePath("/admin/genre");
    return { status: "success", message: "Genre updated successfully" };
}

export async function handleDeleteGenre(genreId: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can delete genres"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!genreId) {
        return { status: "error", message: "Invalid genre id" }
    }

    const { error: deleteError } = await supabaseAdmin
        .from('genre')
        .delete()
        .eq('id', genreId)

    if (deleteError) {
        console.error("Supabase delete error:", deleteError.message);
        return { status: "error", message: "Failed to delete genre" };
    }

    revalidatePath("/admin/genre");
    return { status: "success", message: "Genre deleted successfully" };
}

function createSlug(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

const LIKE_SCORE = 5;
const DISLIKE_SCORE = -15; // Harus sangat signifikan
const HISTORY_SCORE_PER_ANIME_GENRE = 1;
const MAX_HISTORY_SCORE_PER_GENRE = 5; // Batas poin dari history

/**
 * Menghitung skor preferensi genre untuk pengguna berdasarkan
 * tabel 'preference' dan 'history', lalu menyimpannya
 * ke tabel 'user_genre_profile'.
 *
 * @param userId - ID pengguna yang profilnya akan dihitung.
 * @returns Object dengan status sukses atau error.
 */


export async function calculateAndSaveUserProfile(userId: string) {
    if (!userId) {
        return { status: "error", message: "User ID is required." };
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Gunakan client admin untuk akses data (atau client RLS jika policy memungkinkan)
    const supabase = supabaseAdmin;

    // Objek untuk menyimpan skor genre
    const genreScores: { [key: number]: number } = {};

    try {
        // --- Langkah 1: Ambil Preferences (Like/Dislike Eksplisit) ---
        const { data: preferences, error: prefError } = await supabase
            .from('preference')
            .select('genre_id, type')
            .eq('user_id', userId);

        if (prefError) throw prefError;

        // Proses preferences
        preferences?.forEach(pref => {
            if (pref.type === 'like') {
                genreScores[pref.genre_id] = (genreScores[pref.genre_id] || 0) + LIKE_SCORE;
            } else if (pref.type === 'dislike') {
                genreScores[pref.genre_id] = (genreScores[pref.genre_id] || 0) + DISLIKE_SCORE;
            }
        });

        // --- Langkah 2: Ambil History dan Genre-nya (Implisit) ---
        const { data: historyItems, error: historyError } = await supabase
            .from('history')
            .select(`
                anime (
                    anime_genres ( genre_id )
                )
            `) // Ambil genre_id dari anime yang ditonton
            .eq('user_id', userId);
            // .limit(100); // Pertimbangkan limit jika history sangat banyak

        if (historyError) throw historyError;

        // Objek untuk melacak skor history per genre (untuk batas MAX)
        const historyGenreContribution: { [key: number]: number } = {};

        // Proses history
        historyItems?.forEach(({ anime }) => {
            if (anime && Array.isArray(anime) && anime.length > 0) {
                const animeData = anime[0];

                // Now check if anime_genres exists on that first object
                if (animeData.anime_genres) {
                    animeData.anime_genres.forEach((ag: { genre_id: number }) => {
                        const genreId = ag.genre_id;
                        const currentContribution = historyGenreContribution[genreId] || 0;
                        if (currentContribution < MAX_HISTORY_SCORE_PER_GENRE) {
                            genreScores[genreId] = (genreScores[genreId] || 0) + HISTORY_SCORE_PER_ANIME_GENRE;
                            historyGenreContribution[genreId] = currentContribution + HISTORY_SCORE_PER_ANIME_GENRE;
                        }
                    });
                }

            }
        });

        // --- Langkah 3: Simpan Hasil ke Tabel user_genre_profile ---
        // Gunakan upsert: update jika user sudah ada, insert jika belum
        const { error: upsertError } = await supabase
            .from('user_genre_profile')
            .upsert({
                user_id: userId,
                genre_scores: genreScores // Simpan objek skor sebagai JSONB
            }, { onConflict: 'user_id' }); // Tentukan kolom konflik untuk upsert

        if (upsertError) throw upsertError;

        console.log(`Successfully calculated and saved profile for user: ${userId}`);
        return { status: "success", message: "User profile updated." };

    }

    catch (error: unknown) {
        // Add a type check before accessing .message
        let errorMessage = "Failed to update profile due to an unknown error.";
        if (error instanceof Error) {
            errorMessage = `Failed to update profile: ${error.message}`;
        }
        console.error(`Error calculating profile for user ${userId}:`, error); // Log the original error
        return { status: "error", message: errorMessage }; // Return the potentially more specific message
    }
}

export async function handleAddAnime(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can add animes"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const name = formData.get('name') as string;
    const studioIdStr = formData.get('studio_id') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const genreIds = formData.getAll('genre_ids') as string[];

    if (!name || !studioIdStr || !description) {
        return { status: "error", message: "The name, studio, and description cannot be empty"}
    }

    const studioId = Number(studioIdStr);

    if (isNaN(studioId)) {
        return { status: "error", message: "Invalid studio selected" };
    }

    const animeData = {
        name: name,
        slug: createSlug(name),
        description: description,
        image: image || null,
        studio_id: studioId
    };

    const { data: newAnime, error: insertAnimeError } = await supabaseAdmin
        .from("anime")
        .insert(animeData)
        .select('id')
        .single();

    if (insertAnimeError || !newAnime) {
        console.error("Supabase insert anime error:", insertAnimeError.message);
        if (insertAnimeError.code === '23505') {
            return { status: "error", message: "A anime with that name already exists" };
        }
        return { status: "error", message: "Failed to add anime to database" };
    }

    const newAnimeId = newAnime.id;

    if (genreIds && genreIds.length > 0) {
        const genresToInsert = genreIds.map((genreId) => ({
            anime_id: newAnimeId,
            genre_id: Number(genreId)
        }));

        const { error: insertGenreError } = await supabaseAdmin
            .from('anime_genres')
            .insert(genresToInsert);

        if (insertGenreError) {
            console.error('Supabase insert new genre relation error:', insertGenreError);
            return { status: "warning", message: 'Anime created, but failed to add genres' };
        }
    }

    revalidatePath("/admin/anime");
    return { status: "success", message: "Anime added successfully" };
}

export async function handleUpdateAnime(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can add studios"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const studioIdStr = formData.get('studio_id') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const genreIds = formData.getAll('genre_ids') as string[];

    if (!id || isNaN(Number(id))) {
        return { status: "error", message: "Invalid anime id" };
    }
    if (!name || !studioIdStr || !description) {
        return { status: "error", message: "The name, studio, and description cannot be empty"}
    }

    const animeId = Number(id);
    const studioId = Number(studioIdStr);

    if (isNaN(studioId)) {
        return { status: "error", message: "Invalid Studio selected" };
    }

    const animeData = {
        name: name,
        slug: createSlug(name),
        description: description,
        image: image || null,
        studio_id: studioId
    };

    const { error: updateAnimeError } = await supabaseAdmin
        .from('anime')
        .update(animeData)
        .eq('id', animeId);

    if (updateAnimeError) {
        console.error("Supabase update anime error:", updateAnimeError.message);
        return { status: "error", message: "Failed to update anime to database" };
    }

    const { error: deleteGenreError } = await supabaseAdmin
        .from('anime_genres')
        .delete()
        .eq('anime_id', animeId);

    if (deleteGenreError) {
        console.error('Supabase delete old genre relation error:', deleteGenreError);
        return { status: "warning", message: 'Anime updated, but failed to update genres (delete step)' };
    }

    if (genreIds && genreIds.length > 0) {
        const genresToInsert = genreIds.map((genreId) => ({
            anime_id: animeId,
            genre_id: Number(genreId)
        }));

        const { error: insertGenreError } = await supabaseAdmin
            .from('anime_genres')
            .insert(genresToInsert);

        if (insertGenreError) {
            console.error('Supabase insert new genre relation error:', insertGenreError);
            return { status: "warning", message: 'Anime updated, but failed to update genres (insert step).' };
        }
    }

    revalidatePath("/admin/anime");
    return { status: "success", message: "Anime updated successfully" };
}

export async function handleDeleteAnime(animeId: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    const { data: userData, error: roleError } = await supabase
        .from("user")
        .select("role")
        .eq("email", user.email)
        .single();

    if (roleError || userData?.role !== 'admin'){
        return { status: "error", message: "Access denied, only admins can delete animes"}
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!animeId || isNaN(animeId)) {
        return { status: "error", message: "Invalid anime id" }
    }

    const { error: deleteGenreError } = await supabaseAdmin
        .from('anime_genres')
        .delete()
        .eq('anime_id', animeId);

    if (deleteGenreError) {
        console.error("Supabase delete genre relations error:", deleteGenreError.message);
        return { status: "warning", message: "Failed to delete genre" };
    }

    const { error: deleteAnimeError } = await supabaseAdmin
        .from('anime')
        .delete()
        .eq('id', animeId);

    if (deleteAnimeError) {
        console.error("Supabase delete anime error:", deleteAnimeError.message);
        return { status: "error", message: "Failed to delete anime" };
    }

    revalidatePath("/admin/anime");
    return { status: "success", message: "Anime deleted successfully" };
}

export async function handleAddToHistory(animeId: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    if (!animeId || isNaN(animeId)) {
        return { status: "error", message: "Invalid Anime id" };
    }

    const { count, error: checkError } = await supabase
        .from('history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('anime_id', animeId);

    if (checkError) {
        console.error("History check error:", checkError);
    }
    if (count !== null && count > 0) {
        return { status: "info", message: "Already in your history" };
    }

    const { error: insertError } = await supabase
        .from('history')
        .insert({
            user_id: user.id,
            anime_id: animeId
        });

    if (insertError) {
        console.error("Supabase insert error:", insertError.message);
        return { status: "error", message: "Failed to add history to database" };
    }

    // --- ADD THIS ---
    // If insert was successful, recalculate the profile
    const profileResult = await calculateAndSaveUserProfile(user.id);
    if (profileResult.status === "error") {
        // Log the error, but maybe still return success for the preference add
        console.error("Failed to update profile after adding preference:", profileResult.message);
    }
    // --- END ADD ---

    revalidatePath("/anime");
    return { status: "success", message: "Added to watched history" };
}

export async function handleRemoveFromHistory(historyId: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    if (!historyId || isNaN(historyId)) {
        return { status: "error", message: "Invalid history id" };
    }

    const { error: deleteError } = await supabase
        .from('history')
        .delete()
        .eq('id', historyId)

    if (deleteError) {
        console.error("Supabase delete error:", deleteError.message);
        return { status: "error", message: "Failed remove history from database" };
    }

    // --- ADD THIS ---
    // If insert was successful, recalculate the profile
    const profileResult = await calculateAndSaveUserProfile(user.id);
    if (profileResult.status === "error") {
        // Log the error, but maybe still return success for the preference add
        console.error("Failed to update profile after adding preference:", profileResult.message);
    }
    // --- END ADD ---

    revalidatePath("/watchlist");
    return { status: "success", message: "Removed from watchlist" };
}

export async function handleAddPreferences(genreId: number, type: 'like' | 'dislike') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    if (!genreId || isNaN(genreId)) {
        return { status: "error", message: "Invalid genre id" };
    }

    if (type !== 'like' && type !== 'dislike') {
        return { status: "error", message: "Invalid preference type" };
    }

    const { count, error: checkError } = await supabase
        .from('preference')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('genre_id', genreId)
        .eq('type', type);

    if (checkError) {
        console.error("Preference check error:", checkError);
    }
    if (count !== null && count > 0) {
        return { status: "info", message: `Genre already in ${type} list` };
    }

    const { error: insertError } = await supabase
        .from('preference')
        .insert({
            user_id: user.id,
            genre_id: genreId,
            type: type
        });

    if (insertError) {
        console.error("Supabase insert error:", insertError.message);
        return { status: "error", message: "Failed to add preference to database" };
    }

    // --- ADD THIS ---
    // If insert was successful, recalculate the profile
    const profileResult = await calculateAndSaveUserProfile(user.id);
    if (profileResult.status === "error") {
        // Log the error, but maybe still return success for the preference add
        console.error("Failed to update profile after adding preference:", profileResult.message);
    }
    // --- END ADD ---

    revalidatePath("/preferences");
    return { status: "success", message: `Genre added to ${type} list` };
}

export async function handleRemovePreferences(preferenceId: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { status: "error", message: "You must login first"}
    }

    if (!preferenceId || isNaN(preferenceId)) {
        return { status: "error", message: "Invalid preference id" };
    }

    const { error: deleteError } = await supabase
        .from('preference')
        .delete()
        .eq('id', preferenceId);

    if (deleteError) {
        console.error("Supabase delete error:", deleteError.message);
        return { status: "error", message: "Failed remove preference from database" };
    }

    // --- ADD THIS ---
    // If insert was successful, recalculate the profile
    const profileResult = await calculateAndSaveUserProfile(user.id);
    if (profileResult.status === "error") {
        // Log the error, but maybe still return success for the preference add
        console.error("Failed to update profile after adding preference:", profileResult.message);
    }
    // --- END ADD ---

    revalidatePath("/preferences");
    return { status: "success", message: "Preference removed" };
}

type AnimeScore = {
    anime_id: number;
    score: number;
};

/**
 * Generates diversified anime recommendations.
 * Filters candidates based on liked genres, limits sequels/related entries,
 * and limits the number of items per studio.
 *
 * @param userId - ID of the user requesting recommendations.
 * @param limit - Final number of recommendations desired (default 10).
 * @param candidateLimit - Max number of initial candidates to fetch and score (default 1000).
 * @param poolMultiplier - Fetch details for limit * poolMultiplier potential candidates (default 3).
 * @param studioLimit - Max number of recommendations per studio (default 2).
 * @returns Object with status and list of recommended anime details.
 */
export async function getAnimeRecommendations(
    userId: string,
    limit: number = 10,
    candidateLimit: number = 1000, // Limit candidates for performance
    poolMultiplier: number = 3, // Fetch more candidates initially
    studioLimit: number = 2
) {
    if (!userId) {
        return { status: "error", message: "User ID is required", recommendations: [] };
    }

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let userGenreScores: { [key: number]: number } = {};
    let positiveGenreIds: number[] = [];

    try {
        // --- Step 1: Get User Profile & Positive Genres ---
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_genre_profile')
            .select('genre_scores')
            .eq('user_id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError; // Throw if not 'not found'

        if (profileData?.genre_scores) {
            userGenreScores = profileData.genre_scores as { [key: number]: number };
            // Get IDs of genres with a score > 0
            positiveGenreIds = Object.entries(userGenreScores)
                // Only destructure the 'score', ignore the key (genreId)
                .filter(([, score]) => score > 0)
                // Only destructure the 'genreId', ignore the value (score)
                .map(([genreId]) => parseInt(genreId, 10));
        }

        // Handle case where user has no profile or no positive scores yet (fallback needed)
        if (positiveGenreIds.length === 0) {
            console.warn(`No positive genres found for user ${userId}. Consider fallback (e.g., popular anime).`);
            // Implement fallback logic here - for now, return empty
            return { status: "info", message: "No preferences found to generate recommendations.", recommendations: [] };
        }

        // --- Step 2: Get Watched Anime IDs ---
        const { data: watchedAnimeIdsData, error: historyError } = await supabaseAdmin
            .from('history')
            .select('anime_id')
            .eq('user_id', userId);

        if (historyError) throw historyError;
        const watchedAnimeIds = new Set(watchedAnimeIdsData?.map(h => h.anime_id) || []);

        // --- Step 3: Fetch Candidate Anime IDs (Filtered) ---
        // Fetch DISTINCT anime IDs that have at least one positive genre
        // AND are not in the watched list.
        const { data: candidateAnimeIdsData, error: candidateError } = await supabaseAdmin
            .from('anime_genres')
            .select('anime_id')
            .in('genre_id', positiveGenreIds) // Filter by positive genres
            .not('anime_id', 'in', `(${Array.from(watchedAnimeIds).join(',') || '0'})`) // Exclude watched anime
            // We need DISTINCT anime IDs, handle this efficiently.
            // Using a Supabase function or view might be better, but let's try this first.
            // Note: This might fetch duplicates if an anime has multiple positive genres. We'll handle that.
            .limit(candidateLimit * 5); // Fetch more initially due to potential duplicates & filtering

        if (candidateError) throw candidateError;

        // Get unique candidate IDs
        const uniqueCandidateIds = Array.from(new Set(candidateAnimeIdsData?.map(ag => ag.anime_id) || []));

        // Ensure we don't exceed the candidate limit after getting unique IDs
        const finalCandidateIds = uniqueCandidateIds.slice(0, candidateLimit);

        if (finalCandidateIds.length === 0) {
            return { status: "success", message: "No new anime found matching preferences", recommendations: [] };
        }


        // --- Step 4: Fetch Genres for Final Candidates ---
        const { data: candidatesWithGenres, error: genresError } = await supabaseAdmin
            .from('anime_genres')
            .select('anime_id, genre_id')
            .in('anime_id', finalCandidateIds);

        if (genresError) throw genresError;

        // Group genres by anime_id for easier scoring
        const candidateGenresMap = new Map<number, number[]>();
        candidatesWithGenres?.forEach(ag => {
            if (!candidateGenresMap.has(ag.anime_id)) {
                candidateGenresMap.set(ag.anime_id, []);
            }
            candidateGenresMap.get(ag.anime_id)?.push(ag.genre_id);
        });


        // --- Step 5: Score Candidates ---
        const animeScores: AnimeScore[] = [];
        finalCandidateIds.forEach(animeId => {
            let currentAnimeScore = 0;
            const genres = candidateGenresMap.get(animeId) || [];

            genres.forEach(genreId => {
                currentAnimeScore += userGenreScores[genreId] || 0;
            });

            // Only consider anime with a positive score
            if (currentAnimeScore > 0) {
                animeScores.push({ anime_id: animeId, score: currentAnimeScore });
            }
        });

        // --- Step 6: Sort & Get Top N IDs ---
        animeScores.sort((a, b) => b.score - a.score);
        const potentialTopIds = animeScores.slice(0, limit * poolMultiplier).map(item => item.anime_id); // Get more IDs than needed

        // --- Step 7: Fetch Details for Top N ---
        if (potentialTopIds.length === 0) {
            return { status: "success", message: "No specific recommendations found", recommendations: [] };
        }

        const { data: fetchedDetails, error: detailsError } = await supabaseAdmin
            .from('anime')
            .select('id, name, slug, image, studio ( name )') // Select needed details
            .in('id', potentialTopIds);

        if (detailsError) throw detailsError;

        const potentialRecsDetails = (fetchedDetails as unknown as FetchedAnimeDetails[]) || [];

        // --- Step 8: Filter Pool for Sequels and Studio Diversity ---
        const finalRecommendations: RecommendedAnime[] = [];
        const includedSeriesNames = new Set<string>(); // Track base names (simple check)
        const includedStudioCounts = new Map<number, number>(); // Track count per studio ID

        // Create a map for quick lookup based on original score order
        const detailsMap = new Map(potentialRecsDetails?.map(anime => [anime.id, anime]));

        // Iterate through IDs in SCORE ORDER
        for (const animeId of potentialTopIds) {
            if (finalRecommendations.length >= limit) {
                break; // Stop once we have enough recommendations
            }

            const anime = detailsMap.get(animeId);
            if (!anime) continue; // Skip if details weren't fetched for some reason

            // a) Simple Sequel Check (based on name)
            // Extract a base name (e.g., "InuYasha" from "InuYasha Movie 2")
            // This is basic and might need refinement based on your naming conventions
            const baseNameMatch = anime.name.match(/^([a-zA-Z0-9\s:'\-]+?)(?:\s*(?:Movie|Season|Part|OVA|Special|II|III|IV|V|\d+|$))/i);
            const baseName = baseNameMatch ? baseNameMatch[1].trim() : anime.name.trim();
            if (includedSeriesNames.has(baseName.toLowerCase())) {
                continue; // Skip if base name already included
            }

            // b) Studio Limit Check
            const studioId = anime.studio?.id;
            if (studioId) {
                const currentStudioCount = includedStudioCounts.get(studioId) || 0;
                if (currentStudioCount >= studioLimit) {
                    continue; // Skip if studio limit reached
                }
            }

            // If not skipped, add to final list and update trackers
            // Map to RecommendedAnime type
            finalRecommendations.push({
                id: anime.id,
                name: anime.name,
                slug: anime.slug,
                image: anime.image,
                studio: anime.studio ? { name: anime.studio.name } : null
            });
            includedSeriesNames.add(baseName.toLowerCase());
            if (studioId) {
                includedStudioCounts.set(studioId, (includedStudioCounts.get(studioId) || 0) + 1);
            }
        }

        return { status: "success", message: "Recommendations generated", recommendations: finalRecommendations };

    } catch (error: unknown) {
        let errorMessage = "Failed to generate recommendations due to an unknown error";
        if (error instanceof Error) {
            errorMessage = `Failed to generate recommendations: ${error.message}`;
        }
        console.error(`Error generating recommendations for user ${userId}:`, error);
        return { status: "error", message: errorMessage, recommendations: [] };
    }
}