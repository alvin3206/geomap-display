import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import chroma from 'chroma-js';
// import fz_data from './Flood_Zones.json';

import './App.css';

// Center coordinate for the map
const center = [-76.045441, 36.745131];
// Starter color for the layers
let color = 12000;

// Component for the fixed sidebar with layer toggle controls
const FixedSidebar = ({ handleLayerToggle, layerToggles, dataSources, infoDisplay }) => {
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
                  color: chroma(layerToggles[layerId].color).alpha(0.25).hex()
                }}>
                  &#9679;
                </small>
              </div>

            </div>
          ))}
      </div>
      <div className="hover-info">
        <h5>Information</h5>
        {infoDisplay && Object.keys(infoDisplay).map(key => (
          <p key={key} className='info-item'>{key} : {infoDisplay[key]}</p>
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
  const [infoDisplay, setInfoDisplay] = useState(null);

  // Mapbox access token from environment variable
  const mapboxAccessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

  // Array of data sources for the map
  let dataSources = [
    {
      id: '0',
      name: 'Aircraft Noise Levels (AICUZ)',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Basemaps/AICUZ/MapServer/3/query?outFields=*&where=1%3D1&f=geojson'
    },
    {
      id: '1',
      name: 'City Property',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Basemaps/Property_Information/MapServer/14/query?outFields=*&where=1%3D1&f=geojson'
    },
    {
      id: '2',
      name: 'Stormwater Drainage Basin',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Public_Works/Stormwater/MapServer/34/query?outFields=*&where=1%3D1&f=geojson'
    },
    // {
    //   id: '',
    //   name: 'Flood Zones',
    //   data: fz_data
    // }
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

      map.on('load', () => {
        // Add the city's boundary
        map.addSource('bound', {
          type: 'geojson',
          data: "https://geo.vbgov.com/mapservices/rest/services/Basemaps/Property_Information/MapServer/18/query?outFields=*&where=1%3D1&f=geojson"
        });

        map.addLayer({
          id: 'bound',
          type: 'line',
          source: 'bound',
          visibility: 'visible',
          layout: {},
          paint: {
            'line-width': 2,
            'line-color': "#000",
            'line-opacity': 0.5
          }
        },
        );

        dataSources.forEach(async (dataSourceInfo) => {
          const { id, url, data } = dataSourceInfo;
          const geojsonData = url ? await fetchGeoJSONData(url) : data;
          map.addSource(id, {
            type: 'geojson',
            data: geojsonData
          });

          const geometries = [...new Set(geojsonData.features.map(feature => feature.geometry.type))];
          geometries.forEach((geometry) => {
            const { type, paint, color } = determineLayerType(geometry);
            const layerId = `${id}-${geometry}`;
            const cvGeometry = geometry.includes("Multi") ? geometry.slice(5) : geometry;

            map.addLayer({
              id: layerId,
              type,
              source: id,
              visibility: 'visible',
              layout: {},
              paint,
              filter: ['==', '$type', cvGeometry]
            },
              // 'label'
            );

            let selectID = null;
            map.on('mousemove', layerId, (event) => {
              map.getCanvas().style.cursor = 'pointer';
              const allProps = event.features[0].properties;

              if (event.features.length === 0) return;
              // Display the properties object in the sidebar
              setInfoDisplay(allProps);

              // feature state for the feature under the mouse
              if (selectID) {
                map.removeFeatureState({
                  source: id,
                  id: selectID
                });
              }

              selectID = event.features[0].id;

              map.setFeatureState(
                {
                  source: id,
                  id: selectID
                },
                {
                  hover: true
                }
              );
            });

            map.on('mouseleave', layerId, () => {
              if (selectID) {
                map.setFeatureState(
                  {
                    source: id,
                    id: selectID
                  },
                  {
                    hover: false
                  }
                );
              }
              selectID = null;
              // Remove the information from the previously hovered feature from the sidebar
              setInfoDisplay(null);
              // Reset the cursor style
              map.getCanvas().style.cursor = '';
            });

            setLayerToggles(prevLayerToggles => ({
              ...prevLayerToggles,
              [layerId]: {
                on: true,
                color
              }
            }));
          });



        });
        setMap(map);
      });

      map.on('styledata', () => {
        for (let [layerId, layerToggle] of Object.entries(layerToggles)) {
          if (!map.getLayer(layerId)) return;
        }
        setLoading(false);
      });
    };

    // Only initialize the map if it has not already been created
    if (!map) {
      initializeMap();
    }
  }, []);

  const fetchGeoJSONData = async (url) => {
    try {
      const response = await fetch(url);
      return response.json();
    } catch (error) {
      console.error(error);
    }
  };

  // Function to get a random color (fixed-seed) for a layer
  const getColor = () => {
    color += 24213;
    return chroma(color % 16777215).hex();
  }

  // Function to determine the layer type, paint properties, and color based on the geometry type
  const determineLayerType = (data) => {
    let type, paint;
    let color = getColor();
    let selectColor = chroma("orangered").hex();
    switch (data) {
      case 'Point':
        type = 'circle';
        paint = {
          'circle-radius': 5,
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            selectColor,
            color
          ]
        };
        break;
      case 'LineString':
        type = 'line';
        paint = {
          'line-width': 2,
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            selectColor,
            color
          ]
        };
        break;
      case 'Polygon':
        type = 'fill';
        paint = {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            selectColor,
            color
          ],
          'fill-opacity': 0.25
        };
        break;
      case 'MultiPoint':
        type = 'circle';
        paint = {
          'circle-radius': 5,
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            selectColor,
            color
          ]
        };
        break;
      case 'MultiLineString':
        type = 'line';
        paint = {
          'line-width': 2,
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            selectColor,
            color
          ]
        };
        break;
      case 'MultiPolygon':
        type = 'fill';
        paint = {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            selectColor,
            color
          ],
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
          <FixedSidebar handleLayerToggle={handleLayerToggle} layerToggles={layerToggles} dataSources={dataSources} infoDisplay={infoDisplay} />
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