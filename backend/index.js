// Initialize date
const today = new Date().toISOString().split('T')[0];
document.getElementById('journeyDate').setAttribute('min', today);
document.getElementById('journeyDate').value = today;

// Performance optimizations
const stationCache = new Map();
const recentSearches = new Map();
let selectedFromStation = null;
let selectedToStation = null;
let searchController = null;

// Optimized debounce with immediate execution for cached results
const smartDebounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Enhanced station fetching with multiple fallbacks and caching
async function fetchStations(prefix) {
    if (prefix.length < 2) return [];

    // Check cache first
    const cacheKey = prefix.toLowerCase();
    if (stationCache.has(cacheKey)) {
        console.log('Using cached result for:', prefix);
        return stationCache.get(cacheKey);
    }

    // Cancel previous request
    if (searchController) {
        searchController.abort();
    }
    searchController = new AbortController();

    try {
        console.log('Fetching stations for prefix:', prefix);

        // Primary API with timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const fetchPromise = fetch(`https://solr.easemytrip.com/api/auto/GetTrainAutoSuggest/${encodeURIComponent(prefix)}`, {
            signal: searchController.signal,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=300'
            }
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Validate response format
        if (!Array.isArray(data)) {
            console.error('Invalid API response format:', data);
            throw new Error('Invalid response format');
        }

        // Transform API response to match our expected format
        const transformedData = data.map(station => ({
            Name: station.Name || station.Show || '',
            Code: station.Code || '',
            State: station.State || '',
            ID: station.ID || 0
        }));

        // Cache the result
        stationCache.set(cacheKey, transformedData);

        // Limit cache size
        if (stationCache.size > 100) {
            const firstKey = stationCache.keys().next().value;
            stationCache.delete(firstKey);
        }

        console.log('Stations found:', transformedData.length);
        return transformedData;
    } catch (error) {
        console.error('API fetch failed:', error.message);

        // Don't use fallback if request was aborted
        if (error.name === 'AbortError') {
            return [];
        }

        console.log('Using fallback stations for:', prefix);
        return getFallbackStations(prefix);
    }
}

