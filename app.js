// Главное приложение
class GISApp {
    constructor() {
        this.plants = PLANTS_DATA;
        this.projects = PROJECTS_DATA;
        this.filteredProjects = [...this.projects];
        this.map = null;
        this.placemarks = [];
        this.init();
    }

    init() {
        this.loadPlantsFilter();
        this.updateStatistics();
        this.displayProjects();
        this.setupEventListeners();
        this.initYandexMap();
    }

    // Инициализация Яндекс.Карт
    initYandexMap() {
        if (!ymaps) {
            console.error('Yandex Maps API не загружен');
            this.showMapFallback();
            return;
        }

        ymaps.ready(() => {
            try {
                // Создаем карту с центром на России
                this.map = new ymaps.Map('map', {
                    center: [55.76, 37.64], // Москва
                    zoom: 4,
                    controls: ['zoomControl', 'fullscreenControl']
                });

                // Добавляем метки заводов
                this.addPlantPlacemarks();

                // Добавляем обработчики событий для меток
                this.setupMapEvents();
            } catch (error) {
                console.error('Ошибка инициализации карты:', error);
                this.showMapFallback();
            }
        });
    }

    // Запасной вариант если карта не работает
    showMapFallback() {
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; background: #f0f0f0; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div style="font-size: 48px;">🗺️</div>
                <h3>Карта заводов ЦЕМРОС</h3>
                <div style="margin-top: 20px; text-align: left;">
                    ${this.plants.map(plant => `
                        <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 8px;">
                            <strong>📍 ${plant.name}</strong><br>
                            <small>${plant.city} • ${plant.projects_count} проектов</small>
                        </div>
                    `).join('')}
                </div>
                <p style="margin-top: 20px; color: #666;"><em>Для отображения карты необходим API-ключ Яндекс.Карт</em></p>
            </div>
        `;
    }

    // Добавление меток заводов на карту
    addPlantPlacemarks() {
        this.placemarks = [];

        this.plants.forEach(plant => {
            // Создаем содержимое балуна
            const balloonContent = `
                <div style="padding: 10px; max-width: 250px;">
                    <h3 style="margin: 0 0 10px 0; color: #2E7D32;">${plant.name}</h3>
                    <p style="margin: 5px 0;"><strong>Город:</strong> ${plant.city}</p>
                    <p style="margin: 5px 0;"><strong>Год основания:</strong> ${plant.foundation_year}</p>
                    <p style="margin: 5px 0;"><strong>Проектов:</strong> ${plant.projects_count}</p>
                    <div style="margin-top: 10px;">
                        <button onclick="gisApp.filterByPlant(${plant.id})" 
                                style="background: #2E7D32; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                            Показать проекты
                        </button>
                    </div>
                </div>
            `;

            // Создаем метку
            const placemark = new ymaps.Placemark(
                [plant.lat, plant.lon],
                {
                    balloonContent: balloonContent,
                    hintContent: plant.name
                },
                {
                    preset: 'islands#greenIcon',
                    balloonCloseButton: true,
                    hideIconOnBalloonOpen: false
                }
            );

            this.placemarks.push(placemark);
            this.map.geoObjects.add(placemark);
        });
    }

    // Настройка событий карты
    setupMapEvents() {
        // При клике на метку фильтруем проекты
        this.placemarks.forEach((placemark, index) => {
            placemark.events.add('click', () => {
                const plantId = this.plants[index].id;
                this.filterByPlant(plantId);
            });
        });
    }

    // Фильтрация по заводу
    filterByPlant(plantId) {
        document.getElementById('plantFilter').value = plantId;
        this.applyFilters();
        
        // Прокручиваем к списку проектов
        document.querySelector('.projects-container').scrollIntoView({
            behavior: 'smooth'
        });
    }

    // Загрузка фильтра заводов
    loadPlantsFilter() {
        const plantFilter = document.getElementById('plantFilter');
        plantFilter.innerHTML = '<option value="">Все заводы</option>';
        
        this.plants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant.id;
            option.textContent = plant.name;
            plantFilter.appendChild(option);
        });
    }

    // Обновление статистики
    updateStatistics() {
        const totalProjects = this.projects.length;
        const activePlants = new Set(this.projects.map(p => p.plant_id)).size;
        const completedProjects = this.projects.filter(p => p.status === 'completed').length;
        const inProgress = this.projects.filter(p => p.status === 'active').length;

        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('activePlants').textContent = activePlants;
        document.getElementById('completedProjects').textContent = completedProjects;
        document.getElementById('inProgress').textContent = inProgress;
    }

    // Отображение проектов
    displayProjects() {
        const container = document.getElementById('projectsContainer');
        container.innerHTML = '';

        if (this.filteredProjects.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px;">🔍</div>
                    <h3>Проекты не найдены</h3>
                    <p>Попробуйте изменить параметры фильтрации</p>
                </div>
            `;
            return;
        }

