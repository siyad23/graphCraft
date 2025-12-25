// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadFromCache();
    setupEventListeners();
    setupGraphControls();
});

// Graph zoom state
let currentZoom = 1;
let currentResults = null;

// Y column count
let yColumnCount = 1;

// LocalStorage key
const CACHE_KEY = 'graphcraft_data';

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Save data to localStorage
function saveToCache() {
    const { xName, yNames } = getColumnNames();
    const data = {
        gridWidth: document.getElementById('gridWidth').value,
        gridHeight: document.getElementById('gridHeight').value,
        axisInterval: document.getElementById('axisInterval').value,
        yColumnCount: yColumnCount,
        xColumnName: xName,
        yColumnNames: yNames,
        graphTitle: document.getElementById('graphTitle')?.value || '',
        xAxisTitle: document.getElementById('xAxisTitle')?.value || '',
        yAxisTitle: document.getElementById('yAxisTitle')?.value || '',
        rows: []
    };
    
    // Save all row data
    const rows = document.querySelectorAll('#dataBody tr');
    rows.forEach(row => {
        const xInput = row.querySelector('.x-input');
        const yInputs = row.querySelectorAll('.y-input');
        
        const rowData = {
            x: xInput?.value || '',
            yValues: Array.from(yInputs).map(input => input.value || '')
        };
        data.rows.push(rowData);
    });
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

// Load data from localStorage
function loadFromCache() {
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (cached) {
        try {
            const data = JSON.parse(cached);
            
            // Restore grid dimensions
            if (data.gridWidth) document.getElementById('gridWidth').value = data.gridWidth;
            if (data.gridHeight) document.getElementById('gridHeight').value = data.gridHeight;
            if (data.axisInterval) document.getElementById('axisInterval').value = data.axisInterval;
            
            // Restore Y column count first, then update headers with column names
            if (data.yColumnCount) {
                yColumnCount = data.yColumnCount;
                updateYColumnCount();
            }
            
            // Build headers first, then set column names
            updateTableHeaders();
            
            // Restore column names in header inputs
            if (data.xColumnName) {
                const xInput = document.querySelector('.header-input-x');
                if (xInput) xInput.value = data.xColumnName;
            }
            // Restore Y column names (support both old single yColumnName and new yColumnNames array)
            const yInputs = document.querySelectorAll('.header-input-y');
            if (data.yColumnNames && Array.isArray(data.yColumnNames)) {
                yInputs.forEach((input, i) => {
                    // Only restore if it's a custom name (not old "Y" default)
                    if (data.yColumnNames[i] && data.yColumnNames[i] !== 'Y') {
                        input.value = data.yColumnNames[i];
                    }
                });
            }
            // Legacy yColumnName is ignored - use new Y1, Y2, Y3 defaults
            
            // Restore rows
            if (data.rows && data.rows.length > 0) {
                data.rows.forEach(rowData => {
                    addRow();
                    const tbody = document.getElementById('dataBody');
                    const row = tbody.lastElementChild;
                    
                    const xInput = row.querySelector('.x-input');
                    if (xInput && rowData.x) xInput.value = rowData.x;
                    
                    const yInputs = row.querySelectorAll('.y-input');
                    rowData.yValues.forEach((yVal, idx) => {
                        if (yInputs[idx] && yVal) yInputs[idx].value = yVal;
                    });
                });
            } else {
                // No cached rows, initialize with empty rows
                updateTableHeaders();
                initializeTable();
            }
            
            // Restore graph titles (after a short delay to ensure elements exist)
            setTimeout(() => {
                if (data.graphTitle) document.getElementById('graphTitle').value = data.graphTitle;
                if (data.xAxisTitle) document.getElementById('xAxisTitle').value = data.xAxisTitle;
                if (data.yAxisTitle) document.getElementById('yAxisTitle').value = data.yAxisTitle;
                
                // Calculate and display results
                calculateScaledCoordinates();
            }, 100);
            
        } catch (e) {
            console.error('Error loading cached data:', e);
            updateTableHeaders();
            initializeTable();
        }
    } else {
        // No cached data, initialize with empty rows
        updateTableHeaders();
        initializeTable();
    }
}

// Clear cache
function clearCache() {
    localStorage.removeItem(CACHE_KEY);
}

// Initialize with some empty rows
function initializeTable() {
    for (let i = 0; i < 5; i++) {
        addRow();
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', () => {
        addRow();
        calculateScaledCoordinates();
        saveToCache();
        // Focus on the new row's X input
        const tbody = document.getElementById('dataBody');
        const lastRow = tbody.lastElementChild;
        if (lastRow) {
            const xInput = lastRow.querySelector('.x-input');
            if (xInput) xInput.focus();
        }
    });
    
    document.getElementById('add5RowsBtn').addEventListener('click', () => {
        for (let i = 0; i < 5; i++) {
            addRow();
        }
        calculateScaledCoordinates();
        saveToCache();
    });
    
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    // Y column controls
    document.getElementById('addYColBtn').addEventListener('click', addYColumn);
    document.getElementById('removeYColBtn').addEventListener('click', removeYColumn);
    
    // Real-time calculation on grid dimension changes
    document.getElementById('gridWidth').addEventListener('input', () => {
        calculateScaledCoordinates();
        saveToCache();
    });
    document.getElementById('gridHeight').addEventListener('input', () => {
        calculateScaledCoordinates();
        saveToCache();
    });
    document.getElementById('axisInterval').addEventListener('input', () => {
        calculateScaledCoordinates();
        saveToCache();
    });
    
    // Real-time update on title changes
    document.getElementById('graphTitle').addEventListener('input', () => {
        redrawGraphIfReady();
        saveToCache();
    });
    document.getElementById('xAxisTitle').addEventListener('input', () => {
        redrawGraphIfReady();
        saveToCache();
    });
    document.getElementById('yAxisTitle').addEventListener('input', () => {
        redrawGraphIfReady();
        saveToCache();
    });
}

// Add a Y column
function addYColumn() {
    yColumnCount++;
    updateYColumnCount();
    updateTableHeaders();
    updateAllRowsYColumns();
    calculateScaledCoordinates();
    saveToCache();
}

// Remove a Y column
function removeYColumn() {
    if (yColumnCount > 1) {
        yColumnCount--;
        updateYColumnCount();
        updateTableHeaders();
        updateAllRowsYColumns();
        calculateScaledCoordinates();
        saveToCache();
    }
}

// Update Y column count display
function updateYColumnCount() {
    document.getElementById('yColumnCount').textContent = yColumnCount;
}

// Get custom column names from header inputs
function getColumnNames() {
    const xInput = document.querySelector('#tableHeader .header-input-x');
    const yInputs = document.querySelectorAll('#tableHeader .header-input-y');
    const xName = xInput?.value.trim() || 'X';
    const yNames = Array.from(yInputs).map((input, i) => {
        const val = input?.value.trim();
        return val && val.length > 0 ? val : `Y${i + 1}`;
    });
    return { xName, yNames };
}

