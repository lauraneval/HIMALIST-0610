"use client";

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function LinkHandler({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            // Cari elemen <a> terdekat dari elemen yang diklik
            const link = (event.target as Element)?.closest('a');

            if (link) {
                const href = link.getAttribute('href');
                if (href) {
                    try {
                        // Buat URL absolut dari href untuk perbandingan yang andal
                        const linkUrl = new URL(href, window.location.origin);
                        
                        // Bandingkan pathname link dengan pathname saat ini
                        if (linkUrl.pathname === pathname && linkUrl.search === "" && linkUrl.hash === "") { 
                             // Hanya scroll jika path sama PERSIS (tanpa query/hash baru)
                            
                            // Cegah navigasi default (yang tidak akan melakukan apa-apa)
                            event.preventDefault(); 
                            
                            // Scroll ke atas dengan animasi smooth
                            window.scrollTo({
                                top: 0,
                                behavior: 'smooth'
                            });
                        }
                    } catch (e) {
                        console.error("Could not parse link href:", href, e);
                    }
                }
            }
        };

        // Tambahkan listener ke document
        document.addEventListener('click', handleClick);

        // Cleanup: Hapus listener saat komponen unmount
        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [pathname]); // Pasang ulang listener jika pathname berubah

    return <>{children}</>; // Render children seperti biasa
}