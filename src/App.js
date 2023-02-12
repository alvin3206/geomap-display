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
          <div key={layerId}>
            <input
              type="checkbox"
              checked={layerToggles[layerId]}
              onChange={() => handleLayerToggle(layerId)}
            />
            {dataSources.find(dataSource => dataSource.id === layerId).name}
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
    console.log("loading");
    const initializeMap = () => {
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: 10
      });

      map.on('load', () => {
        console.log('load');
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
              const { type, paint } = determineLayerType(data.features[0].geometry);
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
        setMap(map);
      });

      map.on('styledata', () => {
        for (let index = 0; index < dataSources.length; index++) {
          if (!map.getLayer(dataSources[index].id)) return;
        }
        console.log("finished loading");
        console.log(map);
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
    switch (data.type) {
      case 'Point':
        type = 'circle';
        paint = {
          'circle-radius': 5,
          'circle-color': getColor()
        };
        break;
      case 'LineString':
        type = 'line';
        paint = {
          'line-width': 2,
          'line-color': getColor()
        };
        break;
      case 'Polygon':
        type = 'fill';
        paint = {
          'fill-color': getColor(),
          'fill-opacity': 0.25
        };
        break;
      case 'MultiPoint':
        type = 'circle';
        paint = {
          'circle-radius': 5,
          'circle-color': getColor()
        };
        break;
      case 'MultiLineString':
        type = 'line';
        paint = {
          'line-width': 2,
          'line-color': getColor()
        };
        break;
      case 'MultiPolygon':
        type = 'fill';
        paint = {
          'fill-color': getColor(),
          'fill-opacity': 0.25,
        };
        break;
      default:
        console.error(`Unsupported data type: ${data.type}`);
        return {};
    }
    return { type, paint };
  };


  const handleLayerToggle = id => {
    if (!map) return;
    console.log('toggle');
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
    console.log('button');
    map.setCenter(center);
    // map.setView(center);
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