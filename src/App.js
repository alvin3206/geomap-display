import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import chroma from 'chroma-js';

import './App.css';

// Center coordinate for the map
const center = [-76.045441, 36.745131];
// Starter color for the layers
let color = 12000;

// Component for the fixed sidebar with layer toggle controls
const FixedSidebar = ({ handleLayerToggle, layerToggles, dataSources }) => {
  return (
    <div className="fixed-sidebar">
      <div className="layer-control">
        <h3>Layers Control</h3>
        {
          // Iterate over the layerToggles object and render a toggle control for each layer
          Object.keys(layerToggles).map(layerId => (
            <div key={layerId} className="layer-item">
              <div>
                <input
                  type="checkbox"
                  checked={layerToggles[layerId].on}
                  onChange={() => handleLayerToggle(layerId)}
                />
                {
                  // Title of each layer item
                  dataSources.find(dataSource => layerId.includes(dataSource.id)).name
                }
                <small style={{
                  color: layerToggles[layerId].color
                }}>
                  {layerId.slice('dataSource1'.length)}
                </small>
              </div>

            </div>
          ))}
      </div>
    </div>
  );
};

const App = () => {
  // State variables for loading status, map instance, and layer visibility
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [layerToggles, setLayerToggles] = useState({});

  // Mapbox access token from environment variable
  const mapboxAccessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

  // Array of data sources for the map
  let dataSources = [
    {
      id: 'dataSource1',
      name: 'City Boundary',
      url: "https://geo.vbgov.com/mapservices/rest/services/Basemaps/Property_Information/MapServer/18/query?outFields=*&where=1%3D1&f=geojson"
    },
    {
      id: 'dataSource2',
      name: 'Aircraft Noise Levels (AICUZ)',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Basemaps/AICUZ/MapServer/3/query?outFields=*&where=1%3D1&f=geojson'
    },
    {
      id: 'dataSource3',
      name: 'Road Surfaces',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Basemaps/Structures_and_Physical_Features/MapServer/11/query?outFields=*&where=1%3D1&f=geojson'
    }
  ];

  useEffect(() => {
    setLoading(true);

    // Set the mapbox access token
    mapboxgl.accessToken = mapboxAccessToken;

    const initializeMap = () => {
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: 10
      });

      // Event handler for when the map is finished loading
      map.on('load', () => {
        dataSources.forEach(async (dataSourceInfo, index) => {
          const { id, url } = dataSourceInfo;

          await fetch(url)
            .then(response => response.json())
            .then(data => {
              // Add a data source containing the GeoJSON data.
              map.addSource(id, {
                'type': 'geojson',
                'data': url
              });

              // Get a unique list of geometry types in the data
              const geometries = [...new Set(data.features.map(e => e.geometry.type))];
              geometries.forEach((geometry, i) => {
                // Determine the layer type and paint properties based on the geometry type
                const { type, paint, color } = determineLayerType(geometry);
                let cvGeometry = geometry;
                if (geometry.includes("Multi")) cvGeometry = geometry.slice(5);
                map.addLayer({
                  'id': id + '-' + geometry,
                  'type': type,
                  'source': id, // reference the data source
                  'visibility': 'visible',
                  'layout': {},
                  'paint': paint,
                  'filter': ['==', '$type', cvGeometry]
                },
                  // 'label'
                );

                // Update the layerToggles state to include the new layer
                setLayerToggles(prevLayerToggles => ({
                  ...prevLayerToggles,
                  [id + '-' + geometry]: {
                    on: true,
                    color: color
                  }
                }));
              });
            })
            .catch(error => {
              console.error(error);
            });
        });
        setMap(map);
      });

      // Event handler for when the map's style data has finished loading
      map.on('styledata', () => {
        // Check if all layers in the map are loaded
        for (let layerToggle of Object.entries(layerToggles)) {
          if (!map.getLayer(layerToggle.id)) return;
        }
        // If all of the layers are present, set loading to false
        setLoading(false);
      });
    };

    // Only initialize the map if it has not already been created
    if (!map) {
      initializeMap();
    }
  }, []);

  // Function to get a random color (fixed-seed) for a layer
  const getColor = () => {
    color += 24213;
    return chroma(color % 16777215).hex();
  }

  // Function to determine the layer type, paint properties, and color based on the geometry type
  const determineLayerType = (data) => {
    let type, paint;
    let color = getColor();
    switch (data) {
      case 'Point':
        type = 'circle';
        paint = {
          'circle-radius': 5,
          'circle-color': color
        };
        break;
      case 'LineString':
        type = 'line';
        paint = {
          'line-width': 2,
          'line-color': color
        };
        break;
      case 'Polygon':
        type = 'fill';
        paint = {
          'fill-color': color,
          'fill-opacity': 0.25
        };
        break;
      case 'MultiPoint':
        type = 'circle';
        paint = {
          'circle-radius': 5,
          'circle-color': color
        };
        break;
      case 'MultiLineString':
        type = 'line';
        paint = {
          'line-width': 2,
          'line-color': color
        };
        break;
      case 'MultiPolygon':
        type = 'fill';
        paint = {
          'fill-color': color,
          'fill-opacity': 0.25,
        };
        break;
      default:
        console.error(`Unsupported data type: ${data}`);
        return {};
    }
    return { type, paint, color };
  };

  // Function to handle layer toggle events
  const handleLayerToggle = id => {
    // If the map has not been created yet, do nothing
    if (!map) return;
    // Update the layerToggles state with the new toggle state
    setLayerToggles(prevLayerToggles => {
      const newLayerToggles = { ...prevLayerToggles, [id]: { ...prevLayerToggles[id], on: !prevLayerToggles[id].on } };
      // Update the visibility of the corresponding layer in the map based on the toggle state
      if (newLayerToggles[id].on) {
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
      return newLayerToggles;
    });
  };

  const recenterMap = () => {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(10);
  };

  return (
    <div>
      <div id="map" />
      {!loading && (
        <div>
          <button className="recenter-btn" onClick={recenterMap}>Recenter</button>
          <FixedSidebar handleLayerToggle={handleLayerToggle} layerToggles={layerToggles} dataSources={dataSources} />
        </div>
      )}

      {loading && (
        <div className="loading-screen">
        </div>
      )}
    </div>
  );
};
export default App;