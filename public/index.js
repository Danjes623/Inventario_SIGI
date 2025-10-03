// ===============================
// SISTEMA DE AUTENTICACIÓN CON BACKEND
// ===============================
class AuthSystem {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('stocklens_currentUser')) || null;
        this.rememberMe = localStorage.getItem('stocklens_rememberMe') === 'true';
    }

    async register(userData) {
        try {
            console.log('Registrando usuario:', userData);
            
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en el registro');
            }

            this.currentUser = data.user;
            localStorage.setItem('stocklens_currentUser', JSON.stringify(data.user));
            
            return data.user;
        } catch (error) {
            console.error('Error en registro:', error);
            throw new Error(error.message);
        }
    }

    async login(email, password) {
        try {
            console.log('Iniciando sesión:', email);
            
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en el login');
            }

            this.currentUser = data.user;
            localStorage.setItem('stocklens_currentUser', JSON.stringify(data.user));
            
            return data.user;
        } catch (error) {
            console.error('Error en login:', error);
            throw new Error(error.message);
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('stocklens_currentUser');
        if (!this.rememberMe) {
            localStorage.removeItem('stocklens_rememberMe');
            localStorage.removeItem('stocklens_savedUser');
        }
    }

    async resetPassword(email) {
        return true;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    setRememberMe(value) {
        this.rememberMe = value;
        localStorage.setItem('stocklens_rememberMe', value.toString());
    }

    async updateProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('No hay usuario logueado');
            }

            console.log('Actualizando perfil:', this.currentUser.id);
            
            const response = await fetch(`${API_BASE}/auth/profile/${this.currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar el perfil');
            }

            this.currentUser = data.user;
            localStorage.setItem('stocklens_currentUser', JSON.stringify(data.user));
            
            return data.user;
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            throw new Error(error.message);
        }
    }
}

// URL base de la API
const API_BASE = 'http://localhost:3000/api';

// Variables globales
let products = [];
let categories = [];
let currentProductId = null;
let currentCategoryId = null;
let isEditing = false;
let isEditingCategory = false;
let currentSection = 'inventory';

// Inicializar sistema de autenticación
const auth = new AuthSystem();

// ===============================
// ELEMENTOS DEL DOM - ACTUALIZADOS
// ===============================

// Elementos de Autenticación
const loginSection = document.getElementById('login');
const appHeader = document.getElementById('app-header');
const loginForm = document.getElementById('login-form');
const registerModal = document.getElementById('register-modal');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const registerForm = document.getElementById('register-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const registerLink = document.getElementById('register-link');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const closeRegisterModal = document.getElementById('close-register-modal');
const closeForgotModal = document.getElementById('close-forgot-modal');
const cancelRegister = document.getElementById('cancel-register');
const cancelForgot = document.getElementById('cancel-forgot');
const logoutBtn = document.getElementById('logout-btn');
const userAvatar = document.getElementById('user-avatar');
const rememberMe = document.getElementById('remember-me');
const saveProfileBtn = document.getElementById('save-profile-btn');

// Elementos del inventario
const productsTableBody = document.getElementById('products-table-body');
const categoriesTableBody = document.getElementById('categories-table-body');
const totalProductsElement = document.getElementById('total-products');
const totalValueElement = document.getElementById('total-value');
const lowStockCountElement = document.getElementById('low-stock-count');
const outOfStockCountElement = document.getElementById('out-of-stock-count');
const searchInput = document.getElementById('search-input');
const searchCategoriesInput = document.getElementById('search-categories-input');
const addProductBtn = document.getElementById('add-product-btn');
const addCategoryBtn = document.getElementById('add-category-btn');
const generateReportBtn = document.getElementById('generate-report-btn');

// Modals
const productModal = document.getElementById('product-modal');
const modalTitleText = document.getElementById('modal-title-text');

// Formularios
const productForm = document.getElementById('product-form');

// Botones de cierre
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');

// Otros elementos
const notification = document.getElementById('notification');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const saveBtn = document.getElementById('save-btn');

// ===============================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===============================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Verificar autenticación
    if (auth.isLoggedIn()) {
        showApp();
        loadProducts();
        loadCategories();
        setCurrentMonth();
        setupCategoryInput();
        loadUserProfile();
        // Mostrar inventario automáticamente al iniciar sesión
        switchSection('inventory');
    } else {
        showLogin();
    }

    // Cargar preferencia de "Recordar usuario"
    if (auth.rememberMe) {
        rememberMe.checked = true;
        const savedUser = JSON.parse(localStorage.getItem('stocklens_savedUser'));
        if (savedUser) {
            document.getElementById('login-email').value = savedUser.email;
        }
    }
    setupStatsModalListeners();
}

function setupEventListeners() {
    // Autenticación
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    registerLink.addEventListener('click', () => showModal(registerModal));
    forgotPasswordLink.addEventListener('click', () => showModal(forgotPasswordModal));
    closeRegisterModal.addEventListener('click', () => hideModal(registerModal));
    closeForgotModal.addEventListener('click', () => hideModal(forgotPasswordModal));
    cancelRegister.addEventListener('click', () => hideModal(registerModal));
    cancelForgot.addEventListener('click', () => hideModal(forgotPasswordModal));
    logoutBtn.addEventListener('click', handleLogout);
    saveProfileBtn.addEventListener('click', handleSaveProfile);

    // Inventario
    addProductBtn.addEventListener('click', openAddModal);
    addCategoryBtn.addEventListener('click', openAddCategoryModal);
    generateReportBtn.addEventListener('click', generateReport);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    productForm.addEventListener('submit', saveProduct);
    searchInput.addEventListener('input', filterProducts);
    searchCategoriesInput.addEventListener('input', filterCategories);

    // Navegación
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
            
            // Recargar categorías cuando se active esa sección
            if (sectionId === 'categories') {
                loadCategories();
            }
        });
    });

    // Cerrar modales al hacer clic fuera
    [registerModal, forgotPasswordModal, productModal].forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });

    // Restaurar botones cuando se cierren modales
    registerModal.addEventListener('click', function(e) {
        if (e.target === registerModal) {
            const submitBtn = document.querySelector('#register-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Cuenta';
            }
        }
    });

    // También agregar para el modal de login por si acaso
    loginForm.addEventListener('reset', function() {
        const submitBtn = document.getElementById('login-submit');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    });

    setupStatsModalListeners();
}


// ===============================
// FUNCIONALIDADES DE AUTENTICACIÓN
// ===============================
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showApp() {
    console.log('Mostrando aplicación...');
    
    // Ocultar completamente la sección de login
    loginSection.style.display = 'none';
    loginSection.classList.remove('active');
    
    // Mostrar header
    appHeader.style.display = 'block';
    
    // Asegurarse de que al menos una sección esté visible
    let algunaSeccionVisible = false;
    sections.forEach(section => {
        if (section.id !== 'login') {
            if (section.classList.contains('active')) {
                section.style.display = 'block';
                algunaSeccionVisible = true;
            } else {
                section.style.display = 'none';
            }
        }
    });
    
    // Si no hay ninguna sección activa, mostrar inventario por defecto
    if (!algunaSeccionVisible) {
        switchSection('inventory');
    }
    
    // Actualizar información del usuario
    if (auth.currentUser) {
        const initial = auth.currentUser.name.charAt(0).toUpperCase();
        userAvatar.textContent = initial;
        userAvatar.title = auth.currentUser.name;
    }
    
    // Restaurar el botón de login por si acaso
    const submitBtn = document.getElementById('login-submit');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
}

function showLogin() {
    // Ocultar todas las secciones de la aplicación
    sections.forEach(section => {
        if (section.id !== 'login') {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });
    
    // Ocultar header y mostrar login
    appHeader.style.display = 'none';
    loginSection.style.display = 'block';
    loginSection.classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const remember = rememberMe.checked;

    // Obtener el botón de submit
    const submitBtn = document.getElementById('login-submit');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Deshabilitar botón y mostrar loading
        submitBtn.innerHTML = '<div class="loading"></div> Iniciando sesión...';
        submitBtn.disabled = true;

        console.log('Enviando credenciales al servidor...');

        // Intentar login
        await auth.login(email, password);
        auth.setRememberMe(remember);
        
        if (remember) {
            localStorage.setItem('stocklens_savedUser', JSON.stringify({ email }));
        }

        showNotification('¡Bienvenido de nuevo!', 'success');
        
        // Mostrar la aplicación
        showApp();
        
        // Cargar datos
        await loadProducts();
        await loadCategories();
        loadUserProfile();
        
        // Mostrar inventario automáticamente
        switchSection('inventory');
        
        // Limpiar formulario de login
        loginForm.reset();

    } catch (error) {
        console.error('Error en login:', error);
        showNotification(error.message, 'error');
        
        // Re-habilitar el botón en caso de error
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // Obtener el botón de submit
    const submitBtn = document.querySelector('#register-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Validaciones
    if (password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        // Deshabilitar botón y mostrar loading
        submitBtn.innerHTML = '<div class="loading"></div> Creando cuenta...';
        submitBtn.disabled = true;

        console.log('Enviando datos de registro al servidor...');
        
        // Registrar usuario en la base de datos
        await auth.register({ name, email, password });
        
        showNotification('¡Cuenta creada exitosamente! Ya puedes iniciar sesión', 'success');
        hideModal(registerModal);
        
        // Rellenar el email en el formulario de login
        document.getElementById('login-email').value = email;
        
        // Limpiar formulario de registro
        registerForm.reset();

    } catch (error) {
        console.error('Error en registro:', error);
        showNotification(error.message, 'error');
    } finally {
        // Siempre restaurar el botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email').value;

    try {
        auth.resetPassword(email);
        showNotification('Se ha enviado un enlace de recuperación a tu correo electrónico', 'success');
        hideModal(forgotPasswordModal);
        
        // Limpiar formulario
        forgotPasswordForm.reset();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function handleLogout() {
    auth.logout();
    showNotification('Sesión cerrada correctamente', 'success');
    
    // Limpiar completamente la interfaz
    resetUI();
    
    // Mostrar login
    showLogin();
    
    // Limpiar formulario
    loginForm.reset();
}

function resetUI() {
    // Limpiar todas las secciones de la aplicación
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id !== 'login') {
            section.style.display = 'none';
        }
    });
    
    // Limpiar tablas
    productsTableBody.innerHTML = '';
    categoriesTableBody.innerHTML = '';
    
    // Resetear estadísticas
    totalProductsElement.textContent = '0';
    totalValueElement.textContent = '$0';
    lowStockCountElement.textContent = '0';
    outOfStockCountElement.textContent = '0';
    
    // Cerrar cualquier modal abierto
    hideModal(productModal);
    hideModal(registerModal);
    hideModal(forgotPasswordModal);
    
    // Resetear búsquedas
    searchInput.value = '';
    searchCategoriesInput.value = '';
}

function loadUserProfile() {
    if (auth.currentUser) {
        document.getElementById('profile-name').value = auth.currentUser.name;
        document.getElementById('profile-email').value = auth.currentUser.email;
    }
}

function handleSaveProfile() {
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;

    try {
        const profileData = { name, email };
        
        // Si se proporciona nueva contraseña, verificar la actual
        if (newPassword) {
            if (!currentPassword) {
                throw new Error('Debes ingresar la contraseña actual para cambiarla');
            }
            
            profileData.currentPassword = currentPassword;
            profileData.newPassword = newPassword;
        }

        auth.updateProfile(profileData);
        showNotification('Perfil actualizado correctamente', 'success');
        
        // Limpiar campos de contraseña
        document.getElementById('profile-current-password').value = '';
        document.getElementById('profile-new-password').value = '';
        
        // Actualizar avatar
        const initial = auth.currentUser.name.charAt(0).toUpperCase();
        userAvatar.textContent = initial;
        userAvatar.title = auth.currentUser.name;
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===============================
// FUNCIONALIDADES DEL INVENTARIO (código existente)
// ===============================

// Función para hacer peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const showErrors = options.showErrors !== false;
    delete options.showErrors;
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en la petición API:', error);
        if (showErrors) {
            showNotification('Error de conexión con el servidor', 'error');
        }
        throw error;
    }
}

// Cargar productos desde la API
async function loadProducts() {
    try {
        showNotification('Cargando productos...', 'info');
        products = await apiRequest('/productos');
        renderProducts();
        updateStats();
    } catch (error) {
        showNotification('Error al cargar los productos', 'error');
    }
}

// Cargar categorías desde la API
async function loadCategories() {
    try {
        categories = await apiRequest('/productos/categorias/lista', { showErrors: false });
        renderCategories();
        updateCategorySuggestions();
    } catch (error) {
        console.log('Usando datos de productos para categorías...');
        extractCategoriesFromProducts();
        updateCategorySuggestions();
    }
}

// Extraer categorías de los productos (fallback)
function extractCategoriesFromProducts() {
    const categoryMap = {};
    
    products.forEach(product => {
        if (!categoryMap[product.category]) {
            categoryMap[product.category] = {
                nombre: product.category,
                totalProductos: 0,
                totalStock: 0,
                valorTotal: 0
            };
        }
        
        categoryMap[product.category].totalProductos++;
        categoryMap[product.category].totalStock += product.stock;
        categoryMap[product.category].valorTotal += product.price * product.stock;
    });
    
    categories = Object.values(categoryMap).map(cat => ({
        ...cat,
        valorTotal: Math.round(cat.valorTotal * 100) / 100
    }));
    
    renderCategories();
}

function updateCategorySuggestions() {
    const datalist = document.getElementById('category-suggestions');
    if (datalist) {
        datalist.innerHTML = '';
        
        // Obtener categorías únicas
        const uniqueCategories = [...new Set(categories.map(cat => cat.nombre))];
        
        uniqueCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            datalist.appendChild(option);
        });
    }
}

// Navegación entre secciones
function switchSection(sectionId) {
    // Ocultar todas las secciones
    sections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    // Actualizar navegación
    navLinks.forEach(link => {
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    currentSection = sectionId;
}

// Establecer mes actual en el selector de reportes
function setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('report-month').value = `${year}-${month}`;
}

// Renderizar la tabla de productos
function renderProducts(productsToRender = products) {
    productsTableBody.innerHTML = '';
    
    if (productsToRender.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No se encontraron productos</td></tr>';
        return;
    }
    
    productsToRender.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Determinar la clase de estado según el stock
        let statusClass = 'in-stock';
        let statusText = 'Disponible';
        
        if (product.stock === 0) {
            statusClass = 'out-of-stock';
            statusText = 'Sin Stock';
        } else if (product.stock < 5) {
            statusClass = 'low-stock';
            statusText = 'Stock Bajo';
        }
        
        row.innerHTML = `
            <td>${product._id ? product._id.substring(0, 8) + '...' : index + 1}</td>
            <td>
                <span class="product-name">${product.name}</span>
                ${product.description ? `<span class="product-description">${product.description}</span>` : ''}
            </td>
            <td>${product.category}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.stock}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td class="actions">
                <button class="action-btn edit-btn" data-id="${product._id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${product._id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        productsTableBody.appendChild(row);
    });
    
    // Agregar event listeners a los botones de editar y eliminar
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            openEditModal(productId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// Renderizar la tabla de categorías
function renderCategories(categoriesToRender = categories) {
    categoriesTableBody.innerHTML = '';
    
    if (categoriesToRender.length === 0) {
        categoriesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No se encontraron categorías</td></tr>';
        return;
    }
    
    categoriesToRender.forEach((category, index) => {
        const row = document.createElement('tr');
        
        
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <span class="product-name">${category.nombre}</span>
                </td>
                <td>${category.nombre}</td>
                <td>${category.totalProductos || 0}</td>
                <td class="actions">
                    <button class="action-btn view-btn" data-category="${category.nombre}" title="Ver Productos">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn stats-btn" data-category="${category.nombre}" title="Estadísticas">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </td>
            `;
        
        categoriesTableBody.appendChild(row);
    });
    
    // Agregar event listeners a los botones de categorías
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryName = this.getAttribute('data-category');
            viewCategoryProducts(categoryName);
        });
    });
    
    document.querySelectorAll('.stats-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryName = this.getAttribute('data-category');
            showCategoryStats(categoryName);
        });
    });
}

// Ver productos de una categoría específica
function viewCategoryProducts(categoryName) {
    const filteredProducts = products.filter(product => product.category === categoryName);
    switchSection('inventory');
    
    // Filtrar y mostrar productos de esa categoría
    renderProducts(filteredProducts);
    showNotification(`Mostrando productos de la categoría: ${categoryName}`, 'info');
}

// Mostrar estadísticas de categoría
// Mostrar estadísticas de categoría en modal elegante
function showCategoryStats(categoryName) {
    const category = categories.find(cat => cat.nombre === categoryName);
    if (!category) {
        showNotification('No se encontró la categoría', 'error');
        return;
    }

    // Calcular estadísticas adicionales
    const totalProductsAll = products.length;
    const totalStockAll = products.reduce((sum, product) => sum + product.stock, 0);
    const totalValueAll = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    
    const percentageOfInventory = totalProductsAll > 0 ? 
        ((category.totalProductos / totalProductsAll) * 100).toFixed(1) : 0;
    
    const avgValuePerProduct = category.totalProductos > 0 ? 
        (category.valorTotal / category.totalProductos) : 0;
    
    const avgStockPerProduct = category.totalProductos > 0 ? 
        (category.totalStock / category.totalProductos) : 0;

    // Determinar estado del inventario
    let inventoryStatus = '';
    let statusClass = '';
    
    if (category.totalStock === 0) {
        inventoryStatus = 'Sin Stock';
        statusClass = 'inventory-status-critical';
    } else if (category.totalStock < 10) {
        inventoryStatus = 'Stock Bajo';
        statusClass = 'inventory-status-warning';
    } else if (category.totalStock < 25) {
        inventoryStatus = 'Stock Adecuado';
        statusClass = 'inventory-status-good';
    } else {
        inventoryStatus = 'Stock Excelente';
        statusClass = 'inventory-status-excellent';
    }

    // Actualizar el contenido del modal
    document.getElementById('stats-modal-title').textContent = `Estadísticas: ${categoryName}`;
    document.getElementById('stats-total-products').textContent = category.totalProductos || 0;
    document.getElementById('stats-total-stock').textContent = category.totalStock || 0;
    document.getElementById('stats-total-value').textContent = `$${(category.valorTotal || 0).toFixed(2)}`;
    document.getElementById('stats-percentage').textContent = `${percentageOfInventory}%`;
    
    document.getElementById('detail-category-name').textContent = categoryName;
    document.getElementById('detail-avg-value').textContent = `$${avgValuePerProduct.toFixed(2)}`;
    document.getElementById('detail-avg-stock').textContent = avgStockPerProduct.toFixed(1);
    document.getElementById('detail-inventory-status').textContent = inventoryStatus;
    document.getElementById('detail-inventory-status').className = statusClass;

    // Mostrar el modal
    showModal(document.getElementById('stats-modal'));
     
    // Animar la barra de progreso
    setTimeout(() => {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentageOfInventory}%`;
        }
    }, 100);

    // Mostrar el modal
    showModal(document.getElementById('stats-modal'));
}