// Fallback station data for common Indian railway stations
function getFallbackStations(prefix) {
    const fallbackStations = [
        { Name: 'NEW DELHI', Code: 'NDLS', State: 'Delhi', ID: 1 },
        { Name: 'MUMBAI CENTRAL', Code: 'MMCT', State: 'Maharashtra', ID: 2 },
        { Name: 'HOWRAH JN', Code: 'HWH', State: 'West Bengal', ID: 3 },
        { Name: 'CHENNAI CENTRAL', Code: 'MAS', State: 'Tamil Nadu', ID: 4 },
        { Name: 'BANGALORE CITY', Code: 'BNC', State: 'Karnataka', ID: 5 },
        { Name: 'HYDERABAD DECAN', Code: 'HYB', State: 'Telangana', ID: 6 },
        { Name: 'PUNE JN', Code: 'PUNE', State: 'Maharashtra', ID: 7 },
        { Name: 'AHMEDABAD JN', Code: 'ADI', State: 'Gujarat', ID: 8 },
        { Name: 'JAIPUR', Code: 'JP', State: 'Rajasthan', ID: 9 },
        { Name: 'LUCKNOW', Code: 'LJN', State: 'Uttar Pradesh', ID: 10 },
        { Name: 'KANPUR CENTRAL', Code: 'CNB', State: 'Uttar Pradesh', ID: 11 },
        { Name: 'NAGPUR', Code: 'NGP', State: 'Maharashtra', ID: 12 },
        { Name: 'BHOPAL JN', Code: 'BPL', State: 'Madhya Pradesh', ID: 13 },
        { Name: 'GWALIOR', Code: 'GWL', State: 'Madhya Pradesh', ID: 14 },
        { Name: 'INDORE JN BG', Code: 'INDB', State: 'Madhya Pradesh', ID: 15 },
        { Name: 'PATNA JN', Code: 'PNBE', State: 'Bihar', ID: 16 },
        { Name: 'RANCHI', Code: 'RNC', State: 'Jharkhand', ID: 17 },
        { Name: 'BHUBANESWAR', Code: 'BBS', State: 'Odisha', ID: 18 },
        { Name: 'VIJAYAWADA JN', Code: 'BZA', State: 'Andhra Pradesh', ID: 19 },
        { Name: 'KOCHI', Code: 'ERS', State: 'Kerala', ID: 20 },
        { Name: 'THIRUVANANTHAPURAM', Code: 'TVC', State: 'Kerala', ID: 21 },
        { Name: 'COIMBATORE JN', Code: 'CBE', State: 'Tamil Nadu', ID: 22 },
        { Name: 'MADURAI JN', Code: 'MDU', State: 'Tamil Nadu', ID: 23 },
        { Name: 'JODHPUR JN', Code: 'JU', State: 'Rajasthan', ID: 24 },
        { Name: 'UDAIPUR CITY', Code: 'UDZ', State: 'Rajasthan', ID: 25 },
        { Name: 'DEHRADUN', Code: 'DDN', State: 'Uttarakhand', ID: 26 },
        { Name: 'HARIDWAR JN', Code: 'HW', State: 'Uttarakhand', ID: 27 },
        { Name: 'AMRITSAR JN', Code: 'ASR', State: 'Punjab', ID: 28 },
        { Name: 'CHANDIGARH', Code: 'CDG', State: 'Punjab', ID: 29 },
        { Name: 'JAMMU TAWI', Code: 'JAT', State: 'Jammu and Kashmir', ID: 30 },
        { Name: 'GUWAHATI', Code: 'GHY', State: 'Assam', ID: 31 },
        { Name: 'DIBRUGARH', Code: 'DBRG', State: 'Assam', ID: 32 },
        { Name: 'AGARTALA', Code: 'AGTE', State: 'Tripura', ID: 33 },
        { Name: 'IMPHAL', Code: 'IMLR', State: 'Manipur', ID: 34 },
        { Name: 'JAJPUR K ROAD', Code: 'JJKR', State: 'Jajpur , Odisha', ID: 35 }
    ];

    const searchTerm = prefix.toLowerCase();
    return fallbackStations.filter(station =>
        station.Name.toLowerCase().includes(searchTerm) ||
        station.Code.toLowerCase().includes(searchTerm) ||
        station.State.toLowerCase().includes(searchTerm)
    );
}

