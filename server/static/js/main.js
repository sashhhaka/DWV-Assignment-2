// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ThreeGlobe from 'three-globe';

// Global variables for storing state
let points = [];
const MAX_POINTS = 1000; // Limit on the number of points to prevent WebGL issues
const POINT_LIFETIME = 30000;
let globe, renderer, scene, camera, controls;

// Scene initialization
function initScene() {
  // Create scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.z = 250;

  // Container for the globe
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.width = '100%';
  container.style.height = '100%';
  document.body.appendChild(container);

  // Create renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
  } catch (e) {
    console.error("WebGL initialization error:", e);
    const errorMsg = document.createElement('div');
    errorMsg.style.color = 'red';
    errorMsg.style.position = 'absolute';
    errorMsg.style.top = '50%';
    errorMsg.style.width = '100%';
    errorMsg.style.textAlign = 'center';
    errorMsg.innerHTML = '<h1>WebGL Error</h1><p>Your browser does not support WebGL or an initialization error occurred.</p>';
    container.appendChild(errorMsg);
    return false;
  }

  // Add lighting
  scene.add(new THREE.AmbientLight(0xbbbbbb));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(0, 0, 1);
  scene.add(directionalLight);

  // Setup OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Add window resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return true;
}

// Globe initialization
function initGlobe() {
  globe = new ThreeGlobe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    // .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .pointsData([])
    .pointAltitude(0.01)
    .pointColor(d => d.suspicious ? 'red' : 'lime')
    .pointRadius(0.4)
    .pointsMerge(false);

  scene.add(globe);

  // Create control panel and information
  createUI();
}

// Create user interface
function createUI() {
  // Create container for UI elements
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '10px';
  ui.style.right = '10px';
  ui.style.width = '300px';
  ui.style.color = 'white';
  ui.style.fontFamily = 'Arial, sans-serif';
  ui.style.fontSize = '14px';
  ui.style.backgroundColor = 'rgba(0,0,0,0.7)';
  ui.style.padding = '10px';
  ui.style.borderRadius = '5px';
  ui.style.zIndex = '1000';

  // Event handlers for UI elements
  document.getElementById('rotateToggle').addEventListener('change', (e) => {
    controls.autoRotate = e.target.checked;
  });

  document.getElementById('pointLifetime').addEventListener('input', (e) => {
    const newLifetime = parseInt(e.target.value) * 1000;
    document.getElementById('lifetimeValue').innerText = `${e.target.value} sec`;
  });

  document.getElementById('maxPoints').addEventListener('input', (e) => {
    const newMaxPoints = parseInt(e.target.value);
    document.getElementById('maxPointsValue').innerText = `${newMaxPoints} points`;
  });
}

// Update points on the globe
function updatePoints(newData) {
  const timestamp = Date.now();
  const maxPoints = parseInt(document.getElementById('maxPoints')?.value || MAX_POINTS);
  const lifetime = parseInt(document.getElementById('pointLifetime')?.value * 1000 || POINT_LIFETIME);

  // Convert data from server to format understandable by the globe
  const taggedData = newData.map(d => ({
    lat: d.latitude,
    lng: d.longitude,
    ip: d.ip,
    suspicious: d.suspicious || false,
    timestamp
  }));

  // Add new points and remove old ones
  points = [...points, ...taggedData]
    .filter(p => (timestamp - p.timestamp) <= lifetime)
    .slice(-maxPoints); // Limit the number of points

  // Update globe
  globe.pointsData(points);

  // Update statistics
  updateStats();
  updateLocationsList();
}

// Update statistics
function updateStats() {
  if (!document.getElementById('totalPoints')) return;

  const total = points.length;
  const suspicious = points.filter(p => p.suspicious).length;
  const normal = total - suspicious;

  document.getElementById('totalPoints').innerText = total;
  document.getElementById('normalPoints').innerText = normal;
  document.getElementById('suspiciousPoints').innerText = suspicious;
}

// Update list of active locations
function updateLocationsList() {
  if (!document.getElementById('locationsList')) return;

  // Group points by locations (rounded coordinates)
  const locations = {};
  points.forEach(p => {
    // Round coordinates to group nearby points
    const key = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;

    if (!locations[key]) {
      locations[key] = {
        lat: p.lat,
        lng: p.lng,
        count: 0,
        suspicious: 0
      };
    }

    locations[key].count++;
    if (p.suspicious) locations[key].suspicious++;
  });

  // Sort locations by number of points
  const sortedLocations = Object.values(locations)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Update list
  const list = document.getElementById('locationsList');
  if (sortedLocations.length === 0) {
    list.innerHTML = '<li>No active locations</li>';
    return;
  }

  list.innerHTML = sortedLocations.map(loc => {
    const suspiciousClass = loc.suspicious > 0 ? 'style="color:red"' : '';
    return `<li style="margin-bottom:5px;cursor:pointer" onclick="focusLocation(${loc.lat}, ${loc.lng})">
      ${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)} -
      <span ${suspiciousClass}>${loc.count} points${loc.suspicious > 0 ? ` (${loc.suspicious} suspicious.)` : ''}</span>
    </li>`;
  }).join('');
}

// Function to focus camera on a location
window.focusLocation = function(lat, lng) {
  const distanceFromCenter = 1.5;
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;

  const x = distanceFromCenter * Math.sin(phi) * Math.cos(theta);
  const y = distanceFromCenter * Math.cos(phi);
  const z = distanceFromCenter * Math.sin(phi) * Math.sin(theta);

  // Smooth camera animation to selected point
  const duration = 1000; // ms
  const start = Date.now();
  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(x, y, z).multiplyScalar(200);

  function animateCamera() {
    const now = Date.now();
    const progress = Math.min(1, (now - start) / duration);

    // Smooth movement
    camera.position.lerpVectors(startPos, endPos, progress);
    camera.lookAt(0, 0, 0);

    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    }
  }

  animateCamera();
};

// Get data from server
async function fetchData() {
  try {
    const response = await fetch('/data');
    const data = await response.json();

    if (data && data.length > 0) {
      updatePoints(data);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Animation function
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// Application initialization
function init() {
  if (initScene()) {
    initGlobe();
    animate();

    // Start polling the server
    fetchData();
    setInterval(fetchData, 2000);
  }
}

// Launch application after page loads
document.addEventListener('DOMContentLoaded', init);