// Update table headers for Y columns with editable inputs
function updateTableHeaders() {
    const headerRow = document.getElementById('tableHeader');
    // Get current values before rebuilding
    const currentXInput = headerRow.querySelector('.header-input-x');
    const currentYInputs = headerRow.querySelectorAll('.header-input-y');
    const currentXValue = currentXInput?.value || 'X';
    const currentYValues = Array.from(currentYInputs).map(input => input?.value);
    
    // Build header: # | X (input) | Y1 (input) | Y2 (input) | ... | delete button
    let html = '<th>#</th>';
    html += `<th><input type="text" class="header-input header-input-x" value="${currentXValue}" placeholder="X" maxlength="15"></th>`;
    for (let i = 1; i <= yColumnCount; i++) {
        // Use existing value if available and not empty, otherwise default to Y{index}
        const defaultValue = `Y${i}`;
        const existingValue = currentYValues[i - 1];
        const currentValue = (existingValue && existingValue.trim().length > 0) ? existingValue : defaultValue;
        html += `<th><input type="text" class="header-input header-input-y" data-y-index="${i}" value="${currentValue}" placeholder="Y${i}" maxlength="15"></th>`;
    }
    html += '<th></th>';
    headerRow.innerHTML = html;
    
    // Add event listeners to header inputs
    const xHeaderInput = headerRow.querySelector('.header-input-x');
    const yHeaderInputs = headerRow.querySelectorAll('.header-input-y');
    
    if (xHeaderInput) {
        xHeaderInput.addEventListener('input', () => {
            saveToCache();
        });
    }
    
    yHeaderInputs.forEach(input => {
        input.addEventListener('input', () => {
            saveToCache();
        });
    });
}

// Update all existing rows to match Y column count
function updateAllRowsYColumns() {
    const rows = document.querySelectorAll('#dataBody tr');
    rows.forEach(row => {
        const currentYInputs = row.querySelectorAll('.y-input');
        const currentYCount = currentYInputs.length;
        
        // Get the delete button cell (last cell)
        const deleteCell = row.lastElementChild;
        
        if (currentYCount < yColumnCount) {
            // Add more Y columns
            for (let i = currentYCount + 1; i <= yColumnCount; i++) {
                const newCell = document.createElement('td');
                const subscript = getSubscript(i);
                newCell.innerHTML = `<input type="number" step="any" placeholder="Y${subscript}" class="y-input" data-y-index="${i}" inputmode="decimal">`;
                row.insertBefore(newCell, deleteCell);
                
                // Add event listener
                const newInput = newCell.querySelector('.y-input');
                newInput.addEventListener('input', () => {
                    calculateScaledCoordinates();
                    saveToCache();
                });
                setupYInputKeydown(newInput, row);
            }
        } else if (currentYCount > yColumnCount) {
            // Remove extra Y columns
            for (let i = currentYCount; i > yColumnCount; i--) {
                const yInputs = row.querySelectorAll('.y-input');
                const lastYInput = yInputs[yInputs.length - 1];
                lastYInput.closest('td').remove();
            }
        }
        
        // Update placeholders and data-y-index
        const yInputs = row.querySelectorAll('.y-input');
        yInputs.forEach((input, idx) => {
            const subscript = getSubscript(idx + 1);
            input.placeholder = `Y${subscript}`;
            input.dataset.yIndex = idx + 1;
        });
    });
}

// Setup keydown handler for Y inputs
function setupYInputKeydown(yInput, row) {
    yInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const yIndex = parseInt(yInput.dataset.yIndex);
            
            // Check if there's a next Y input in the same row
            if (yIndex < yColumnCount) {
                const nextYInput = row.querySelector(`.y-input[data-y-index="${yIndex + 1}"]`);
                if (nextYInput) {
                    nextYInput.focus();
                    nextYInput.select();
                    return;
                }
            }
            
            // Move to next row's X input
            const tbody = document.getElementById('dataBody');
            const nextRow = row.nextElementSibling;
            if (nextRow) {
                const nextXInput = nextRow.querySelector('.x-input');
                if (nextXInput) {
                    nextXInput.focus();
                    nextXInput.select();
                }
            } else {
                addRow();
                calculateScaledCoordinates();
                const newRow = tbody.lastElementChild;
                const newXInput = newRow.querySelector('.x-input');
                newXInput.focus();
            }
        }
    });
}

// Get subscript characters for numbers
function getSubscript(num) {
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(num).split('').map(d => subscripts[parseInt(d)]).join('');
}

// Redraw graph if data is ready
function redrawGraphIfReady() {
    if (currentResults) {
        drawGraph(currentResults);
    }
}

// Row counter for unique IDs
let rowCounter = 0;