        this.filteredProjects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            container.appendChild(projectCard);
        });
    }

    // Создание карточки проекта
    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        const statusClass = `project-status status-${project.status}`;
        
        card.innerHTML = `
            <div class="project-header">
                <div class="project-name">${project.name}</div>
                <div class="${statusClass}">${project.status_text}</div>
            </div>
            
            <div class="project-meta">
                <div>🏭 ${project.plant_name}</div>
                <div>🎯 ${project.direction}</div>
                <div>📅 ${project.created_date}</div>
            </div>
            
            <div style="margin: 8px 0;">
                <strong>👤 Инициатор:</strong> ${project.initiator}<br>
                <strong>👨‍💼 Руководитель:</strong> ${project.leader}
            </div>
            
            <div class="project-goals">
                <strong>🎯 Цели:</strong> ${project.goals}
            </div>
            
            <div style="margin-top: 10px; font-size: 13px; color: #666;">
                ${project.description}
            </div>
            
            <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span><strong>💰 Бюджет:</strong> ${project.budget}</span>
                <button onclick="viewProjectPassport(${project.id})" 
                        style="padding: 6px 12px; background: #2E7D32; color: white; border: none; border-radius: 6px; font-size: 12px;">
                    📄 Паспорт
                </button>
            </div>
        `;
        
        return card;
    }

    // Применение фильтров
    applyFilters() {
        const plantId = document.getElementById('plantFilter').value;
        const direction = document.getElementById('directionFilter').value;
        const searchText = document.getElementById('searchInput').value.toLowerCase();

        this.filteredProjects = this.projects.filter(project => {
            const matchesPlant = !plantId || project.plant_id == plantId;
            const matchesDirection = !direction || project.direction === direction;
            const matchesSearch = !searchText || 
                project.name.toLowerCase().includes(searchText) ||
                project.initiator.toLowerCase().includes(searchText) ||
                project.leader.toLowerCase().includes(searchText) ||
                project.goals.toLowerCase().includes(searchText);

            return matchesPlant && matchesDirection && matchesSearch;
        });

        this.displayProjects();
        
        // Подсвечиваем активные метки на карте
        this.highlightActivePlants();
    }

    // Подсветка активных заводов на карте
    highlightActivePlants() {
        const plantId = document.getElementById('plantFilter').value;
        
        if (this.placemarks && this.placemarks.length > 0) {
            this.placemarks.forEach((placemark, index) => {
                const plant = this.plants[index];
                
                if (!plantId || plant.id == plantId) {
                    // Активный завод - зеленый
                    placemark.options.set('preset', 'islands#greenIcon');
                } else {
                    // Неактивный завод - серый
                    placemark.options.set('preset', 'islands#grayIcon');
                }
            });
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        document.getElementById('plantFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('directionFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('searchInput').addEventListener('input', () => this.applyFilters());
    }
}

// Глобальные функции
function resetFilters() {
    document.getElementById('plantFilter').value = '';
    document.getElementById('directionFilter').value = '';
    document.getElementById('searchInput').value = '';
    gisApp.applyFilters();
}

function viewProjectPassport(projectId) {
    const project = gisApp.projects.find(p => p.id === projectId);
    if (project) {
        alert(`📄 Паспорт проекта: ${project.name}\n\n🏭 Завод: ${project.plant_name}\n👤 Инициатор: ${project.initiator}\n👨‍💼 Руководитель: ${project.leader}\n🎯 Направление: ${project.direction}\n📊 Статус: ${project.status_text}\n💰 Бюджет: ${project.budget}\n\n📋 Описание: ${project.description}\n\nВ реальном приложении здесь откроется PDF файл.`);
    }
}

// Запуск приложения когда страница загружена
let gisApp;
document.addEventListener('DOMContentLoaded', function() {
    gisApp = new GISApp();
});