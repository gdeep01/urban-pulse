import { useState, useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { useGeocode } from '@/hooks/useApi';
import { GeocodingResult } from '@/lib/types';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CitySelectorProps {
    onCitySelect: (city: GeocodingResult) => void;
    currentCity?: string;
}

interface RankedCity {
    cityId: string;
    name: string;
    lat: number;
    lng: number;
}

export function CitySelector({ onCitySelect, currentCity }: CitySelectorProps) {
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Fetch ranked/popular cities for the dropdown
    const { data: popularCities, isLoading: isLoadingCities } = useQuery<RankedCity[]>({
        queryKey: ['rankings'],
        queryFn: async () => {
            const res = await fetch('/api/cities/rankings');
            if (!res.ok) return [];
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Geocoding for custom search
    const { data: searchResults, isLoading: isSearching } = useGeocode(debouncedQuery);

    const handleSelectChange = (value: string) => {
        if (value === 'custom_search') {
            setSearchMode(true);
            return;
        }

        const selectedCity = popularCities?.find(c => c.name === value);
        if (selectedCity) {
            onCitySelect({
                displayName: selectedCity.name,
                lat: selectedCity.lat,
                lng: selectedCity.lng,
                city: selectedCity.name,
                country: ''
            });
        }
    };

    const handleSearchResultClick = (result: GeocodingResult) => {
        onCitySelect(result);
        setSearchMode(false);
        setSearchQuery('');
    };

    if (searchMode) {
        return (
            <div className="relative w-full max-w-[240px]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        autoFocus
                        placeholder="Type city name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500"
                    />
                    <button
                        onClick={() => setSearchMode(false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 px-1"
                    >
                        Cancel
                    </button>
                </div>

                {searchQuery.length > 1 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-[9999]">
                        {isSearching ? (
                            <div className="p-3 text-center text-slate-500 flex justify-center gap-2 items-center text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                            </div>
                        ) : searchResults && searchResults.length > 0 ? (
                            <ul className="max-h-[200px] overflow-y-auto">
                                {searchResults.map((result, i) => (
                                    <li
                                        key={i}
                                        onClick={() => handleSearchResultClick(result)}
                                        className="px-3 py-2 hover:bg-slate-800 cursor-pointer text-sm text-slate-300 truncate transition-colors border-b border-slate-800 last:border-0"
                                    >
                                        {result.displayName}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-3 text-center text-slate-500 text-xs">No results</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Select onValueChange={handleSelectChange} value={currentCity}>
            <SelectTrigger className="w-[200px] bg-slate-900/80 border-slate-700 text-slate-200 focus:ring-cyan-500/50 h-10 backdrop-blur-sm">
                <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <div className="px-2 py-1.5 text-xs text-slate-500 font-medium">Available Cities</div>
                {isLoadingCities ? (
                    <div className="p-2 text-center text-xs text-slate-500">Loading...</div>
                ) : (
                    popularCities?.map((city) => (
                        <SelectItem key={city.cityId} value={city.name} className="focus:bg-slate-800 focus:text-cyan-400 cursor-pointer">
                            {city.name}
                        </SelectItem>
                    ))
                )}

                <div className="h-px bg-slate-800 my-1" />
                <SelectItem value="custom_search" className="text-cyan-400 font-medium focus:bg-slate-800 focus:text-cyan-300 cursor-pointer">
                    + Search New City
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
