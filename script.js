// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTable();
    setupEventListeners();
});

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
    });
    
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    // Real-time calculation on grid dimension changes
    document.getElementById('gridWidth').addEventListener('input', calculateScaledCoordinates);
    document.getElementById('gridHeight').addEventListener('input', calculateScaledCoordinates);
    document.getElementById('axisInterval').addEventListener('input', calculateScaledCoordinates);
}

// Row counter for unique IDs
let rowCounter = 0;

// Add a new row to the data table
function addRow() {
    const tbody = document.getElementById('dataBody');
    const row = document.createElement('tr');
    rowCounter++;
    
    row.innerHTML = `
        <td>${rowCounter}</td>
        <td><input type="number" step="any" placeholder="X" class="x-input" inputmode="decimal"></td>
        <td><input type="number" step="any" placeholder="Y" class="y-input" inputmode="decimal"></td>
        <td><button class="btn btn-danger btn-small delete-btn">✕</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Add event listeners to new inputs for real-time calculation
    const xInput = row.querySelector('.x-input');
    const yInput = row.querySelector('.y-input');
    const deleteBtn = row.querySelector('.delete-btn');
    
    xInput.addEventListener('input', calculateScaledCoordinates);
    yInput.addEventListener('input', calculateScaledCoordinates);
    
    // Auto-advance to Y input after entering X
    xInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            yInput.focus();
            yInput.select();
        }
    });
    
    // Auto-advance to next row's X input after entering Y
    yInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
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
    initializeTable();
}

// Get all data points from the table
function getDataPoints() {
    const rows = document.querySelectorAll('#dataBody tr');
    const dataPoints = [];
    
    rows.forEach((row, index) => {
        const xInput = row.querySelector('.x-input');
        const yInput = row.querySelector('.y-input');
        
        const x = parseFloat(xInput.value);
        const y = parseFloat(yInput.value);
        
        if (!isNaN(x) && !isNaN(y)) {
            dataPoints.push({ x, y, index: index + 1 });
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
    
    // Find min and max values
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
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
        const scaledY = (point.y - yStart) / yScalePerSquare;
        
        return {
            index: point.index,
            originalX: point.x,
            originalY: point.y,
            scaledX: Math.round(scaledX * 2) / 2,  // Round to nearest 0.5
            scaledY: Math.round(scaledY * 2) / 2   // Round to nearest 0.5
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
        gridHeight
    });
}

// Calculate a nice scale value for axis markings
function calculateNiceScale(range, gridSize) {
    const roughScale = range / gridSize;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughScale)));
    const normalized = roughScale / magnitude;
    
    let niceScale;
    if (normalized <= 1) {
        niceScale = 1;
    } else if (normalized <= 2) {
        niceScale = 2;
    } else if (normalized <= 5) {
        niceScale = 5;
    } else {
        niceScale = 10;
    }
    
    return niceScale * magnitude;
}

// Calculate a nice scale that keeps max value between minPercent and maxPercent of grid
function calculateNiceScaleInRange(maxValue, gridSize, minPercent, maxPercent) {
    // Nice numbers to use for scaling (these will be multiplied by powers of 10)
    const niceNumbers = [1, 2, 2.5, 5];
    
    // Calculate the range of acceptable scales
    // maxValue / scale = gridSize * percent
    // scale = maxValue / (gridSize * percent)
    const minScale = maxValue / (gridSize * maxPercent);  // Scale for 95%
    const maxScale = maxValue / (gridSize * minPercent);  // Scale for 85%
    
    // Find the magnitude based on minScale
    const magnitude = Math.pow(10, Math.floor(Math.log10(minScale)));
    
    // Build a list of candidate nice scales across relevant magnitudes
    const candidates = [];
    for (let m = magnitude / 10; m <= magnitude * 100; m *= 10) {
        for (const nice of niceNumbers) {
            candidates.push(nice * m);
        }
    }
    
    // Sort candidates and find the first one in the acceptable range
    candidates.sort((a, b) => a - b);
    
    for (const candidate of candidates) {
        if (candidate >= minScale && candidate <= maxScale) {
            return candidate;
        }
    }
    
    // Fallback: find the closest nice number to the middle of range
    const targetScale = maxValue / (gridSize * 0.90);
    let closestCandidate = candidates[0];
    let closestDiff = Math.abs(candidates[0] - targetScale);
    
    for (const candidate of candidates) {
        const diff = Math.abs(candidate - targetScale);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestCandidate = candidate;
        }
    }
    
    return closestCandidate;
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gridPos}</td>
            <td>${value}</td>
        `;
        xAxisBody.appendChild(row);
    }
    
    // Y-Axis markings
    for (let gridPos = 0; gridPos <= results.gridHeight; gridPos += results.axisInterval) {
        const value = gridPos * results.yScalePerSquare;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gridPos}</td>
            <td>${value}</td>
        `;
        yAxisBody.appendChild(row);
    }
    
    // Update scaled coordinates table
    const scaledBody = document.getElementById('scaledBody');
    scaledBody.innerHTML = '';
    
    results.scaledPoints.forEach(point => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${point.index}</td>
            <td>${point.originalX}</td>
            <td>${point.originalY}</td>
            <td>${point.scaledX}</td>
            <td>${point.scaledY}</td>
        `;
        scaledBody.appendChild(row);
    });
    
    // Draw the graph with regression
    drawGraph(results);
    
    // Show results section
    resultsSection.style.display = 'block';
}

