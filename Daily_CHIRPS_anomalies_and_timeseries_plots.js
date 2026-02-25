/**
 * Map CHIRPS daily rainfall anomalies and easily create a time series plot
 * 
 * Data options: CHIRPS daily data (v3-SAT, v3-RNL, v2)
 * User Input: Choose dataset, time period, and either set the target location or click on the map to create a time series plot.
 */

// Instructions:
// After you have set your inputs above, click Run
// To get a time series plot, input a coordinate into the right-side panel or click on the map. 
// Click on Get Chart for Coordinates
// Enlarge your plot and export it by clicking on the export icon in the plot panel (top right)

// 1. Set up Parameters

// *** Specify which CHIRPS daily data to plot ***

// CHIRPS v3 daily SAT (IMERG disaggregation)
var datasetId = 'UCSB-CHC/CHIRPS/V3/DAILY_SAT'; 

// CHIRPS v3 daily RNL (ERA5 disaggregation)
//var datasetId = 'UCSB-CHC/CHIRPS/V3/DAILY_RNL'; 

// CHIRPS v2 daily
var datasetId = 'UCSB-CHG/CHIRPS/DAILY';

// *** Set dates of interest and the map's value range ***
var targetStart = ee.Date('2025-01-01');
var targetEnd = ee.Date('2025-12-31');
var refStart = ee.Date('2001-01-01'); 
var refEnd = ee.Date('2020-12-31');   

var zmin = -500; // precipitation anomaly (mm)
var zmax = 500;

var target_lon = 36.8
var target_lat = -1

// *** Have a coordinate you plan to use multiple times? Enter it here. This will show up as the default in the plot panel.

// ********* No inputs needed below ***************

// Client-side strings
var dateRangeStr = targetStart.format('YYYY-MM-dd').getInfo() + ' to ' + targetEnd.format('YYYY-MM-dd').getInfo();
var baselineYearsStr = refStart.format('YYYY').getInfo() + '-' + refEnd.format('YYYY').getInfo();

var chirps = ee.ImageCollection(datasetId).select('precipitation');

// 2. Map Layer Logic
var startDoy = targetStart.getRelative('day', 'year');
var endDoy = targetEnd.getRelative('day', 'year');

var startYear = refStart.get('year');
var endYear = refEnd.get('year');
var yearList = ee.List.sequence(startYear, endYear);

var baselineCollection = ee.ImageCollection.fromImages(yearList.map(function(y) {
  var yearImg = chirps.filter(ee.Filter.calendarRange(y, y, 'year'))
    .filter(ee.Filter.calendarRange(startDoy, endDoy, 'day_of_year'))
    .sum();
  return yearImg.set('year', y);
})).filter(ee.Filter.listContains('system:band_names', 'precipitation'));

var baselineMeanMap = baselineCollection.mean();
var currentCollection = chirps.filterDate(targetStart, targetEnd.advance(1, 'day'));

Map.setCenter(37.9, 0.0, 4);

var canShowMap = ee.Number(currentCollection.size()).gt(0)
  .and(ee.Number(baselineCollection.size()).gt(0));

canShowMap.evaluate(function(val) {
  if (val) {
    var currentTotal = currentCollection.sum();
    var anomalyMap = currentTotal.subtract(baselineMeanMap);
    Map.addLayer(anomalyMap, {min: zmin, max: zmax, palette: ['#e90000', '#ffffff', '#253494']}, 'Anomaly: ' + dateRangeStr);
  } else {
    print('Warning: Baseline or Target collection is empty.');
  }
});

// 3. UI Panel Setup
var mainPanel = ui.Panel({style: {width: '350px', padding: '10px'}});
ui.root.add(mainPanel);
mainPanel.add(ui.Label('Rainfall Anomaly Tool', {fontWeight: 'bold', fontSize: '18px'}));
mainPanel.add(ui.Label('Source: ' + datasetId, {fontSize: '10px', color: 'gray'}));
mainPanel.add(ui.Label('Period: ' + dateRangeStr, {color: 'gray', fontSize: '12px'}));

var lonInput = ui.Textbox({placeholder: 'Lon', value: target_lon.toString(), style: {width: '90px'}});
var latInput = ui.Textbox({placeholder: 'Lat', value: target_lat.toString(), style: {width: '90px'}});
mainPanel.add(ui.Panel([ui.Label('Lon:'), lonInput, ui.Label('Lat:'), latInput], ui.Panel.Layout.flow('horizontal')));
var chartHolder = ui.Panel();

// 4. Shared Charting Function
var makeChart = function(lon, lat) {
  chartHolder.clear();
  chartHolder.add(ui.Label('Loading chart...'));
  
  lonInput.setValue(lon.toFixed(3));
  latInput.setValue(lat.toFixed(3));
  
  var point = ee.Geometry.Point([lon, lat]);
  var coordsStr = 'Lat: ' + lat.toFixed(3) + ', Lon: ' + lon.toFixed(3);

  var chartCollection = currentCollection.map(function(img) {
      var doy = img.date().getRelative('day', 'year');
      
      // Calculate mean for specific day
      var histMean = chirps.filterDate(refStart, refEnd)
        .filter(ee.Filter.calendarRange(doy, doy, 'day_of_year'))
        .mean();
      
      // SAFETY CHECK: If histMean is empty, create a 0-value image to prevent "band not found" error
      var histMeanSafe = ee.Image(ee.Algorithms.If(
        histMean.bandNames().size(),
        histMean,
        ee.Image(0).rename('precipitation')
      )).rename('Normal_Historical');

      return img.rename('Actual_Rain').addBands(histMeanSafe);
    });

  var chart = ui.Chart.image.series({
    imageCollection: chartCollection.select(['Actual_Rain', 'Normal_Historical']),
    region: point,
    reducer: ee.Reducer.mean(),
    scale: 5000
  })
  .setSeriesNames(['Actual (' + targetStart.format('YYYY').getInfo() + ')', 'Historical Normal (' + baselineYearsStr + ')'])
  .setOptions({
    title: 'Daily Rainfall: ' + dateRangeStr + '\nLocation: ' + coordsStr,
    vAxis: {title: 'mm/day'},
    hAxis: {title: 'Source: ' + datasetId, titleTextStyle: {fontSize: 10, italic: true}},
    series: {
      0: {color: 'blue', lineWidth: 1, pointSize: 2},
      1: {color: 'red', lineWidth: 1.5, lineDashStyle: [4, 4], pointSize: 0}
    },
    legend: {position: 'bottom'}
  });

  chartHolder.clear();
  chartHolder.add(chart);
  Map.layers().set(1, ui.Map.Layer(point, {color: 'black'}, 'Target Location'));
};

// 5. Interaction
var searchButton = ui.Button({
  label: 'Get Chart for Coordinates',
  onClick: function() {
    var lon = parseFloat(lonInput.getValue());
    var lat = parseFloat(latInput.getValue());
    Map.setCenter(lon, lat, 5); 
    makeChart(lon, lat);
  }
});

mainPanel.add(searchButton);
mainPanel.add(chartHolder);
Map.style().set('cursor', 'crosshair');
Map.onClick(function(coords) {
  makeChart(coords.lon, coords.lat);
});
