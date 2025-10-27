"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServerAdmin } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { userAgent } from "next/server";


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

    const { error, data } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            data: {
                username: credentials.username,
            },
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

    revalidatePath("/", "layout");
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

    revalidatePath("/preferences");
    return { status: "success", message: "Preference removed" };
}