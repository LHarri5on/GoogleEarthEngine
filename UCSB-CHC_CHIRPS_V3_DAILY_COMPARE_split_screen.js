// CHIRPS is fundamentally a pentad and monthly product from which other time steps are derived. 
// The daily dataset ('RNL') uses daily precipitation from the ECMWF ERA Reanalysis v5 (ERA5) data product to partition pentadal CHIRPS-v3 precipitation totals into daily amounts.
// The daily dataset ('SAT') uses daily precipitation from the NASA IMERG Late V07 data product (IMERG) to partition pentadal CHIRPS-v3 precipitation totals into daily amounts.

// This script reads in daily CHIRPS v3 data from both the reanalysis-based disaggregation and the satellite-based disaggregation

// You can compare these using a split screen slider, in two ways: 
// a) For a single day, to see the different characteristics of these daily outputs
// b) For a sum of 5 days, to see that the 5-day (pentadal) totals are identical
// Note: Input a dateA which is at the start of a pentad (day 1, 11, 16, 21, 26 of a month); set numdays to 1 for that date only; 5 for the sum of 5 days from that date

// Show that the daily rainfall is different for RNL and SAT
var numdays = 1
// Show that the daily RNL and SAT data add up to the same amount for the pentadal (here a 5-day) total:
//var numdays = 5

var dateA = ee.Date('2026-01-28')
var dateB = dateA.advance(numdays, 'day');

var dataset1 = ee.ImageCollection('UCSB-CHC/CHIRPS/V3/DAILY_RNL')
                  .filter(ee.Filter.date(dateA, dateB));
var dataset2 = ee.ImageCollection('UCSB-CHC/CHIRPS/V3/DAILY_SAT')
                  .filter(ee.Filter.date(dateA, dateB));
                  

// Reduce the collection by summing all images pixel-wise
var precip1 = dataset1.select('precipitation').sum();
var precip2 = dataset2.select('precipitation').sum();

//var precipitation = dataset.select('precipitation');
var precipitationVis = {
  min: 1.0,
  max: 50.0,
  palette: ['#001137', '#0aab1e', '#e7eb05', '#2c7fb8', '#253494'],
};

// Create two maps
var leftMap = ui.Map();
var rightMap = ui.Map();

// Center both maps on the same location
var center = ee.Geometry.Point([-95, 40]);
leftMap.setCenter(-95, 40, 4);
rightMap.setCenter(-95, 40, 4);

// Set up map labels

var leftLabel = ui.Label('CHIRPS v3.0 Daily RNL Precipitation (mm):\n\nCHIRPS Pentad total disaggregated to daily amounts using\nECMWF ERA5 reanalysis data');
leftLabel.style().set({
  position: 'top-left',
  fontWeight: 'bold',
  padding: '8px'
});

var rightLabel = ui.Label('CHIRPS v3.0 Daily SAT Precipitation (mm):\n\nCHIRPS Pentad total disaggregated to daily amounts using\nNASA IMERG Late v07 satellite data');
rightLabel.style().set({
  position: 'top-right',
  fontWeight: 'bold',
  padding: '8px'
});

// Set whiteSpace to 'pre' so \n is respected
leftLabel.style().set({
  position: 'top-left',
  fontWeight: 'bold',
  whiteSpace: 'pre', // This allows the two lines
  padding: '10px'
});

rightLabel.style().set({
  position: 'top-right',
  fontWeight: 'bold',
  whiteSpace: 'pre',
  padding: '10px'
});


// Add data layers and their labels to each map
leftMap.addLayer(precip1, precipitationVis, 'CHIRPS3: Daily RNL (ERA5)');
rightMap.addLayer(precip2, precipitationVis, 'CHIRPS3: Daily SAT (IMERG)');
leftMap.add(leftLabel);
rightMap.add(rightLabel);
// Link the two maps (pan/zoom synchronizes)
var linker = ui.Map.Linker([leftMap, rightMap]);

// Create a split panel with the two maps side by side
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true
});

// Add the split panel to the root UI
ui.root.clear();
ui.root.add(splitPanel);