// Agregar event listeners para el modal de estadísticas
function setupStatsModalListeners() {
    const statsModal = document.getElementById('stats-modal');
    const closeStatsModal = document.getElementById('close-stats-modal');
    const closeStatsBtn = document.getElementById('close-stats-btn');
    const viewCategoryProductsBtn = document.getElementById('view-category-products');

    if (closeStatsModal) {
        closeStatsModal.addEventListener('click', () => hideModal(statsModal));
    }

    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', () => hideModal(statsModal));
    }

    if (viewCategoryProductsBtn) {
        viewCategoryProductsBtn.addEventListener('click', function() {
            const categoryName = document.getElementById('detail-category-name').textContent;
            hideModal(statsModal);
            viewCategoryProducts(categoryName);
        });
    }

    // Cerrar modal al hacer clic fuera
    if (statsModal) {
        statsModal.addEventListener('click', function(e) {
            if (e.target === statsModal) {
                hideModal(statsModal);
            }
        });
    }
}

// Actualizar estadísticas
function updateStats() {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const lowStockCount = products.filter(product => product.stock > 0 && product.stock < 5).length;
    const outOfStockCount = products.filter(product => product.stock === 0).length;
    
    totalProductsElement.textContent = totalProducts;
    totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
    lowStockCountElement.textContent = lowStockCount;
    outOfStockCountElement.textContent = outOfStockCount;
    
    // Añadir efecto de pulso si hay productos con stock bajo o sin stock
    if (lowStockCount > 0) {
        lowStockCountElement.classList.add('pulse');
    } else {
        lowStockCountElement.classList.remove('pulse');
    }
    
    if (outOfStockCount > 0) {
        outOfStockCountElement.classList.add('pulse');
    } else {
        outOfStockCountElement.classList.remove('pulse');
    }
}

