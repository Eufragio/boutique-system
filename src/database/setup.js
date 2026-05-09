// src/database/setup.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const setupDatabase = async () => {
    try {
        console.log('🔄 Iniciando configuración de base de datos...');

        await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
        await pool.query(fs.readFileSync(path.join(__dirname, 'missing_tables.sql'), 'utf8'));

        console.log('✅ Tablas creadas correctamente en PostgreSQL.');

        const adminCheck = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@boutique.com'");
        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Administrador', 'admin@boutique.com', $1, 'admin')`,
                [hashedPassword]
            );
            console.log('👤 Usuario Admin creado: admin@boutique.com / admin123');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error configurando la base de datos:', error);
        process.exit(1);
    }
};

setupDatabase();