// Calculate linear regression
function calculateRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (const point of points) {
        sumX += point.originalX;
        sumY += point.originalY;
        sumXY += point.originalX * point.originalY;
        sumX2 += point.originalX * point.originalX;
        sumY2 += point.originalY * point.originalY;
    }
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    
    for (const point of points) {
        const predicted = slope * point.originalX + intercept;
        ssTotal += (point.originalY - meanY) ** 2;
        ssResidual += (point.originalY - predicted) ** 2;
    }
    
    const rSquared = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared };
}

// Draw the graph
function drawGraph(results) {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const padding = 50;
    const canvasWidth = 700;
    const canvasHeight = 450;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const graphWidth = canvasWidth - padding * 2;
    const graphHeight = canvasHeight - padding * 2;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Calculate regression
    const regression = calculateRegression(results.scaledPoints);
    
    // Display regression equation
    const slopeDisplay = isNaN(regression.slope) ? '0' : regression.slope.toFixed(4);
    const interceptVal = isNaN(regression.intercept) ? 0 : regression.intercept;
    const interceptDisplay = interceptVal >= 0 
        ? `+ ${interceptVal.toFixed(4)}` 
        : `- ${Math.abs(interceptVal).toFixed(4)}`;
    document.getElementById('regressionEquation').textContent = 
        `y = ${slopeDisplay}x ${interceptDisplay}`;
    document.getElementById('rSquared').textContent = 
        isNaN(regression.rSquared) ? '-' : regression.rSquared.toFixed(4);
    
    // Calculate scale for canvas
    const maxGridX = results.gridWidth;
    const maxGridY = results.gridHeight;
    const scaleX = graphWidth / maxGridX;
    const scaleY = graphHeight / maxGridY;
    
    // Helper function to convert grid coords to canvas coords
    function toCanvasX(gridX) {
        return padding + gridX * scaleX;
    }
    
    function toCanvasY(gridY) {
        return canvasHeight - padding - gridY * scaleY;
    }
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), padding);
        ctx.lineTo(toCanvasX(x), canvasHeight - padding);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(padding, toCanvasY(y));
        ctx.lineTo(canvasWidth - padding, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvasHeight - padding);
    ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvasHeight - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        const value = x * results.xScalePerSquare;
        ctx.fillText(value.toString(), toCanvasX(x), canvasHeight - padding + 15);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        const value = y * results.yScalePerSquare;
        ctx.fillText(value.toString(), padding - 5, toCanvasY(y) + 4);
    }
    
    // Draw regression line
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Find line endpoints using original data regression
    const origRegression = calculateRegression(results.scaledPoints.map(p => ({
        originalX: p.originalX,
        originalY: p.originalY
    })));
    
    const x1 = 0;
    const y1 = origRegression.intercept;
    const x2 = results.xMax * 1.1;
    const y2 = origRegression.slope * x2 + origRegression.intercept;
    
    // Convert to grid coordinates
    const gridX1 = x1 / results.xScalePerSquare;
    const gridY1 = y1 / results.yScalePerSquare;
    const gridX2 = x2 / results.xScalePerSquare;
    const gridY2 = y2 / results.yScalePerSquare;
    
    ctx.beginPath();
    ctx.moveTo(toCanvasX(gridX1), toCanvasY(gridY1));
    ctx.lineTo(toCanvasX(gridX2), toCanvasY(gridY2));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw data points
    ctx.fillStyle = '#0ea5e9';
    results.scaledPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(toCanvasX(point.scaledX), toCanvasY(point.scaledY), 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw point border
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Draw legend
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    // Data points legend
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(canvasWidth - 130, 25, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Data Points', canvasWidth - 118, 29);
    
    // Regression line legend
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvasWidth - 135, 45);
    ctx.lineTo(canvasWidth - 115, 45);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#333';
    ctx.fillText('Regression Line', canvasWidth - 110, 49);
}