// Enhanced dropdown with better UX
function showDropdown(inputId, dropdownId, stations, isLoading = false) {
    const dropdown = document.getElementById(dropdownId);
    const spinner = document.getElementById(inputId.replace('Station', 'Spinner'));

    if (isLoading) {
        if (spinner) spinner.classList.remove('hidden');
        dropdown.classList.add('hidden');
        return;
    }

    if (spinner) spinner.classList.add('hidden');
    dropdown.innerHTML = '';

    if (!stations || stations.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-3 text-gray-500 text-center">No stations found</div>';
        dropdown.classList.remove('hidden');
        return;
    }

    // Limit results for better performance
    const limitedStations = stations.slice(0, 10);

    limitedStations.forEach(station => {
        const item = document.createElement('div');
        item.className = 'station-item px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition-colors';
        item.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-semibold text-gray-800">${station.Name}</div>
                    <div class="text-sm text-gray-600">${station.Code}${station.State ? ' - ' + station.State : ''}</div>
                </div>
                <div class="text-xs text-blue-600 font-medium">${station.Code}</div>
            </div>
        `;

        item.addEventListener('click', () => selectStation(inputId, dropdownId, station));
        dropdown.appendChild(item);
    });

    dropdown.classList.remove('hidden');
}

function selectStation(inputId, dropdownId, station) {
    document.getElementById(inputId).value = `${station.Name} (${station.Code})`;
    document.getElementById(dropdownId).classList.add('hidden');

    if (inputId === 'fromStation') {
        selectedFromStation = station;
    } else {
        selectedToStation = station;
    }

    // Add to recent searches
    recentSearches.set(station.Code, station);

    console.log('Selected station:', station);
}

// Event listeners with performance optimizations
document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
        const fromDropdown = document.getElementById('fromDropdown');
        const toDropdown = document.getElementById('toDropdown');
        if (fromDropdown) fromDropdown.classList.add('hidden');
        if (toDropdown) toDropdown.classList.add('hidden');
    }
});

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
    // Input handlers with smart debouncing
    const fromInput = document.getElementById('fromStation');
    const toInput = document.getElementById('toStation');

    if (fromInput) {
        fromInput.addEventListener('input', smartDebounce(async (e) => {
            const value = e.target.value.trim();
            if (value.length < 2) {
                document.getElementById('fromDropdown').classList.add('hidden');
                selectedFromStation = null;
                return;
            }

            showDropdown('fromStation', 'fromDropdown', null, true);
            const stations = await fetchStations(value);
            showDropdown('fromStation', 'fromDropdown', stations, false);
        }, 300));
    }

    if (toInput) {
        toInput.addEventListener('input', smartDebounce(async (e) => {
            const value = e.target.value.trim();
            if (value.length < 2) {
                document.getElementById('toDropdown').classList.add('hidden');
                selectedToStation = null;
                return;
            }

            showDropdown('toStation', 'toDropdown', null, true);
            const stations = await fetchStations(value);
            showDropdown('toStation', 'toDropdown', stations, false);
        }, 300));
    }

    // Focus effects
    [fromInput, toInput].forEach(input => {
        if (input) {
            input.addEventListener('focus', () => {
                input.classList.add('input-focus');
            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    input.classList.remove('input-focus');
                }, 100);
            });
        }
    });

    // Swap functionality
    const swapBtn = document.getElementById('swapBtn');
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            if (fromInput && toInput) {
                [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
                [selectedFromStation, selectedToStation] = [selectedToStation, selectedFromStation];
            }
        });
    }

    // Form submission
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!selectedFromStation || !selectedToStation) {
                alert('Please select both departure and destination stations from the dropdown list.');
                return;
            }

            if (selectedFromStation.Code === selectedToStation.Code) {
                alert('Departure and destination stations cannot be the same.');
                return;
            }

            const journeyDate = document.getElementById('journeyDate');
            const classSelect = document.getElementById('classSelect');
            const quotaSelect = document.getElementById('quotaSelect');

            const formData = {
                from: selectedFromStation.Code,
                to: selectedToStation.Code,
                fromName: selectedFromStation.Name,
                toName: selectedToStation.Name,
                date: journeyDate ? journeyDate.value : today,
                class: classSelect ? classSelect.value : 'SL',
                quota: quotaSelect ? quotaSelect.value : 'GN'
            };

            // Here you would typically navigate to results page
            console.log('Searching trains with:', formData);

            // You can replace this with actual navigation logic
            window.location.href = `./../search/?from=${formData.from}&to=${formData.to}&date=${formData.date}&class=${formData.class}&quota=${formData.quota}`;

            
        });
    }
});

// Quick route selection function
function setRoute(fromName, fromCode, toName, toCode) {
    selectedFromStation = { Name: fromName, Code: fromCode };
    selectedToStation = { Name: toName, Code: toCode };

    const fromInput = document.getElementById('fromStation');
    const toInput = document.getElementById('toStation');

    if (fromInput) fromInput.value = `${fromName} (${fromCode})`;
    if (toInput) toInput.value = `${toName} (${toCode})`;
}

// Preload popular stations for better UX
const preloadStations = async () => {
    const popularPrefixes = ['NEW', 'MUM', 'CHE', 'BAN', 'HYD', 'PUN', 'DEL', 'KOL'];

    for (const prefix of popularPrefixes) {
        try {
            await fetchStations(prefix);
        } catch (error) {
            console.log('Failed to preload stations for:', prefix);
        }
    }
};

// Start preloading after a short delay
setTimeout(preloadStations, 1000);

// Export functions for global use
window.fetchStations = fetchStations;
window.setRoute = setRoute;
window.selectedFromStation = () => selectedFromStation;
window.selectedToStation = () => selectedToStation;