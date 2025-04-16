// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ThreeGlobe from 'three-globe';

// Глобальные переменные для хранения состояния
let points = [];
const MAX_POINTS = 1000; // Ограничение на количество точек для предотвращения проблем с WebGL
const POINT_LIFETIME = 30000; // Время жизни точки (30 секунд)
let globe, renderer, scene, camera, controls;

// Инициализация сцены
function initScene() {
  // Создание сцены
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.z = 250;

  // Контейнер для глобуса
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.width = '100%';
  container.style.height = '100%';
  document.body.appendChild(container);

  // Создание рендерера
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
  } catch (e) {
    console.error("Ошибка инициализации WebGL:", e);
    const errorMsg = document.createElement('div');
    errorMsg.style.color = 'red';
    errorMsg.style.position = 'absolute';
    errorMsg.style.top = '50%';
    errorMsg.style.width = '100%';
    errorMsg.style.textAlign = 'center';
    errorMsg.innerHTML = '<h1>Ошибка WebGL</h1><p>Ваш браузер не поддерживает WebGL или произошла ошибка инициализации.</p>';
    container.appendChild(errorMsg);
    return false;
  }

  // Добавление освещения
  scene.add(new THREE.AmbientLight(0xbbbbbb));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(0, 0, 1);
  scene.add(directionalLight);

  // Настройка OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Добавление обработчика изменения размера окна
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return true;
}

// Инициализация глобуса
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

  // Добавление фона
  // const loader = new THREE.TextureLoader();
  // loader.load('//unpkg.com/three-globe/example/img/night-sky.png', texture => {
  //   scene.background = texture;
  // });

  // Создаём панель управления и информации
  createUI();
}

// Создание пользовательского интерфейса
function createUI() {
  // Создаем контейнер для UI элементов
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

  // Добавляем заголовок
  ui.innerHTML = `
    <h2 style="margin-top:0;text-align:center">Настройки визуализации</h2>
    
    <div>
      <label for="rotateToggle">Автоматическое вращение:</label>
      <input type="checkbox" id="rotateToggle" checked>
    </div>
    
    <div style="margin-top:10px">
      <label for="pointLifetime">Время жизни точки (сек):</label>
      <input type="range" id="pointLifetime" min="5" max="60" value="${POINT_LIFETIME/1000}" style="width:100%">
      <div id="lifetimeValue">${POINT_LIFETIME/1000} сек</div>
    </div>
    
    <div style="margin-top:10px">
      <label for="maxPoints">Макс. кол-во точек:</label>
      <input type="range" id="maxPoints" min="100" max="2000" value="${MAX_POINTS}" style="width:100%">
      <div id="maxPointsValue">${MAX_POINTS} точек</div>
    </div>
    
    <h3>Статистика</h3>
    <div id="stats" style="display:flex;justify-content:space-between">
      <div>
        <div>Всего точек:</div>
        <div id="totalPoints">0</div>
      </div>
      <div>
        <div>Обычные:</div>
        <div id="normalPoints">0</div>
      </div>
      <div>
        <div>Подозрительные:</div>
        <div id="suspiciousPoints">0</div>
      </div>
    </div>
    
    <h3>Активные локации</h3>
    <ul id="locationsList" style="max-height:200px;overflow-y:auto;padding-left:20px;list-style-type:none">
      <li>Загрузка данных...</li>
    </ul>
  `;
  document.body.appendChild(ui);

  // Обработчики событий для UI элементов
  document.getElementById('rotateToggle').addEventListener('change', (e) => {
    controls.autoRotate = e.target.checked;
  });

  document.getElementById('pointLifetime').addEventListener('input', (e) => {
    const newLifetime = parseInt(e.target.value) * 1000;
    document.getElementById('lifetimeValue').innerText = `${e.target.value} сек`;
  });

  document.getElementById('maxPoints').addEventListener('input', (e) => {
    const newMaxPoints = parseInt(e.target.value);
    document.getElementById('maxPointsValue').innerText = `${newMaxPoints} точек`;
  });
}