// Add a new row to the data table
function addRow() {
    const tbody = document.getElementById('dataBody');
    const row = document.createElement('tr');
    rowCounter++;
    
    // Build Y columns HTML
    let yColumnsHtml = '';
    for (let i = 1; i <= yColumnCount; i++) {
        const subscript = getSubscript(i);
        yColumnsHtml += `<td><input type="number" step="any" placeholder="Y${subscript}" class="y-input" data-y-index="${i}" inputmode="decimal"></td>`;
    }
    
    row.innerHTML = `
        <td>${rowCounter}</td>
        <td><input type="number" step="any" placeholder="X" class="x-input" inputmode="decimal"></td>
        ${yColumnsHtml}
        <td><button class="btn btn-danger btn-small delete-btn">✕</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Add event listeners to new inputs for real-time calculation
    const xInput = row.querySelector('.x-input');
    const yInputs = row.querySelectorAll('.y-input');
    const deleteBtn = row.querySelector('.delete-btn');
    
    xInput.addEventListener('input', () => {
        calculateScaledCoordinates();
        saveToCache();
    });
    yInputs.forEach(yInput => {
        yInput.addEventListener('input', () => {
            calculateScaledCoordinates();
            saveToCache();
        });
        setupYInputKeydown(yInput, row);
    });
    
    // Auto-advance to first Y input after entering X
    xInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const firstYInput = row.querySelector('.y-input');
            if (firstYInput) {
                firstYInput.focus();
                firstYInput.select();
            }
        }
    });
    
    deleteBtn.addEventListener('click', function() {
        deleteRow(this);
    });
    
    updateRowNumbers();
}

// Delete a row
function deleteRow(button) {
    const row = button.closest('tr');
    row.remove();
    updateRowNumbers();
    calculateScaledCoordinates();
    saveToCache();
}

// Update row numbers after deletion
function updateRowNumbers() {
    const rows = document.querySelectorAll('#dataBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Clear all data
function clearAll() {
    document.getElementById('dataBody').innerHTML = '';
    document.getElementById('resultsSection').style.display = 'none';
    rowCounter = 0;
    yColumnCount = 1;
    updateYColumnCount();
    updateTableHeaders();
    
    // Reset header inputs to defaults
    const xInput = document.querySelector('.header-input-x');
    const yInput = document.querySelector('.header-input-y');
    if (xInput) xInput.value = 'X';
    if (yInput) yInput.value = 'Y';
    
    initializeTable();
    clearCache();
}

// Get all data points from the table
function getDataPoints() {
    const rows = document.querySelectorAll('#dataBody tr');
    const dataPoints = [];
    
    rows.forEach((row, index) => {
        const xInput = row.querySelector('.x-input');
        const yInputs = row.querySelectorAll('.y-input');
        
        const x = parseFloat(xInput.value);
        
        // Collect Y values
        const yValues = [];
        yInputs.forEach(yInput => {
            const y = parseFloat(yInput.value);
            yValues.push(isNaN(y) ? null : y);
        });
        
        // Only include row if X is valid and at least one Y is valid
        if (!isNaN(x) && yValues.some(y => y !== null)) {
            dataPoints.push({ x, yValues, index: index + 1 });
        }
    });
    
    return dataPoints;
}

// Calculate scaled coordinates
function calculateScaledCoordinates() {
    const dataPoints = getDataPoints();
    const resultsSection = document.getElementById('resultsSection');
    
    if (dataPoints.length < 2) {
        resultsSection.style.display = 'none';
        return;
    }
    
    const gridWidth = parseInt(document.getElementById('gridWidth').value) || 90;
    const gridHeight = parseInt(document.getElementById('gridHeight').value) || 55;
    const axisInterval = parseInt(document.getElementById('axisInterval').value) || 5;
    
    // Find min and max values for X
    const xValues = dataPoints.map(p => p.x);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    
    // Find min and max values for all Y series combined
    let allYValues = [];
    dataPoints.forEach(p => {
        p.yValues.forEach(y => {
            if (y !== null) allYValues.push(y);
        });
    });
    
    const yMin = Math.min(...allYValues);
    const yMax = Math.max(...allYValues);
    
    // Calculate ranges from 0 to max
    const xRange = xMax;
    const yRange = yMax;
    
    // Handle edge cases where max is 0
    const effectiveXRange = xRange === 0 ? 1 : xRange;
    const effectiveYRange = yRange === 0 ? 1 : yRange;
    
    // Maximum value should be between 85% to 95% of the grid
    // Calculate scale so that max value lands in this range with a nice number
    const xScalePerSquare = calculateNiceScaleInRange(effectiveXRange, gridWidth, 0.85, 0.95);
    const yScalePerSquare = calculateNiceScaleInRange(effectiveYRange, gridHeight, 0.85, 0.95);
    
    // Origin is always at (0, 0)
    const xStart = 0;
    const yStart = 0;
    
    // Calculate scaled coordinates
    const scaledPoints = dataPoints.map(point => {
        const scaledX = (point.x - xStart) / xScalePerSquare;
        
        // Scale each Y value
        const scaledYValues = point.yValues.map(y => {
            if (y === null) return null;
            return Math.round((y - yStart) / yScalePerSquare);
        });
        
        return {
            index: point.index,
            originalX: point.x,
            originalYValues: point.yValues,
            scaledX: Math.round(scaledX),
            scaledYValues: scaledYValues
        };
    });
    
    // Display results
    displayResults({
        xMin,
        xMax,
        yMin,
        yMax,
        xRange: effectiveXRange,
        yRange: effectiveYRange,
        xScalePerSquare,
        yScalePerSquare,
        xStart,
        yStart,
        scaledPoints,
        axisInterval,
        gridWidth,
        gridHeight,
        yColumnCount
    });
}

// Calculate a nice scale that keeps max value between minPercent and maxPercent of grid
function calculateNiceScaleInRange(maxValue, gridSize, minPercent, maxPercent) {
    // Target: data should use 85-95% of grid, leaving 5-15% margin
    const minUtilization = 0.85;
    const maxUtilization = 0.95;
    
    // Calculate scale bounds
    const minScale = maxValue / (gridSize * maxUtilization);  // Scale for 95% utilization
    const maxScale = maxValue / (gridSize * minUtilization);  // Scale for 85% utilization
    
    // Find the best nice number within this range
    const niceScale = findBestNiceNumberInRange(minScale, maxScale);
    
    // Verify it's valid (should always be, but safety check)
    const utilization = maxValue / (niceScale * gridSize);
    if (utilization > maxUtilization) {
        return findNextNiceNumber(minScale);
    }
    
    return niceScale;
}

/**
 * Sophisticated Nice Number Algorithm
 * 
 * Finds the best "nice" number within a given range [minVal, maxVal]
 * Nice numbers are numbers that create readable axis labels:
 * - Pattern: d × 10^n where d is a "nice" multiplier
 * 
 * The algorithm searches through all nice numbers in the range
 * and picks the one closest to the geometric mean (optimal balance)
 */
function findBestNiceNumberInRange(minVal, maxVal) {
    if (minVal <= 0) minVal = 1e-10;
    if (maxVal <= minVal) maxVal = minVal * 2;
    
    // Extended nice multipliers for better coverage
    // Includes: integers 1-9, halves (1.5, 2.5...), and quarters (1.25, 1.75...)
    const niceMultipliers = [
        1, 1.2, 1.25, 1.5, 1.75, 
        2, 2.5, 
        3, 3.5, 
        4, 4.5, 
        5, 
        6, 
        7, 7.5,
        8, 
        9
    ];
    
    // Collect candidates within range AND nearby (for fallback)
    const inRangeCandidates = [];
    const allCandidates = [];
    
    // Determine the range of exponents to check
    const minExp = Math.floor(Math.log10(minVal)) - 1;
    const maxExp = Math.ceil(Math.log10(maxVal)) + 1;
    
    for (let exp = minExp; exp <= maxExp; exp++) {
        const magnitude = Math.pow(10, exp);
        for (const mult of niceMultipliers) {
            const niceNum = mult * magnitude;
            allCandidates.push(niceNum);
            if (niceNum >= minVal - 1e-15 && niceNum <= maxVal + 1e-15) {
                inRangeCandidates.push(niceNum);
            }
        }
    }
    
    // Target: geometric mean gives ~90% utilization
    const targetValue = Math.sqrt(minVal * maxVal);
    
    // Prefer in-range candidates, but fall back to closest nice number if none
    const candidates = inRangeCandidates.length > 0 ? inRangeCandidates : allCandidates;
    
    // If still no candidates, something is very wrong - return minVal
    if (candidates.length === 0) {
        return minVal;
    }
    
    // Pick the candidate closest to target value (using log scale for fairness)
    let best = candidates[0];
    let bestDiff = Math.abs(Math.log(best) - Math.log(targetValue));
    
    for (const candidate of candidates) {
        const diff = Math.abs(Math.log(candidate) - Math.log(targetValue));
        if (diff < bestDiff) {
            bestDiff = diff;
            best = candidate;
        }
    }
    
    // If no in-range candidate was found, ensure we use one >= minVal
    // to guarantee data fits in grid (may exceed 95% utilization but better than overflow)
    if (inRangeCandidates.length === 0 && best < minVal) {
        // Find smallest nice number >= minVal
        for (const candidate of allCandidates.sort((a, b) => a - b)) {
            if (candidate >= minVal - 1e-15) {
                return candidate;
            }
        }
    }
    
    return best;
}

/**
 * Find a nice number close to the target value
 * Used as fallback when range-based search isn't applicable
 */
function findNiceNumber(value) {
    if (value <= 0) return 0.1;
    
    // Get the order of magnitude
    const exponent = Math.floor(Math.log10(value));
    const magnitude = Math.pow(10, exponent);
    
    // Normalize to range [1, 10)
    const normalized = value / magnitude;
    
    // Nice number candidates
    const niceNumbers = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
    
    // Find the closest nice number
    let closest = niceNumbers[0];
    let minDiff = Math.abs(normalized - closest);
    
    for (const nice of niceNumbers) {
        const diff = Math.abs(normalized - nice);
        if (diff < minDiff) {
            minDiff = diff;
            closest = nice;
        }
    }
    
    if (closest === 10) return magnitude * 10;
    return closest * magnitude;
}

/**
 * Find the smallest nice number that is >= minValue
 * Used when we need to ensure data fits within grid bounds
 */
function findNextNiceNumber(minValue) {
    if (minValue <= 0) return 0.1;
    
    // Get the order of magnitude
    const exponent = Math.floor(Math.log10(minValue));
    const magnitude = Math.pow(10, exponent);
    
    // Normalize to range [1, 10)
    const normalized = minValue / magnitude;
    
    // Nice number sequence (ascending order)
    const niceNumbers = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
    
    // Find the first nice number >= normalized value
    for (const nice of niceNumbers) {
        if (nice >= normalized - 1e-10) {
            if (nice === 10) return magnitude * 10;
            return nice * magnitude;
        }
    }
    
    // Fallback: next order of magnitude
    return magnitude * 10;
}

// Display the results
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    
    // Update range info - range is from 0 to max
    document.getElementById('xRange').textContent = 
        `0 to ${results.xMax} (Range = ${results.xRange})`;
    document.getElementById('yRange').textContent = 
        `0 to ${results.yMax} (Range = ${results.yRange})`;
    
    document.getElementById('xScale').textContent = 
        `1 square = ${results.xScalePerSquare} units`;
    document.getElementById('yScale').textContent = 
        `1 square = ${results.yScalePerSquare} units`;
    
    // Generate axis markings
    const xAxisBody = document.getElementById('xAxisBody');
    const yAxisBody = document.getElementById('yAxisBody');
    xAxisBody.innerHTML = '';
    yAxisBody.innerHTML = '';
    
    // X-Axis markings
    for (let gridPos = 0; gridPos <= results.gridWidth; gridPos += results.axisInterval) {
        const value = gridPos * results.xScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(6));
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gridPos}</td>
            <td>${displayValue}</td>
        `;
        xAxisBody.appendChild(row);
    }
    
    // Y-Axis markings
    for (let gridPos = 0; gridPos <= results.gridHeight; gridPos += results.axisInterval) {
        const value = gridPos * results.yScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(6));
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gridPos}</td>
            <td>${displayValue}</td>
        `;
        yAxisBody.appendChild(row);
    }
    
    // Update scaled coordinates table header with custom column names
    const scaledTableHeader = document.getElementById('scaledTableHeader');
    const { xName, yNames } = getColumnNames();
    let headerHtml = `<th>#</th><th>Original ${xName}</th>`;
    for (let i = 1; i <= results.yColumnCount; i++) {
        const yColName = yNames[i - 1] || `Y${i}`;
        headerHtml += `<th>Original ${yColName}</th>`;
    }
    headerHtml += `<th>Grid ${xName}</th>`;
    for (let i = 1; i <= results.yColumnCount; i++) {
        const yColName = yNames[i - 1] || `Y${i}`;
        headerHtml += `<th>Grid ${yColName}</th>`;
    }
    scaledTableHeader.innerHTML = headerHtml;
    
    // Update scaled coordinates table body
    const scaledBody = document.getElementById('scaledBody');
    scaledBody.innerHTML = '';
    
    results.scaledPoints.forEach(point => {
        const row = document.createElement('tr');
        let rowHtml = `<td>${point.index}</td><td>${point.originalX}</td>`;
        
        // Original Y values
        point.originalYValues.forEach(y => {
            rowHtml += `<td>${y !== null ? y : '-'}</td>`;
        });
        
        // Grid X
        rowHtml += `<td class="grid-coord">${point.scaledX}</td>`;
        
        // Grid Y values
        point.scaledYValues.forEach(y => {
            rowHtml += `<td class="grid-coord">${y !== null ? y : '-'}</td>`;
        });
        
        row.innerHTML = rowHtml;
        scaledBody.appendChild(row);
    });
    
    // Draw the graph with regression
    drawGraph(results);
    
    // Show results section
    resultsSection.style.display = 'block';
}

