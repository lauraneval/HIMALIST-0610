"use client";

import InsertStudioForm from "@/components/InsertStudioForm";
import UpdateStudioForm from "@/components/UpdateStudioForm";
import DeleteStudioDialog from "@/components/DeleteStudioDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Studio } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { Ellipsis, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { useDebounce } from "@uidotdev/usehooks";
import { Input } from "@/components/ui/input";

const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
    return (
        <div className="flex justify-center items-center gap-4 mt-6">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="border-muted hover:bg-muted"
            >
                Previous
            </Button>
            <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="border-muted hover:bg-muted"
            >
                Next
            </Button>
        </div>
    );
}

export default function StudioList(){
    const [studios, setStudio] = useState<Studio[]>([]);
    const [createDialog, setCreateDialog] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedStudio, setSelectedStudio] = useState<{
        studio: Studio;
        action: 'edit' | 'delete';
    } | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudio = async () => {
            setIsLoading(true);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage - 1;

            const supabase = createClient();
            let query = supabase
                .from('studio')
                .select('*', { count: 'exact' });

            if (debouncedSearchQuery) {
                query = query.ilike('name', `%${debouncedSearchQuery}%`);
            }

            query = query
                .order('id', { ascending: true })
                .range(startIndex, endIndex);

            const { data: studioData, error: studioError, count } = await query;

            if (studioError) {
                console.error('Error fetching list studio', studioError);
                toast.error("Failed to retrieve studio data");
                setStudio([]);
                setTotalCount(0);
            } else {
                setStudio(studioData || []);
                setTotalCount(count ?? 0);
            }
            setIsLoading(false);
        };

        fetchStudio();
    }, [refreshKey, debouncedSearchQuery, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="container mx-auto py-8 text-foreground">
            <Toaster richColors theme="dark" />
            <div className="mb-6 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold">Studio</h1>
                <div className="relative w-full sm:w-[400px] lg:w-[500px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search studios..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full bg-background border border-muted rounded-md h-10 pl-10 pr-4 placeholder-muted focus:ring-1 focus:ring-secondary focus:border-secondary"
                    />
                </div>
                <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="font-bold bg-secondary hover:bg-secondary-hover text-foreground w-full sm:w-auto">Add Studio</Button>
                    </DialogTrigger>
                    <InsertStudioForm onSuccess={() => {
                        setCreateDialog(false);
                        setRefreshKey(key => key + 1);
                        // Optional: Reset search & page?
                        // setSearchQuery("");
                        // setCurrentPage(1);
                    }}/>
                </Dialog>
            </div>

            <div className="w-full border border-border rounded-lg shadow-lg overflow-hidden max-h-[70vh] flex flex-col">
                <div className="overflow-y-auto flex-grow">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="w-[100px] text-foreground">Id</TableHead>
                                <TableHead className="text-foreground">Name</TableHead>
                                <TableHead className="text-right text-foreground pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-10 h-[50vh]">
                                        Loading studios...
                                    </TableCell>
                                </TableRow>
                            ) : studios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-10 h-[50vh]">
                                        No studios found{debouncedSearchQuery ? ` matching "${debouncedSearchQuery}"` : ''}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                studios.map((studio: Studio) => (
                                    <TableRow key={studio.id} className="border-b border-border hover:bg-muted/50">
                                        <TableCell className="font-medium">{studio.id}</TableCell>
                                        <TableCell>{studio.name}</TableCell>
                                        <TableCell className="text-right pr-4">
                                            <DropdownMenu>

                                            <DropdownMenuTrigger asChild className="cursor-pointer text-muted-foreground hover:text-foreground">

                                                <Button variant="ghost" size="icon">

                                                    <Ellipsis className="h-5 w-5" />

                                                </Button>

                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent className="w-40 border-border text-foreground" align="end">

                                                <DropdownMenuLabel className="font-semibold text-muted-foreground">Actions</DropdownMenuLabel>

                                                <DropdownMenuSeparator className="bg-muted"/>

                                                <DropdownMenuGroup>

                                                    <DropdownMenuItem

                                                        className="cursor-pointer hover:bg-muted focus:bg-muted focus:text-foreground"

                                                        onClick={() => setSelectedStudio({ studio, action: 'edit' })}

                                                        onSelect={(e) => e.preventDefault()}

                                                    >

                                                        Update

                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem

                                                        className="text-destructive cursor-pointer hover:bg-destructive-foreground focus:bg-destructive-foreground focus:text-foreground"

                                                        onClick={() => setSelectedStudio({studio, action: 'delete'})}

                                                        onSelect={(e) => e.preventDefault()}

                                                    >

                                                        Delete

                                                    </DropdownMenuItem>

                                                </DropdownMenuGroup>

                                            </DropdownMenuContent>

                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {!isLoading && totalPages > 1 && (
                    <div className="p-4 border-t border-border mt-auto">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {selectedStudio && (
                <>
                    <Dialog
                        open={selectedStudio.action === 'edit'}
                        onOpenChange={(open) => { if (!open) setSelectedStudio(null); }}
                    >
                        <UpdateStudioForm
                            studio={selectedStudio.studio}
                            onSuccess={() => {
                                setSelectedStudio(null);
                                setRefreshKey(key => key + 1);
                            }}
                        />
                    </Dialog>

                    <DeleteStudioDialog
                        open={selectedStudio.action === 'delete'}
                        onOpenChange={(open) => { if (!open) setSelectedStudio(null); }}
                        onSuccess={() => {
                            setRefreshKey(key => key + 1);
                            setSelectedStudio(null);
                        }}
                        studio={selectedStudio.studio}
                    />
                </>
            )}
        </div>
    );
}