// Filtrar productos
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.category.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    
    renderProducts(filteredProducts);
}

// Filtrar categorías
function filterCategories() {
    const searchTerm = searchCategoriesInput.value.toLowerCase();
    const filteredCategories = categories.filter(category => 
        category.nombre.toLowerCase().includes(searchTerm)
    );
    
    renderCategories(filteredCategories);
}

// Abrir modal para agregar producto
function openAddModal() {
    isEditing = false;
    currentProductId = null;
    modalTitleText.textContent = 'Agregar Producto';
    productForm.reset();
    
    // Limpiar específicamente el datalist y asegurar que esté actualizado
    updateCategorySuggestions();
    
    showModal(productModal);
}

// función para mejorar la experiencia de usuario
function setupCategoryInput() {
    const categoryInput = document.getElementById('product-category');
    
    if (categoryInput) {
        categoryInput.addEventListener('input', function() {
            // Convertir a título (primera letra mayúscula)
            const currentValue = this.value;
            if (currentValue.length > 1) {
                this.value = currentValue.charAt(0).toUpperCase() + currentValue.slice(1).toLowerCase();
            }
        });
        
        categoryInput.addEventListener('focus', function() {
            // Actualizar sugerencias cuando el input recibe foco
            updateCategorySuggestions();
        });
    }
}