// Calculate linear regression for a single Y series
function calculateRegression(points, yIndex = 0) {
    // Filter points that have a valid Y value at this index
    const validPoints = points.filter(p => p.originalYValues && p.originalYValues[yIndex] !== null);
    const n = validPoints.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (const point of validPoints) {
        const y = point.originalYValues[yIndex];
        sumX += point.originalX;
        sumY += y;
        sumXY += point.originalX * y;
        sumX2 += point.originalX * point.originalX;
        sumY2 += y * y;
    }
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    
    for (const point of validPoints) {
        const y = point.originalYValues[yIndex];
        const predicted = slope * point.originalX + intercept;
        ssTotal += (y - meanY) ** 2;
        ssResidual += (y - predicted) ** 2;
    }
    
    const rSquared = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared };
}

// Draw the graph
function drawGraph(results) {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    
    // Store results for zoom functionality
    currentResults = results;
    
    // Get title inputs
    const graphTitle = document.getElementById('graphTitle')?.value || '';
    const xAxisTitle = document.getElementById('xAxisTitle')?.value || '';
    const yAxisTitle = document.getElementById('yAxisTitle')?.value || '';
    
    // Get custom column names
    const { xName, yNames } = getColumnNames();
    
    const ctx = canvas.getContext('2d');
    
    // High resolution canvas with zoom support
    const dpr = window.devicePixelRatio || 1;
    const baseWidth = 1200;
    const baseHeight = 800;
    const padding = 100; // Increased padding for titles
    
    // Apply zoom
    const canvasWidth = baseWidth * currentZoom;
    const canvasHeight = baseHeight * currentZoom;
    
    // Set canvas size with device pixel ratio for sharpness
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // Scale context for device pixel ratio
    ctx.scale(dpr, dpr);
    
    const scaledPadding = padding * currentZoom;
    const graphWidth = canvasWidth - scaledPadding * 2;
    const graphHeight = canvasHeight - scaledPadding * 2;
    
    // Clear canvas with subtle gradient background (Desmos-like)
    const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    bgGradient.addColorStop(0, '#fafbfc');
    bgGradient.addColorStop(1, '#f0f4f8');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw graph area background (clean white)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20 * currentZoom;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4 * currentZoom;
    roundRect(ctx, scaledPadding - 10 * currentZoom, scaledPadding - 10 * currentZoom, 
              graphWidth + 20 * currentZoom, graphHeight + 20 * currentZoom, 12 * currentZoom);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw graph title
    if (graphTitle) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `600 ${22 * currentZoom}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(graphTitle, canvasWidth / 2, 40 * currentZoom);
    }
    
    // Colors for multiple Y series
    const seriesColors = [
        { fill: '#0ea5e9', stroke: '#0284c7' },  // Blue
        { fill: '#f97316', stroke: '#ea580c' },  // Orange
        { fill: '#22c55e', stroke: '#16a34a' },  // Green
        { fill: '#a855f7', stroke: '#9333ea' },  // Purple
        { fill: '#ec4899', stroke: '#db2777' },  // Pink
        { fill: '#eab308', stroke: '#ca8a04' },  // Yellow
        { fill: '#14b8a6', stroke: '#0d9488' },  // Teal
        { fill: '#ef4444', stroke: '#dc2626' },  // Red
    ];
    
    const regressionColors = ['#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e91e63', '#00bcd4', '#ff5722'];
    
    // Display regression equations for all Y series
    const regressionContainer = document.getElementById('regressionContainer');
    const yCount = results.yColumnCount || 1;
    let regressionHtml = '';
    
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const regression = calculateRegression(results.scaledPoints, yIdx);
        const yColName = yNames[yIdx] || `Y${yIdx + 1}`;
        const colorIdx = yIdx % regressionColors.length;
        const color = regressionColors[colorIdx];
        
        const slopeDisplay = isNaN(regression.slope) ? '0' : regression.slope.toFixed(4);
        const interceptVal = isNaN(regression.intercept) ? 0 : regression.intercept;
        const interceptDisplay = interceptVal >= 0 
            ? `+ ${interceptVal.toFixed(4)}` 
            : `- ${Math.abs(interceptVal).toFixed(4)}`;
        const r2Display = isNaN(regression.rSquared) ? '-' : regression.rSquared.toFixed(4);
        
        regressionHtml += `
            <div class="regression-item" style="border-left: 4px solid ${color}; padding-left: 10px; margin-bottom: 8px;">
                <span class="regression-label" style="color: ${color}; font-weight: bold;">${yColName}:</span>
                <span class="regression-equation">y = ${slopeDisplay}x ${interceptDisplay}</span>
                <span class="regression-label">R² =</span>
                <span class="regression-r2">${r2Display}</span>
            </div>
        `;
    }
    
    regressionContainer.innerHTML = regressionHtml;
    
    // Calculate scale for canvas
    const maxGridX = results.gridWidth;
    const maxGridY = results.gridHeight;
    const scaleX = graphWidth / maxGridX;
    const scaleY = graphHeight / maxGridY;
    
    // Helper function to convert grid coords to canvas coords
    function toCanvasX(gridX) {
        return scaledPadding + gridX * scaleX;
    }
    
    function toCanvasY(gridY) {
        return canvasHeight - scaledPadding - gridY * scaleY;
    }
    
    // Font size scales with zoom
    const baseFontSize = 12 * currentZoom;
    const smallFontSize = 11 * currentZoom;
    
    // Draw minor grid lines (very subtle)
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 0.5 * currentZoom;
    
    // Minor vertical grid lines (every half interval)
    const minorInterval = results.axisInterval / 2;
    for (let x = 0; x <= maxGridX; x += minorInterval) {
        if (x % results.axisInterval !== 0) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(x), scaledPadding);
            ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding);
            ctx.stroke();
        }
    }
    
    // Minor horizontal grid lines
    for (let y = 0; y <= maxGridY; y += minorInterval) {
        if (y % results.axisInterval !== 0) {
            ctx.beginPath();
            ctx.moveTo(scaledPadding, toCanvasY(y));
            ctx.lineTo(canvasWidth - scaledPadding, toCanvasY(y));
            ctx.stroke();
        }
    }
    
    // Draw major grid lines (Desmos-like soft gray)
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
    ctx.lineWidth = 1 * currentZoom;
    
    // Major vertical grid lines
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), scaledPadding);
        ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding);
        ctx.stroke();
    }
    
    // Major horizontal grid lines
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(scaledPadding, toCanvasY(y));
        ctx.lineTo(canvasWidth - scaledPadding, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axes (Desmos-like bold dark axes)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5 * currentZoom;
    ctx.lineCap = 'round';
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(canvasWidth - scaledPadding, canvasHeight - scaledPadding);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(scaledPadding, scaledPadding);
    ctx.stroke();
    
    // Draw axis tick marks
    ctx.lineWidth = 1.5 * currentZoom;
    const tickLength = 6 * currentZoom;
    
    // X-axis ticks
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), canvasHeight - scaledPadding);
        ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding + tickLength);
        ctx.stroke();
    }
    
    // Y-axis ticks
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(scaledPadding, toCanvasY(y));
        ctx.lineTo(scaledPadding - tickLength, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axis labels (Desmos-like clean font)
    ctx.fillStyle = '#475569';
    ctx.font = `500 ${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        const value = x * results.xScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), toCanvasX(x), canvasHeight - scaledPadding + 20 * currentZoom);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        const value = y * results.yScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), scaledPadding - 8 * currentZoom, toCanvasY(y) + 4 * currentZoom);
    }
    
    // Draw X-axis title
    if (xAxisTitle) {
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${14 * currentZoom}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(xAxisTitle, canvasWidth / 2, canvasHeight - 15 * currentZoom);
    }
    
    // Draw Y-axis title (rotated)
    if (yAxisTitle) {
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${14 * currentZoom}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.translate(22 * currentZoom, canvasHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yAxisTitle, 0, 0);
        ctx.restore();
    }
    
    // Draw regression line for each Y series
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const colorIdx = yIdx % regressionColors.length;
        ctx.strokeStyle = regressionColors[colorIdx];
        ctx.lineWidth = 1.5 * currentZoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Calculate regression for this Y series
        const seriesRegression = calculateRegression(results.scaledPoints, yIdx);
        
        const x1 = 0;
        const y1 = seriesRegression.intercept;
        const x2 = results.xMax * 1.1;
        const y2 = seriesRegression.slope * x2 + seriesRegression.intercept;
        
        // Convert to grid coordinates
        const gridX1 = x1 / results.xScalePerSquare;
        const gridY1 = y1 / results.yScalePerSquare;
        const gridX2 = x2 / results.xScalePerSquare;
        const gridY2 = y2 / results.yScalePerSquare;
        
        ctx.beginPath();
        ctx.moveTo(toCanvasX(gridX1), toCanvasY(gridY1));
        ctx.lineTo(toCanvasX(gridX2), toCanvasY(gridY2));
        ctx.stroke();
    }
    
    // Draw data points for each Y series
    const pointRadius = 4 * currentZoom;
    
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const colorIdx = yIdx % seriesColors.length;
        const colors = seriesColors[colorIdx];
        
        results.scaledPoints.forEach(point => {
            const scaledY = point.scaledYValues[yIdx];
            if (scaledY === null) return;
            
            const cx = toCanvasX(point.scaledX);
            const cy = toCanvasY(scaledY);
            
            // Draw point
            ctx.fillStyle = colors.fill;
            ctx.beginPath();
            ctx.arc(cx, cy, pointRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw point border
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 1.5 * currentZoom;
            ctx.stroke();
            
            // Draw data label above the point
            const originalY = point.originalYValues[yIdx];
            if (originalY !== null) {
                ctx.fillStyle = '#475569';
                ctx.font = `500 ${10 * currentZoom}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                ctx.textAlign = 'center';
                const labelText = `(${point.originalX}, ${originalY})`;
                ctx.fillText(labelText, cx, cy - pointRadius - 6 * currentZoom);
            }
        });
    }
    
    // Draw legend (Desmos-like glassmorphism style)
    const legendItemHeight = 24 * currentZoom;
    const legendHeight = (yCount * 2 + 1) * legendItemHeight;
    const legendWidth = 175 * currentZoom;
    const legendX = canvasWidth - legendWidth - 20 * currentZoom;
    const legendY = 55 * currentZoom;
    
    ctx.font = `500 ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    
    // Legend background with glassmorphism effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 16 * currentZoom;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4 * currentZoom;
    roundRect(ctx, legendX - 12 * currentZoom, legendY - 12 * currentZoom, legendWidth + 10 * currentZoom, legendHeight, 10 * currentZoom);
    ctx.fill();
    
    // Legend border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1 * currentZoom;
    roundRect(ctx, legendX - 12 * currentZoom, legendY - 12 * currentZoom, legendWidth + 10 * currentZoom, legendHeight, 10 * currentZoom);
    ctx.stroke();
    
    // Draw legend items for each series
    let legendOffset = 0;
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const colorIdx = yIdx % seriesColors.length;
        const colors = seriesColors[colorIdx];
        const yColName = yNames[yIdx] || `Y${yIdx + 1}`;
        const seriesName = `${yColName} Data`;
        
        // Data points legend
        ctx.fillStyle = colors.fill;
        ctx.beginPath();
        ctx.arc(legendX, legendY + legendOffset, 5 * currentZoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5 * currentZoom;
        ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.fillText(seriesName, legendX + 14 * currentZoom, legendY + legendOffset + 4 * currentZoom);
        legendOffset += legendItemHeight;
        
        // Regression line legend
        ctx.strokeStyle = regressionColors[colorIdx];
        ctx.lineWidth = 2.5 * currentZoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(legendX - 7 * currentZoom, legendY + legendOffset);
        ctx.lineTo(legendX + 7 * currentZoom, legendY + legendOffset);
        ctx.stroke();
        ctx.fillStyle = '#475569';
        const regName = `${yColName} Regression`;
        ctx.fillText(regName, legendX + 14 * currentZoom, legendY + legendOffset + 4 * currentZoom);
        legendOffset += legendItemHeight;
    }
}

// Draw graph to a specific canvas (used for high-res PDF export)
function drawGraphToCanvas(canvas, ctx, results, scale) {
    const baseWidth = 1200;
    const baseHeight = 800;
    const padding = 100;
    
    const canvasWidth = baseWidth * scale;
    const canvasHeight = baseHeight * scale;
    const scaledPadding = padding * scale;
    const graphWidth = canvasWidth - scaledPadding * 2;
    const graphHeight = canvasHeight - scaledPadding * 2;
    
    // Get title inputs
    const graphTitle = document.getElementById('graphTitle')?.value || '';
    const xAxisTitle = document.getElementById('xAxisTitle')?.value || '';
    const yAxisTitle = document.getElementById('yAxisTitle')?.value || '';
    
    // Get custom column names
    const { xName, yNames } = getColumnNames();
    
    // Clear canvas with subtle gradient background (Desmos-like)
    const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    bgGradient.addColorStop(0, '#fafbfc');
    bgGradient.addColorStop(1, '#f0f4f8');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw graph area background
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, scaledPadding - 10 * scale, scaledPadding - 10 * scale, 
              graphWidth + 20 * scale, graphHeight + 20 * scale, 12 * scale);
    ctx.fill();
    
    // Draw graph title
    if (graphTitle) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `600 ${22 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(graphTitle, canvasWidth / 2, 40 * scale);
    }
    
    // Calculate regression
    const regression = calculateRegression(results.scaledPoints);
    
    // Determine grid bounds
    const maxGridX = results.gridWidth;
    const maxGridY = results.gridHeight;
    
    // Calculate scale factors
    const scaleX = graphWidth / maxGridX;
    const scaleY = graphHeight / maxGridY;
    
    // Helper function to convert grid coords to canvas coords
    function toCanvasX(gridX) {
        return scaledPadding + gridX * scaleX;
    }
    
    function toCanvasY(gridY) {
        return canvasHeight - scaledPadding - gridY * scaleY;
    }
    
    // Font sizes
    const baseFontSize = 12 * scale;
    const smallFontSize = 11 * scale;
    
    // Draw minor grid lines
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 0.5 * scale;
    
    const minorInterval = results.axisInterval / 2;
    for (let x = 0; x <= maxGridX; x += minorInterval) {
        if (x % results.axisInterval !== 0) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(x), scaledPadding);
            ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding);
            ctx.stroke();
        }
    }
    for (let y = 0; y <= maxGridY; y += minorInterval) {
        if (y % results.axisInterval !== 0) {
            ctx.beginPath();
            ctx.moveTo(scaledPadding, toCanvasY(y));
            ctx.lineTo(canvasWidth - scaledPadding, toCanvasY(y));
            ctx.stroke();
        }
    }
    
    // Draw major grid lines
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
    ctx.lineWidth = 1 * scale;
    
    // Vertical grid lines
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), scaledPadding);
        ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(scaledPadding, toCanvasY(y));
        ctx.lineTo(canvasWidth - scaledPadding, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = 'round';
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(canvasWidth - scaledPadding, canvasHeight - scaledPadding);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(scaledPadding, scaledPadding);
    ctx.stroke();
    
    // Draw tick marks
    ctx.lineWidth = 1.5 * scale;
    const tickLength = 6 * scale;
    
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), canvasHeight - scaledPadding);
        ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding + tickLength);
        ctx.stroke();
    }
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(scaledPadding, toCanvasY(y));
        ctx.lineTo(scaledPadding - tickLength, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axis labels
    ctx.fillStyle = '#475569';
    ctx.font = `500 ${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        const value = x * results.xScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), toCanvasX(x), canvasHeight - scaledPadding + 20 * scale);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        const value = y * results.yScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), scaledPadding - 8 * scale, toCanvasY(y) + 4 * scale);
    }
    
    // Draw X-axis title
    if (xAxisTitle) {
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(xAxisTitle, canvasWidth / 2, canvasHeight - 15 * scale);
    }
    
    // Draw Y-axis title (rotated)
    if (yAxisTitle) {
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.translate(22 * scale, canvasHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yAxisTitle, 0, 0);
        ctx.restore();
    }
    
    // Colors for multiple Y series
    const seriesColors = [
        { fill: '#0ea5e9', stroke: '#0284c7' },
        { fill: '#f97316', stroke: '#ea580c' },
        { fill: '#22c55e', stroke: '#16a34a' },
        { fill: '#a855f7', stroke: '#9333ea' },
        { fill: '#ec4899', stroke: '#db2777' },
        { fill: '#eab308', stroke: '#ca8a04' },
        { fill: '#14b8a6', stroke: '#0d9488' },
        { fill: '#ef4444', stroke: '#dc2626' },
    ];
    const regressionColors = ['#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e91e63', '#00bcd4', '#ff5722'];
    
    // Draw regression lines for each Y series
    const yCount = results.yColumnCount || 1;
    
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const colorIdx = yIdx % regressionColors.length;
        ctx.strokeStyle = regressionColors[colorIdx];
        ctx.lineWidth = 1.5 * scale;
        ctx.lineCap = 'round';
        
        const seriesRegression = calculateRegression(results.scaledPoints, yIdx);
        
        const x1 = 0;
        const y1 = seriesRegression.intercept;
        const x2 = results.xMax * 1.1;
        const y2 = seriesRegression.slope * x2 + seriesRegression.intercept;
        
        const gridX1 = x1 / results.xScalePerSquare;
        const gridY1 = y1 / results.yScalePerSquare;
        const gridX2 = x2 / results.xScalePerSquare;
        const gridY2 = y2 / results.yScalePerSquare;
        
        ctx.beginPath();
        ctx.moveTo(toCanvasX(gridX1), toCanvasY(gridY1));
        ctx.lineTo(toCanvasX(gridX2), toCanvasY(gridY2));
        ctx.stroke();
    }
    
    // Draw data points for each Y series
    const pointRadius = 4 * scale;
    
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const colorIdx = yIdx % seriesColors.length;
        const colors = seriesColors[colorIdx];
        
        results.scaledPoints.forEach(point => {
            const scaledY = point.scaledYValues[yIdx];
            if (scaledY === null) return;
            
            const cx = toCanvasX(point.scaledX);
            const cy = toCanvasY(scaledY);
            
            ctx.fillStyle = colors.fill;
            ctx.beginPath();
            ctx.arc(cx, cy, pointRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();
            
            // Draw data label above the point
            const originalY = point.originalYValues[yIdx];
            if (originalY !== null) {
                ctx.fillStyle = '#475569';
                ctx.font = `500 ${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                ctx.textAlign = 'center';
                const labelText = `(${point.originalX}, ${originalY})`;
                ctx.fillText(labelText, cx, cy - pointRadius - 6 * scale);
            }
        });
    }
    
    // Draw legend
    const legendItemHeight = 25 * scale;
    const legendHeight = (yCount * 2 + 1) * legendItemHeight;
    const legendX = canvasWidth - 180 * scale;
    const legendY = 25 * scale;
    
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'left';
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 15 * scale, legendY - 15 * scale, 190 * scale, legendHeight);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 15 * scale, legendY - 15 * scale, 190 * scale, legendHeight);
    
    let legendOffset = 0;
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const colorIdx = yIdx % seriesColors.length;
        const colors = seriesColors[colorIdx];
        const yColName = yNames[yIdx] || `Y${yIdx + 1}`;
        const seriesName = `${yColName} Data`;
        
        ctx.fillStyle = colors.fill;
        ctx.beginPath();
        ctx.arc(legendX, legendY + legendOffset, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText(seriesName, legendX + 15 * scale, legendY + legendOffset + 5 * scale);
        legendOffset += legendItemHeight;
        
        ctx.strokeStyle = regressionColors[colorIdx];
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(legendX - 8 * scale, legendY + legendOffset);
        ctx.lineTo(legendX + 8 * scale, legendY + legendOffset);
        ctx.stroke();
        ctx.fillStyle = '#333';
        const regName = `${yColName} Regression`;
        ctx.fillText(regName, legendX + 15 * scale, legendY + legendOffset + 5 * scale);
        legendOffset += legendItemHeight;
    }
}

// Setup graph zoom controls
function setupGraphControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const sharePdfBtn = document.getElementById('sharePdfBtn');
    
    if (!zoomInBtn) return; // Controls not yet in DOM
    
    zoomInBtn.addEventListener('click', () => {
        if (currentZoom < 3) {
            currentZoom += 0.25;
            updateZoom();
        }
    });
    
    zoomOutBtn.addEventListener('click', () => {
        if (currentZoom > 0.5) {
            currentZoom -= 0.25;
            updateZoom();
        }
    });
    
    resetZoomBtn.addEventListener('click', () => {
        currentZoom = 1;
        updateZoom();
    });
    
    // PDF Download functionality
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            const canvas = document.getElementById('graphCanvas');
            if (!canvas || !currentResults) {
                alert('No graph to download. Please calculate coordinates first.');
                return;
            }
            
            try {
                // Get title for filename
                const graphTitle = document.getElementById('graphTitle')?.value || 'graph';
                const sanitizedTitle = graphTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'graph';
                
                // Create a high-resolution off-screen canvas for PDF export
                const exportCanvas = document.createElement('canvas');
                const exportCtx = exportCanvas.getContext('2d');
                
                // Use high resolution for crisp PDF (3x base resolution)
                const exportScale = 3;
                const baseWidth = 1200;
                const baseHeight = 800;
                
                exportCanvas.width = baseWidth * exportScale;
                exportCanvas.height = baseHeight * exportScale;
                
                // Draw high-res version
                drawGraphToCanvas(exportCanvas, exportCtx, currentResults, exportScale);
                
                // Create PDF using jsPDF
                const { jsPDF } = window.jspdf;
                
                // Use landscape for wider graphs
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                // Get page dimensions
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Calculate dimensions to fit the page with margins
                const margin = 10;
                const maxWidth = pageWidth - 2 * margin;
                const maxHeight = pageHeight - 2 * margin;
                
                // Calculate aspect ratio and fit to page
                const aspectRatio = baseWidth / baseHeight;
                let pdfWidth = maxWidth;
                let pdfHeight = pdfWidth / aspectRatio;
                
                if (pdfHeight > maxHeight) {
                    pdfHeight = maxHeight;
                    pdfWidth = pdfHeight * aspectRatio;
                }
                
                // Center on page
                const xOffset = (pageWidth - pdfWidth) / 2;
                const yOffset = (pageHeight - pdfHeight) / 2;
                
                // Add high-quality image to PDF
                const imgData = exportCanvas.toDataURL('image/png', 1.0);
                pdf.addImage(imgData, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight, undefined, 'FAST');
                
                // Check if data table should be included
                const includeTable = document.getElementById('includeTableCheckbox')?.checked;
                if (includeTable && currentResults) {
                    pdf.addPage('a4', 'portrait');
                    addDataTableToPdf(pdf, graphTitle);
                }
                
                // Download PDF
                pdf.save(`${sanitizedTitle}.pdf`);
            } catch (error) {
                console.error('PDF generation error:', error);
                alert('Error generating PDF. Please try again.');
            }
        });
    }
    
    // Share PDF functionality
    if (sharePdfBtn) {
        sharePdfBtn.addEventListener('click', async () => {
            const canvas = document.getElementById('graphCanvas');
            if (!canvas || !currentResults) {
                alert('No graph to share. Please calculate coordinates first.');
                return;
            }
            
            try {
                // Get title for filename
                const graphTitle = document.getElementById('graphTitle')?.value || 'GraphCraft Graph';
                const sanitizedTitle = graphTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'graph';
                
                // Create a high-resolution off-screen canvas for export
                const exportCanvas = document.createElement('canvas');
                const exportCtx = exportCanvas.getContext('2d');
                
                const exportScale = 3;
                const baseWidth = 1200;
                const baseHeight = 800;
                
                exportCanvas.width = baseWidth * exportScale;
                exportCanvas.height = baseHeight * exportScale;
                
                drawGraphToCanvas(exportCanvas, exportCtx, currentResults, exportScale);
                
                // Create PDF
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 10;
                const maxWidth = pageWidth - 2 * margin;
                const maxHeight = pageHeight - 2 * margin;
                
                const aspectRatio = baseWidth / baseHeight;
                let pdfWidth = maxWidth;
                let pdfHeight = pdfWidth / aspectRatio;
                
                if (pdfHeight > maxHeight) {
                    pdfHeight = maxHeight;
                    pdfWidth = pdfHeight * aspectRatio;
                }
                
                const xOffset = (pageWidth - pdfWidth) / 2;
                const yOffset = (pageHeight - pdfHeight) / 2;
                
                const imgData = exportCanvas.toDataURL('image/png', 1.0);
                pdf.addImage(imgData, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight, undefined, 'FAST');
                
                // Include data table if checked
                const includeTable = document.getElementById('includeTableCheckbox')?.checked;
                if (includeTable && currentResults) {
                    pdf.addPage('a4', 'portrait');
                    addDataTableToPdf(pdf, graphTitle);
                }
                
                // Convert PDF to blob for sharing
                const pdfBlob = pdf.output('blob');
                const pdfFile = new File([pdfBlob], `${sanitizedTitle}.pdf`, { type: 'application/pdf' });
                
                // Check if Web Share API is available and supports files
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                    await navigator.share({
                        title: graphTitle || 'GraphCraft Graph',
                        text: 'Check out this graph created with GraphCraft!',
                        files: [pdfFile]
                    });
                } else {
                    // Fallback: Copy a shareable message or offer download
                    // Create a temporary download link as fallback
                    const url = URL.createObjectURL(pdfBlob);
                    
                    // Try to copy graph info to clipboard as fallback
                    const shareText = `📊 ${graphTitle || 'Graph'}\n` +
                        `X Scale: 1 square = ${currentResults.xScalePerSquare}\n` +
                        `Y Scale: 1 square = ${currentResults.yScalePerSquare}\n` +
                        `Created with GraphCraft`;
                    
                    try {
                        await navigator.clipboard.writeText(shareText);
                        alert('Share not supported on this device. Graph info copied to clipboard! The PDF will download instead.');
                    } catch (e) {
                        alert('Share not supported on this device. The PDF will download instead.');
                    }
                    
                    // Download as fallback
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${sanitizedTitle}.pdf`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share error:', error);
                    alert('Error sharing. Please try downloading instead.');
                }
            }
        });
    }
    
    function updateZoom() {
        zoomLevelDisplay.textContent = Math.round(currentZoom * 100) + '%';
        if (currentResults) {
            drawGraph(currentResults);
        }
    }
}