// Обновление точек на глобусе
function updatePoints(newData) {
  const timestamp = Date.now();
  const maxPoints = parseInt(document.getElementById('maxPoints')?.value || MAX_POINTS);
  const lifetime = parseInt(document.getElementById('pointLifetime')?.value * 1000 || POINT_LIFETIME);

  // Преобразование данных с сервера в формат, понятный для глобуса
  const taggedData = newData.map(d => ({
    lat: d.latitude,  // Используем правильные имена полей
    lng: d.longitude, // Используем правильные имена полей
    ip: d.ip,
    suspicious: d.suspicious || false,
    timestamp
  }));

  // Добавляем новые точки и удаляем старые
  points = [...points, ...taggedData]
    .filter(p => (timestamp - p.timestamp) <= lifetime)
    .slice(-maxPoints); // Ограничиваем количество точек

  // Обновляем глобус
  globe.pointsData(points);

  // Обновляем статистику
  updateStats();
  updateLocationsList();
}

// Обновление статистики
function updateStats() {
  if (!document.getElementById('totalPoints')) return;

  const total = points.length;
  const suspicious = points.filter(p => p.suspicious).length;
  const normal = total - suspicious;

  document.getElementById('totalPoints').innerText = total;
  document.getElementById('normalPoints').innerText = normal;
  document.getElementById('suspiciousPoints').innerText = suspicious;
}

// Обновление списка активных локаций
function updateLocationsList() {
  if (!document.getElementById('locationsList')) return;

  // Группируем точки по локациям (округленным координатам)
  const locations = {};
  points.forEach(p => {
    // Округляем координаты для группировки близких точек
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

  // Сортируем локации по количеству точек
  const sortedLocations = Object.values(locations)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Обновляем список
  const list = document.getElementById('locationsList');
  if (sortedLocations.length === 0) {
    list.innerHTML = '<li>Нет активных локаций</li>';
    return;
  }

  list.innerHTML = sortedLocations.map(loc => {
    const suspiciousClass = loc.suspicious > 0 ? 'style="color:red"' : '';
    return `<li style="margin-bottom:5px;cursor:pointer" onclick="focusLocation(${loc.lat}, ${loc.lng})">
      ${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)} - 
      <span ${suspiciousClass}>${loc.count} точек${loc.suspicious > 0 ? ` (${loc.suspicious} подозр.)` : ''}</span>
    </li>`;
  }).join('');
}

// Функция для фокусировки камеры на локации
window.focusLocation = function(lat, lng) {
  const distanceFromCenter = 1.5;
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;

  const x = distanceFromCenter * Math.sin(phi) * Math.cos(theta);
  const y = distanceFromCenter * Math.cos(phi);
  const z = distanceFromCenter * Math.sin(phi) * Math.sin(theta);

  // Плавная анимация камеры к выбранной точке
  const duration = 1000; // мс
  const start = Date.now();
  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(x, y, z).multiplyScalar(200);

  function animateCamera() {
    const now = Date.now();
    const progress = Math.min(1, (now - start) / duration);

    // Плавное перемещение
    camera.position.lerpVectors(startPos, endPos, progress);
    camera.lookAt(0, 0, 0);

    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    }
  }

  animateCamera();
};

// Получение данных с сервера
async function fetchData() {
  try {
    const response = await fetch('/data');
    const data = await response.json();

    if (data && data.length > 0) {
      updatePoints(data);
    }
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
  }
}

// Функция анимации
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// Инициализация приложения
function init() {
  if (initScene()) {
    initGlobe();
    animate();

    // Начинаем опрос сервера
    fetchData();
    setInterval(fetchData, 2000);
  }
}

// Запускаем приложение после загрузки страницы
document.addEventListener('DOMContentLoaded', init);