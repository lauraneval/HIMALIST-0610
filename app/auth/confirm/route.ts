import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServerAdmin } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/confirmed'

    const supabaseAdmin = createServerAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (code) {
        const supabase = await createClient()

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error("Auth callback (code) error:", error.message);
            redirect('/error')
        }

        if (data.user && data.user.email) {
            try {
                const { error: updateError } = await supabaseAdmin
                    .from('waitlist')
                    .update({ status: 'confirmed' })
                    .eq('email', data.user.email)
                    .eq('status', 'pending_confirmation');

                if (updateError) {
                    console.error("Failed to update waitlist status:", updateError.message);
                } else {
                    console.log(`Waitlist status updated for: ${data.user.email}`);
                }
            } catch (e: unknown) {
                if (e instanceof Error) {
                    console.error("Exception during waitlist update:", e.message);
                } else {
                    console.error("An unknown exception occurred during waitlist update.");
                }
            }
        }

        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
            console.error("Error signing out user after confirmation:", signOutError.message);
        }
        redirect(next);
    }
    redirect('/error')
}