// Helper function to add data table to PDF
function addDataTableToPdf(pdf, graphTitle) {
    const tablePageWidth = pdf.internal.pageSize.getWidth();
    const tablePageHeight = pdf.internal.pageSize.getHeight();
    const tableMargin = 15;
    let yPos = tableMargin;
    
    // Get column names
    const { xName, yNames } = getColumnNames();
    const yCount = currentResults.yColumnCount || 1;
    
    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const tableTitle = graphTitle || 'Data Table';
    pdf.text(tableTitle + ' - Data', tablePageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Scale info
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`X-Axis Scale: 1 square = ${currentResults.xScalePerSquare}`, tableMargin, yPos);
    yPos += 6;
    pdf.text(`Y-Axis Scale: 1 square = ${currentResults.yScalePerSquare}`, tableMargin, yPos);
    yPos += 12;
    
    // Build dynamic column widths and headers based on Y column count
    const baseColWidth = 30;
    const colWidths = [12, baseColWidth]; // # and Original X
    const headers = ['#', `Orig ${xName}`];
    
    // Add Original Y columns
    for (let i = 0; i < yCount; i++) {
        const yColName = yNames[i] || `Y${i + 1}`;
        colWidths.push(baseColWidth);
        headers.push(`Orig ${yColName}`);
    }
    
    // Add Grid X
    colWidths.push(baseColWidth);
    headers.push(`Grid ${xName}`);
    
    // Add Grid Y columns
    for (let i = 0; i < yCount; i++) {
        const yColName = yNames[i] || `Y${i + 1}`;
        colWidths.push(baseColWidth);
        headers.push(`Grid ${yColName}`);
    }
    
    const startX = tableMargin;
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    
    pdf.setFillColor(14, 165, 233);
    pdf.rect(startX, yPos - 5, totalWidth, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    let xPos = startX + 2;
    headers.forEach((header, i) => {
        pdf.text(header, xPos, yPos);
        xPos += colWidths[i];
    });
    yPos += 8;
    
    // Table rows
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    currentResults.scaledPoints.forEach((point, index) => {
        if (yPos > tablePageHeight - 20) {
            pdf.addPage('a4', 'portrait');
            yPos = tableMargin;
        }
        
        if (index % 2 === 0) {
            pdf.setFillColor(241, 245, 249);
            pdf.rect(startX, yPos - 4, totalWidth, 6, 'F');
        }
        
        // Build row data dynamically
        const rowData = [(index + 1).toString(), point.originalX.toString()];
        
        // Original Y values
        point.originalYValues.forEach(y => {
            rowData.push(y !== null ? y.toString() : '-');
        });
        
        // Grid X
        rowData.push(point.scaledX.toFixed(2));
        
        // Grid Y values
        point.scaledYValues.forEach(y => {
            rowData.push(y !== null ? y.toFixed(2) : '-');
        });
        
        xPos = startX + 2;
        rowData.forEach((cell, i) => {
            pdf.text(cell, xPos, yPos);
            xPos += colWidths[i];
        });
        yPos += 6;
    });
    
    // Add regression info for each Y series
    yPos += 10;
    if (yPos > tablePageHeight - 30) {
        pdf.addPage('a4', 'portrait');
        yPos = tableMargin;
    }
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Regression Analysis:', tableMargin, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    
    for (let yIdx = 0; yIdx < yCount; yIdx++) {
        const yColName = yNames[yIdx] || `Y${yIdx + 1}`;
        const regression = calculateRegression(currentResults.scaledPoints, yIdx);
        
        if (yCount > 1) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${yColName}:`, tableMargin, yPos);
            pdf.setFont('helvetica', 'normal');
            yPos += 6;
        }
        
        const interceptSign = regression.intercept >= 0 ? '+' : '-';
        pdf.text(`Equation: y = ${regression.slope.toFixed(4)}x ${interceptSign} ${Math.abs(regression.intercept).toFixed(4)}`, tableMargin + (yCount > 1 ? 5 : 0), yPos);
        yPos += 6;
        pdf.text(`R² = ${regression.rSquared.toFixed(6)}`, tableMargin + (yCount > 1 ? 5 : 0), yPos);
        yPos += 8;
    }
}