import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import chroma from 'chroma-js';

import './App.css';

const center = [-76.045441, 36.745131];
let color = 12000;

const FixedSidebar = ({ handleLayerToggle, layerToggles, dataSources }) => {
  return (
    <div className="fixed-sidebar">
      <div className="layer-control">
        <h3>Layers Control</h3>
        {Object.keys(layerToggles).map(layerId => (
          <div key={layerId} className="layer-item">
            <div>
              <input
                type="checkbox"
                checked={layerToggles[layerId].on}
                onChange={() => handleLayerToggle(layerId)}
              />
              {dataSources.find(dataSource => layerId.includes(dataSource.id)).name}
            </div>
            <small style={{
              color: layerToggles[layerId].color
            }}>
              {layerId.slice('dataSource1'.length)}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [layerToggles, setLayerToggles] = useState({});
  const mapboxAccessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
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
    mapboxgl.accessToken = mapboxAccessToken;
    const initializeMap = () => {
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: 10
      });

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
              const geometries = [...new Set(data.features.map(e => e.geometry.type))];
              geometries.forEach((geometry, i) => {
                const { type, paint, color } = determineLayerType(data.features[0].geometry);
                map.addLayer({
                  'id': id + '-' + geometry,
                  'type': type,
                  'source': id, // reference the data source
                  'visibility': 'visible',
                  'layout': {},
                  'paint': paint
                },
                  // 'label'
                );
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

      map.on('styledata', () => {
        for (let layerToggle of Object.entries(layerToggles)) {
          if (!map.getLayer(layerToggle.id)) return;
        }
        setLoading(false);
      });
    };


    if (!map) {
      initializeMap();
    }
  }, []);

  const getColor = () => {
    color += 24213;
    return chroma(color % 16777215).hex();
  }

  const determineLayerType = (data) => {
    let type, paint;
    let color = getColor();
    switch (data.type) {
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
        console.error(`Unsupported data type: ${data.type}`);
        return {};
    }
    return { type, paint, color };
  };


  const handleLayerToggle = id => {
    if (!map) return;
    setLayerToggles(prevLayerToggles => {
      const newLayerToggles = { ...prevLayerToggles, [id]: {...prevLayerToggles[id], on: !prevLayerToggles[id].on} };
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