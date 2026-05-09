// app.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();

// Inicializaciones
const app = express();

// --- IMPORTAR MODELOS Y CONFIGURACIONES ---
const pool = require('./src/config/database');
const isAuthenticated = require('./src/middlewares/auth');
const Settings = require('./src/models/Settings');
const CashRegister = require('./src/models/CashRegister');

// --- IMPORTAR RUTAS ---
const authRoutes = require('./src/routes/auth');
const homeRoutes = require('./src/routes/home');
const productRoutes = require('./src/routes/products');
const clientRoutes = require('./src/routes/clients');
const saleRoutes = require('./src/routes/sales');
const settingsRoutes = require('./src/routes/settings');
const cashRoutes = require('./src/routes/cash');
const categoriesRoutes = require('./src/routes/categories');
const expensesRoutes = require('./src/routes/expenses');
const userRoutes = require('./src/routes/users');
const supplierRoutes = require('./src/routes/suppliers');
const purchaseRoutes = require('./src/routes/purchases');
const kardexRoutes = require('./src/routes/kardex');
const reportRoutes = require('./src/routes/reports');
const profileRoutes = require('./src/routes/profile'); // <--- 1. IMPORTAR RUTA PERFIL

// Settings
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middlewares Generales
app.use(morgan('dev'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// Configuración de Sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

// --- MIDDLEWARE GLOBAL ---
app.use(async (req, res, next) => {
    
    res.locals.user = req.session.userName || null;
    res.locals.userRol = req.session.userRol || null;
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');

    let shopConfig = { 
        nombre_negocio: 'Boutique System', 
        moneda: 'S/', 
        zona_horaria: 'America/Lima' 
    };

    try {
        const configDb = await Settings.get();
        if (configDb) shopConfig = configDb;
    } catch (error) {
        console.error('Error cargando config:', error);
    }
    
    res.locals.shop = shopConfig;

    res.locals.formatCurrency = (amount) => {
        return `${shopConfig.moneda} ${parseFloat(amount).toFixed(2)}`;
    };

    res.locals.formatDateLong = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: shopConfig.zona_horaria
        });
    };

    res.locals.formatDateShort = (date) => {
        return new Date(date).toLocaleDateString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: shopConfig.zona_horaria
        });
    };

    if (req.session.userId) {
        try {
            if (req.session.cajaId) {
                res.locals.cajaAbierta = true;
            } else {
                const caja = await CashRegister.findOpenByUserId(req.session.userId);
                if (caja) {
                    req.session.cajaId = caja.id;
                    req.session.fechaApertura = caja.fecha_apertura;
                    res.locals.cajaAbierta = true;
                } else {
                    res.locals.cajaAbierta = false;
                }
            }
        } catch (error) {
            res.locals.cajaAbierta = false;
        }
    } else {
        res.locals.cajaAbierta = false;
    }
    
    next();
});

// --- ASIGNACIÓN DE RUTAS ---
app.use('/', authRoutes);
app.use('/', isAuthenticated, homeRoutes);
app.use('/productos', isAuthenticated, productRoutes);
app.use('/clientes', isAuthenticated, clientRoutes);
app.use('/ventas', isAuthenticated, saleRoutes);
app.use('/configuracion', isAuthenticated, settingsRoutes);
app.use('/caja', cashRoutes);
app.use('/categorias', isAuthenticated, categoriesRoutes);
app.use('/gastos', isAuthenticated, expensesRoutes);
app.use('/usuarios', isAuthenticated, userRoutes);
app.use('/proveedores', isAuthenticated, supplierRoutes);
app.use('/compras', isAuthenticated, purchaseRoutes);
app.use('/kardex', isAuthenticated, kardexRoutes);
app.use('/reportes', isAuthenticated, reportRoutes);
app.use('/perfil', isAuthenticated, profileRoutes); // <--- 2. USAR RUTA PERFIL

// Iniciar Servidor
app.listen(app.get('port'), () => {
    console.log(`🚀 Servidor corriendo en puerto ${app.get('port')}`);
    console.log(`🔗 http://localhost:${app.get('port')}`);
});