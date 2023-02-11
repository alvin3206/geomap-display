import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import chroma from 'chroma-js';

import './App.css';

const center = [-76.045441, 36.745131];

const FixedSidebar = ({ handleLayerToggle, layerToggles, recenterMap }) => {
  return (
    <div className="fixed-sidebar">
      <div className="layer-control">
        <h3>Layers Control:</h3>
        {Object.keys(layerToggles).map(layerId => (
          <div key={layerId}>
            <input
              type="checkbox"
              checked={layerToggles[layerId]}
              onChange={() => handleLayerToggle(layerId)}
            />
            {layerId}
          </div>
        ))}
        <button onClick={recenterMap}>Recenter</button>
      </div>
    </div>
  );
};

const App = () => {
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState(null);
  const [layerToggles, setLayerToggles] = useState({});
  const mapboxAccessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  let dataSources = [
    {
      id: 'dataSource1',
      name: 'Noise Zone Outline (AICUZ)',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Basemaps/AICUZ/MapServer/0/query?outFields=*&where=1%3D1&f=geojson'
    },
    {
      id: 'dataSource2',
      name: 'Road Surfaces',
      url: 'https://geo.vbgov.com/mapservices/rest/services/Basemaps/Structures_and_Physical_Features/MapServer/11/query?outFields=*&where=1%3D1&f=geojson'
    }
  ];

  useEffect(() => {
    mapboxgl.accessToken = mapboxAccessToken;

    const initializeMap = () => {

      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: 10
      });

      map.on('load', () => {
        setMap(map);
        dataSources.forEach(async (dataSourceInfo, index) => {
          const { id, url } = dataSourceInfo;

          fetch(url)
            .then(response => {
              return response.json();
            })
            .then(data => {
              // Add a data source containing the GeoJSON data.
              map.addSource(id, {
                'type': 'geojson',
                'data': url
              });
              const { type, paint } = determineLayerType(data.features[0].geometry);
              // Add a new layer to visualize the polygon.
              map.addLayer({
                'id': id,
                'type': type,
                'source': id, // reference the data source
                'visibility': 'visible',
                'layout': {},
                'paint': paint
              });
              setLayerToggles(prevLayerToggles => ({
                ...prevLayerToggles,
                [dataSourceInfo.id]: true
              }));
            })
            .catch(error => {
              console.error(error);
            });
        });
      });
    };

    if (!map) {
      initializeMap();
    }
  }, [map]);

  const getColor = (index) => {
    return chroma.random(index).hex();
  }

  const determineLayerType = (data) => {
    let type, paint;
    if (data.type === 'Point') {
      type = 'circle';
      paint = {
        'circle-radius': 5,
        'circle-color': getColor()
      };
    } else if (data.type === 'LineString') {
      type = 'line';
      paint = {
        'line-width': 2,
        'line-color': getColor()
      };
    } else if (data.type === 'Polygon') {
      type = 'fill';
      paint = {
        'fill-color': getColor(),
        'fill-opacity': 0.5
      };
    } else if (data.type === 'MultiPoint') {
      type = 'circle';
      paint = {
        'circle-radius': 5,
        'circle-color': getColor()
      };
    } else if (data.type === 'MultiLineString') {
      type = 'line';
      paint = {
        'line-width': 2,
        'line-color': getColor()
      };
    } else if (data.type === 'MultiPolygon') {
      type = 'fill';
      paint = {
        'fill-color': getColor(),
        'fill-opacity': 0.5
      };
    }
    return { type, paint };
  };

  const handleLayerToggle = id => {
    if (!map) return;
    setLayerToggles(prevLayerToggles => {
      const newLayerToggles = { ...prevLayerToggles, [id]: !prevLayerToggles[id] };
      if (newLayerToggles[id]) {
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
      return newLayerToggles;
    });
  };

  const recenterMap = () => {
    if (!map) return;
    map.setCenter([-76.045441, 36.745131]);
    map.setZoom(10);
  };

  return (
    <div>
      <div className="loading-screen">
      </div>
      <div id="map" />
      <FixedSidebar handleLayerToggle={handleLayerToggle} layerToggles={layerToggles} recenterMap={recenterMap} />
    </div>
  );
};
export default App;