import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from "lucide-react"; // Impor ikon

export default function ConfirmedPage() {
    return (
        // Styling container agar mirip gambar (tema gelap)
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 bg-[#1e1e1e] text-neutral-300">
            {/* Ikon Sukses */}
            <CheckCircle className="w-20 h-20 text-green-500 mb-6 animate-pulse" />

            {/* Judul Utama */}
            <h1 className="text-4xl font-bold mb-4 text-white">
                Email Confirmed!
            </h1>
            {/* Pesan Konfirmasi */}
            <p className="text-lg text-neutral-300 mb-2">
                Your account is now active.
            </p>
            <p className="text-sm text-neutral-400 max-w-md mb-8">
                You can now log in using your credentials.
            </p>

            {/* Tombol Kembali ke Login */}
            <Link href="/login">
                <Button
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg px-8 py-3 rounded-full transition duration-300"
                >
                    Back to Login
                </Button>
            </Link>
        </div>
    );
}