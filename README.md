# GraphCraft 📊

**Effortlessly transform your data into perfect hand-drawn coordinates**

GraphCraft is a web-based coordinate calculator designed for students, educators, and anyone who needs to plot data on hand-drawn graph paper. It automatically calculates optimal axis scales and converts your data points into precise grid coordinates.

![GraphCraft](logo.png)

## ✨ Features

### Core Functionality
- **Smart Scale Calculation** - Automatically determines optimal "nice number" scales for both axes (e.g., 1, 2, 5, 10, 25, 50...)
- **Grid Coordinate Conversion** - Converts raw data values to exact grid square positions
- **Multiple Y-Axis Support** - Add up to 8 Y-axis data series with distinct colors
- **Linear Regression** - Calculates regression equations and R² values for each data series

### Visualization
- **Interactive Graph Preview** - Desmos-style graph with modern glassmorphism design
- **Zoom Controls** - Zoom in/out (50% to 300%) for detailed viewing
- **Pan Support** - Scroll to pan across the graph
- **Data Labels** - Shows original (x, y) values above each point
- **Color-Coded Series** - Each Y series has unique colors for easy identification

### Data Management
- **Auto-Save** - Data automatically saved to browser localStorage
- **Persistent Sessions** - Your data survives page refreshes
- **Easy Data Entry** - Tab/Enter navigation between cells
- **Dynamic Rows** - Add or remove data rows as needed

### Export Options
- **PDF Download** - High-resolution PDF export of your graph
- **Share PDF** - Share directly via Web Share API (mobile/supported browsers)
- **Include Data Table** - Option to add data table to PDF export
- **Custom Titles** - Add graph title and axis labels

### Axis Reference Tables
- **X-Axis Values** - Quick reference for plotting X coordinates
- **Y-Axis Values** - Quick reference for plotting Y coordinates
- **Scaled Coordinates** - Complete table of converted grid positions

## 🚀 Getting Started

### Online Usage
Simply open `index.html` in any modern web browser. No installation or server required!

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/graphHelper.git

# Navigate to the project
cd graphHelper

# Open in browser
# Simply open index.html in your browser
```

## 📖 How to Use

### 1. Set Grid Dimensions
- **Width**: Number of squares horizontally (default: 90)
- **Height**: Number of squares vertically (default: 55)
- **Axis Interval**: Spacing between major gridlines (default: 5)

### 2. Enter Your Data
- Input X values in the first column
- Input Y values in subsequent columns
- Use **+ / −** buttons to add/remove Y columns
- Press **Tab** or **Enter** to move between cells
- Click **+ Add Row** to add more data points

### 3. Calculate Coordinates
- Click the **Calculate Scaled Coordinates** button
- The app will automatically:
  - Determine optimal axis scales
  - Convert all data points to grid coordinates
  - Generate the graph preview
  - Display axis reference tables

### 4. Plot Your Graph
- Use the **X-Axis Values** table to mark your X-axis
- Use the **Y-Axis Values** table to mark your Y-axis
- Use the **Scaled Coordinates** table to plot each point
- Grid coordinates are shown in blue for easy identification

### 5. Export & Share
- Click **📥 Download** to save as PDF
- Click **📤 Share** to share via native share dialog
- Check **Include data table** to add data to the PDF

## 🎨 Design

GraphCraft features a modern **glassmorphism** design with:
- Frosted glass card effects
- Smooth gradients and shadows
- Responsive layout for all devices
- Clean, readable typography

## 🛠️ Technical Details

### Built With
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables, flexbox, grid
- **Vanilla JavaScript** - No frameworks required
- **jsPDF** - PDF generation library
- **Canvas API** - Graph rendering

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome for Android)

### File Structure
```
graphHelper/
├── index.html      # Main HTML structure
├── styles.css      # All styling
├── script.js       # Application logic
├── logo.png        # App logo
├── name.png        # App name image
├── favicon.png     # Browser favicon
└── README.md       # This file
```

## 📱 Mobile Support

GraphCraft is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Optimized input sizes (prevents zoom on iOS)
- Native share support on mobile
- Scroll-to-pan on graph

## 🔒 Privacy

- All data is stored locally in your browser
- No data is sent to any server
- Works completely offline after initial load

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📧 Contact

Created with ❤️ for students and educators everywhere.

---

**GraphCraft** - Making hand-drawn graphs effortless © 2025
