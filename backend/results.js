
// --- STATE MANAGEMENT ---
const state = {
    searchParams: {},
    filters: {
        departureTime: [],
        availableClasses: []
    },
    allTrains: {
        direct: [],
        nearby: []
    },
    filteredTrains: {
        direct: [],
        nearby: []
    },
    isLoading: true,
    error: null,
    uniqueClasses: new Set(),
};

// --- CORE APPLICATION LOGIC ---
document.addEventListener('DOMContentLoaded', init);

function init() {
    // 1. Get search parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    state.searchParams = {
        from: urlParams.get('from') || 'KGP',
        to: urlParams.get('to') || 'JJKR',
        date: urlParams.get('date') || '2025-07-20',
        quota: urlParams.get('quota') || 'GN'
    };

    // 2. Initial Render & Fetch
    render();
    fetchAndProcessTrains();
}

async function fetchAndProcessTrains() {
    state.isLoading = true;
    state.error = null;
    render();

    const apiDate = formatDateForAPI(state.searchParams.date);
    const apiUrl = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${state.searchParams.from}&destinationStationCode=${state.searchParams.to}&dateOfJourney=${apiDate}&addAvailabilityCache=true&showPredictionGlobal=true`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const responseData = await response.json();

        if (responseData.data?.errorMessage) throw new Error(responseData.data.errorMessage);

        processApiResponse(responseData.data?.trainList || []);

        state.isLoading = false;
        applyFiltersAndRender();
    } catch (error) {
        console.error('Error fetching initial trains:', error);
        state.isLoading = false;
        state.error = error.message;
        render();
    }
}

function processApiResponse(trains) {
    state.allTrains.direct = [];
    state.allTrains.nearby = [];
    state.uniqueClasses.clear();

    if (!trains.length) return;

    trains.forEach(train => {
        // Collect all unique available class codes for the filter UI
        (train.avlClasses || []).forEach(cls => state.uniqueClasses.add(cls));

        // *** PROBLEM 1 FIX: Separate direct vs. nearby trains ***
        if (train.fromStnCode === state.searchParams.from && train.toStnCode === state.searchParams.to) {
            state.allTrains.direct.push(train);
        } else {
            state.allTrains.nearby.push(train);
        }
    });
}

async function refreshAvailability(button) {
    // *** PROBLEM 2 FIX: dataset now holds the correct station for ANY train ***
    const { trainNumber, classCode, quota, from, to, date } = button.dataset;

    button.disabled = true;
    button.innerHTML = '<span class="mini-spinner"></span> Refreshing...';

    const requestBody = {
        source: from,
        destination: to,
        class: classCode,
        quota: quota,
        doj: formatDateForGoibiboAPI(date),
        trainNumber: trainNumber
    };

    // This assumes your proxy is set up at 'http://localhost/irctc/proxy.php'
    const proxyUrl = 'https://79d93119d192.ngrok-free.app/irctc/proxy.php';

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) throw new Error(`Proxy error (${response.status}): ${await response.text()}`);

        const data = await response.json();
        if (data.error || !data.response?.availability_status) {
            throw new Error(data.error || 'Invalid data from refresh API.');
        }

        updateClassBadgeUI(trainNumber, classCode, quota, data.response.availability_status);
    } catch (error) {
        console.error('Error refreshing availability:', error);
        button.disabled = false;
        button.innerHTML = 'Retry Refresh';
        button.classList.add('bg-red-500', 'hover:bg-red-600'); // Make retry button red
    }
}

// --- RENDER & UI LOGIC ---

function render() {
    const loadingEl = document.getElementById('loadingState');
    const errorEl = document.getElementById('errorState');
    const resultsEl = document.getElementById('resultsContainer');

    // Render Search Summary
    document.getElementById('fromStation').textContent = state.searchParams.from;
    document.getElementById('toStation').textContent = state.searchParams.to;
    document.getElementById('journeyDate').textContent = formatDate(state.searchParams.date);
    document.getElementById('classQuota').textContent = `Quota: ${state.searchParams.quota}`;

    if (state.isLoading) {
        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        resultsEl.style.display = 'none';
        return;
    }

    if (state.error) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        resultsEl.style.display = 'none';
        document.getElementById('errorMessage').textContent = state.error;
        return;
    }

    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    resultsEl.style.display = 'block';

    renderFilters();
    renderTrainLists();
}

function renderFilters() {
    // Departure Time Filters
    const departureFilters = [
        { label: 'Early (..6A)', values: [0, 5] },
        { label: 'Morning (6-12)', values: [6, 11] },
        { label: 'Afternoon (12-6P)', values: [12, 17] },
        { label: 'Night (6P..)', values: [18, 23] }
    ];
    const depContainer = document.getElementById('departureTimeFilters');
    depContainer.innerHTML = departureFilters.map(f => `
                <button onclick="toggleFilter('departureTime', '${f.values.join(',')}')"
                    data-value="${f.values.join(',')}"
                    class="filter-btn text-sm p-2 rounded-md border bg-gray-50 hover:bg-gray-200 ${state.filters.departureTime.includes(f.values.join(',')) ? 'active' : ''}">
                    ${f.label}
                </button>
            `).join('');

    // Class Filters
    const classContainer = document.getElementById('classFilters');
    classContainer.innerHTML = Array.from(state.uniqueClasses).sort().map(cls => `
                <button onclick="toggleFilter('availableClasses', '${cls}')"
                    data-value="${cls}"
                    class="filter-btn text-sm p-2 rounded-md border bg-gray-50 hover:bg-gray-200 ${state.filters.availableClasses.includes(cls) ? 'active' : ''}">
                    ${cls}
                </button>
            `).join('');
}

function renderTrainLists() {
    const { direct, nearby } = state.filteredTrains;

    renderListSection('direct', direct);
    renderListSection('nearby', nearby);

    // Show 'No Results' message if both lists are empty after filtering
    const noResultsEl = document.getElementById('noResultsState');
    const hasAnyResults = direct.length > 0 || nearby.length > 0;
    noResultsEl.style.display = hasAnyResults ? 'none' : 'block';
}

function renderListSection(type, trains) {
    const container = document.getElementById(`${type}TrainsContainer`);
    const listEl = document.getElementById(`${type}TrainsList`);
    const countEl = document.getElementById(`${type}TrainCount`);

    if (trains.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    countEl.textContent = `(${trains.length})`;
    listEl.innerHTML = trains.map(createTrainCard).join('');
}

function createTrainCard(train) {
    const classes = getAvailableClasses(train);

    const runningDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        .map((day, i) => `<span class="px-1.5 py-0.5 rounded text-xs ${train.runningDays[i] === 'Y' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}">${day}</span>`)
        .join('');

    const fromStationDisplay = train.fromStnCode !== state.searchParams.from ?
        `<span class="text-sm text-red-600 font-semibold" title="Different from search">${train.fromStnCode}</span>` : train.fromStnCode;

    const toStationDisplay = train.toStnCode !== state.searchParams.to ?
        `<span class="text-sm text-red-600 font-semibold" title="Different from search">${train.toStnCode}</span>` : train.toStnCode;

    return `
                <div class="train-card bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-gray-50/50 border-b">
                        <div class="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div>
                                <h3 class="font-bold text-lg text-gray-800">${train.trainNumber} - ${train.trainName}</h3>
                                <div class="flex items-center gap-2 text-xs mt-1">Runs on: ${runningDays}</div>
                            </div>
                            <div class="grid grid-cols-3 items-center gap-4 text-center w-full sm:w-auto">
                                <div class="text-left sm:text-center">
                                    <p class="font-bold text-base">${train.departureTime}</p>
                                    <p class="text-sm font-medium text-gray-700">${fromStationDisplay}</p>
                                </div>
                                <div class="text-center text-xs text-gray-500">
                                    <p>${formatDuration(train.duration)}</p>
                                    <div class="w-full bg-gray-200 rounded-full h-1"><div class="bg-blue-500 h-1 rounded-full"></div></div>
                                </div>
                                <div class="text-right sm:text-center">
                                    <p class="font-bold text-base">${train.arrivalTime}</p>
                                    <p class="text-sm font-medium text-gray-700">${toStationDisplay}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        ${classes.map(cls => createClassBadgeHTML(train, cls)).join('')}
                    </div>
                </div>
            `;
}

function createClassBadgeHTML(train, classInfo) {
    const badgeId = `badge-${train.trainNumber}-${classInfo.class}-${state.searchParams.quota}`;
    if (classInfo.availability !== 'REFRESH') {
        return `
                    <div id="${badgeId}" class="p-2.5 rounded-md text-center border ${getAvailabilityClass(classInfo.availability)}">
                        <div class="flex items-center justify-between text-xs mb-1">
                            <span class="font-bold">${classInfo.class}</span>
                            <span class="font-medium">${classInfo.fare !== 'N/A' ? '₹' + classInfo.fare : ''}</span>
                        </div>
                        <div class="font-semibold text-xs truncate">${classInfo.availabilityDisplay}</div>
                    </div>`;
    }
    return `
                <div id="${badgeId}" class="p-2 rounded-md border text-center availability-refresh flex flex-col justify-center items-center min-h-[70px]">
                    <div class="font-bold text-xs mb-1">${classInfo.class}</div>
                    <button class="w-full bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors" 
                        onclick="refreshAvailability(this)"
                        data-train-number="${train.trainNumber}" 
                        data-class-code="${classInfo.class}" 
                        data-quota="${state.searchParams.quota}" 
                        data-from="${train.fromStnCode}" 
                        data-to="${train.toStnCode}" 
                        data-date="${state.searchParams.date}">
                        Refresh
                    </button>
                </div>`;
}

function updateClassBadgeUI(trainNumber, classCode, quota, refreshedData) {
    const badgeId = `badge-${trainNumber}-${classCode}-${quota}`;
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    badge.className = `p-2.5 rounded-md text-center border ${getAvailabilityClass(refreshedData.status)}`;
    badge.innerHTML = `
                <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-bold">${refreshedData.class}</span>
                    <span class="font-medium">${refreshedData.price ? '₹' + refreshedData.price : ''}</span>
                </div>
                <div class="font-semibold text-xs truncate" title="${refreshedData.status}">${refreshedData.status}</div>
                <div class="text-gray-400" style="font-size: 0.65rem;">${refreshedData.last_updated_on}</div>
            `;
}

// --- FILTERING LOGIC ---

function toggleFilter(type, value) {
    const filterArray = state.filters[type];
    const index = filterArray.indexOf(value);

    if (index > -1) {
        filterArray.splice(index, 1); // Remove filter
    } else {
        filterArray.push(value); // Add filter
    }

    // Update button styles immediately for better UX
    document.querySelectorAll(`[data-value='${value}']`).forEach(btn => {
        btn.classList.toggle('active', index === -1);
    });

    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    state.filteredTrains.direct = filterTrainList(state.allTrains.direct);
    state.filteredTrains.nearby = filterTrainList(state.allTrains.nearby);
    render();
}

function filterTrainList(trainList) {
    const { departureTime, availableClasses } = state.filters;

    if (departureTime.length === 0 && availableClasses.length === 0) {
        return [...trainList]; // No filters applied
    }

    return trainList.filter(train => {
        // Departure time filter logic
        const departureHour = parseInt(train.departureTime.split(':')[0], 10);
        const departureMatch = departureTime.length === 0 || departureTime.some(range => {
            const [start, end] = range.split(',').map(Number);
            return departureHour >= start && departureHour <= end;
        });

        // Available class filter logic
        const classMatch = availableClasses.length === 0 || availableClasses.some(cls => {
            return train.avlClasses.includes(cls);
        });

        return departureMatch && classMatch;
    });
}

// --- HELPER FUNCTIONS ---

function getAvailableClasses(train) {
    const classes = [];
    const quotaKey = state.searchParams.quota === 'TQ' ? 'availabilityCacheTatkal' : 'availabilityCache';
    const availabilityData = train[quotaKey];

    (train.avlClasses || []).forEach(classCode => {
        const classData = availabilityData ? availabilityData[classCode] : null;
        if (classData && classData.availabilityDisplayName) {
            classes.push({
                class: classData.travelClass || classCode,
                availability: classData.availability,
                availabilityDisplay: classData.availabilityDisplayName,
                fare: classData.fare !== 0 ? classData.fare : 'N/A'
            });
        } else {
            classes.push({
                class: classCode,
                availability: 'REFRESH',
                availabilityDisplay: 'Tap to Refresh',
                fare: 'N/A'
            });
        }
    });
    return classes;
}

const getAvailabilityClass = (availability) => {
    const status = (availability || '').toUpperCase();
    if (status.includes('AVAILABLE') || status.includes('AVL')) return 'availability-available';
    if (status.includes('RAC')) return 'availability-rac';
    if (status.includes('WL') || status.includes('GNWL') || status.includes('WAITLISTED')) return 'availability-waitlist';
    if (status.includes('REGRET') || status.includes('NOT AVAILABLE')) return 'availability-not-available';
    return 'availability-info';
};

const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateForAPI = (dateStr) => { const d = new Date(dateStr); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; };
const formatDateForGoibiboAPI = (dateStr) => { const d = new Date(dateStr); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
const formatDuration = (minutes) => isNaN(minutes) ? '--h --m' : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