// Abrir modal para agregar categoría (placeholder)
function openAddCategoryModal() {
    showNotification('Para agregar categorías, crea productos con nuevas categorías', 'info');
}

// Generar reporte (placeholder)
function generateReport() {
    showNotification('Reporte generado correctamente', 'success');
}

// Abrir modal para editar producto
async function openEditModal(productId) {
    try {
        const product = await apiRequest(`/productos/${productId}`);
        if (product) {
            isEditing = true;
            currentProductId = productId;
            modalTitleText.textContent = 'Editar Producto';
            
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-description').value = product.description || '';
            
            showModal(productModal);
        }
    } catch (error) {
        showNotification('Error al cargar el producto', 'error');
    }
}

// Cerrar modal
function closeModal() {
    hideModal(productModal);
}

// Guardar producto (agregar o editar)
async function saveProduct(e) {
    e.preventDefault();
    
    // Mostrar indicador de carga
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="loading"></div> Guardando...';
    saveBtn.disabled = true;
    
    try {
        const name = document.getElementById('product-name').value;
        const categoryInput = document.getElementById('product-category').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const stock = parseInt(document.getElementById('product-stock').value);
        const description = document.getElementById('product-description').value;
        
        // Validar que la categoría no esté vacía
        if (!categoryInput) {
            throw new Error('La categoría es requerida');
        }
        
        const productData = { 
            name, 
            category: categoryInput, // Usar el texto ingresado
            price, 
            stock, 
            description 
        };
        
        if (isEditing) {
            // Editar producto existente
            await apiRequest(`/productos/${currentProductId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showNotification('Producto actualizado correctamente');
        } else {
            // Agregar nuevo producto
            await apiRequest('/productos', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showNotification('Producto agregado correctamente');
        }
        
        // Recargar productos y categorías desde la API
        await loadProducts();
        await loadCategories(); // Esto actualizará las sugerencias automáticamente
        closeModal();
    } catch (error) {
        showNotification(error.message || 'Error al guardar el producto', 'error');
    } finally {
        // Restaurar botón
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Eliminar producto
async function deleteProduct(productId) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        try {
            await apiRequest(`/productos/${productId}`, {
                method: 'DELETE'
            });
            
            showNotification('Producto eliminado correctamente', 'success');
            await loadProducts(); // Recargar productos desde la API
            await loadCategories(); // Recargar categorías también
        } catch (error) {
            showNotification('Error al eliminar el producto', 'error');
        }
    }
}

function restoreButton(buttonId, originalHtml) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}