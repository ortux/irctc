async function checkPNR() {
    const pnrInput = document.getElementById('pnr');
    const pnr = pnrInput.value.trim();

    // Validate PNR
    if (!pnr || pnr.length !== 10 || !/^\d{10}$/.test(pnr)) {
        showError('Please enter a valid 10-digit PNR number');
        return;
    }

    // Show loading state
    showLoading(true);
    hideResults();
    hideError();

    try {
        const response = await fetch(`https://bai-dev.xyz/irctc/api.php?action=ctk_pnr_info&pnr=${pnr}`);
        const data = await response.json();

        if (data.success && data.data) {
            displayResults(data.data);
        } else {
            showError('PNR not found or invalid. Please check your PNR number.');
        }
    } catch (error) {
        showError('Unable to fetch PNR status. Please try again later.');
    } finally {
        showLoading(false);
    }
}

function displayResults(data) {
    // Train Information
    document.getElementById('train-no').textContent = data.TrainNo;
    document.getElementById('train-name').textContent = data.TrainName;
    document.getElementById('class').textContent = data.Class;
    document.getElementById('from').textContent = data.SourceName || data.From;
    document.getElementById('to').textContent = data.DestinationName || data.To;
    document.getElementById('doj').textContent = data.Doj;
    document.getElementById('departure').textContent = data.DepartureTime;
    document.getElementById('arrival').textContent = data.ArrivalTime;
    document.getElementById('duration').textContent = data.Duration;

    // Train Status
    const statusElement = document.getElementById('train-status');
    statusElement.textContent = data.TrainStatus || data.InformationMessage;
    statusElement.className = `px-3 py-1 rounded-full text-sm font-medium ${data.TrainStatus?.includes('departed') ? 'bg-orange-100 text-orange-800' :
            data.TrainStatus?.includes('arrived') ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
        }`;

    // Passenger Information
    const passengerList = document.getElementById('passenger-list');
    passengerList.innerHTML = '';

    data.PassengerStatus.forEach((passenger, index) => {
        const passengerDiv = document.createElement('div');
        passengerDiv.className = 'bg-gray-50 p-4 rounded-lg';
        passengerDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="font-semibold text-gray-700">Passenger ${passenger.Number}</h3>
                        <span class="px-2 py-1 rounded text-xs font-medium ${passenger.CurrentStatus.includes('CNF') ? 'bg-green-100 text-green-800' :
                passenger.CurrentStatus.includes('CAN') ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
            }">
                            ${passenger.CurrentStatus}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">Booking Status: <span class="font-medium">${passenger.BookingStatus}</span></p>
                    <p class="text-sm text-gray-600">Current Status: <span class="font-medium">${passenger.CurrentStatus}</span></p>
                    ${passenger.Coach ? `<p class="text-sm text-gray-600">Coach: <span class="font-medium">${passenger.Coach}</span></p>` : ''}
                    ${passenger.Berth ? `<p class="text-sm text-gray-600">Berth: <span class="font-medium">${passenger.Berth}</span></p>` : ''}
                `;
        passengerList.appendChild(passengerDiv);
    });

    // Additional Information
    document.getElementById('pnr-display').textContent = data.Pnr;
    document.getElementById('booking-date').textContent = data.BookingDate;
    document.getElementById('quota').textContent = data.Quota;
    document.getElementById('fare').textContent = data.BookingFare;
    document.getElementById('boarding').textContent = data.BoardingStationName;
    document.getElementById('platform').textContent = data.ExpectedPlatformNo || 'TBA';
    document.getElementById('chart').textContent = data.ChartPrepared ? 'Prepared' : 'Not Prepared';

    showResults();
}

function showLoading(show) {
    const searchText = document.getElementById('search-text');
    const loadingSpinner = document.getElementById('loading-spinner');

    if (show) {
        searchText.textContent = 'Checking...';
        loadingSpinner.classList.remove('hidden');
    } else {
        searchText.textContent = 'Check Status';
        loadingSpinner.classList.add('hidden');
    }
}

function showResults() {
    document.getElementById('results').classList.remove('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error').classList.remove('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

// Allow Enter key to submit
document.getElementById('pnr').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        checkPNR();
    }
});