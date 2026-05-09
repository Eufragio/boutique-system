// src/models/Settings.js
const pool = require('../config/database');

const Settings = {
    // Obtener la configuración
    get: async () => {
        const query = 'SELECT * FROM configuracion ORDER BY id ASC LIMIT 1';
        const { rows } = await pool.query(query);
        return rows[0];
    },

    // Guardar o Actualizar
    update: async (data) => {
        const current = await Settings.get();

        if (current) {
            // Actualizar existente
            const query = `
                UPDATE configuracion 
                SET nombre_negocio=$1, direccion=$2, telefono=$3, mensaje_ticket=$4, logo_url=COALESCE($5, logo_url), moneda=$6, zona_horaria=$7
                WHERE id=$8 RETURNING *
            `;
            const values = [
                data.nombre, 
                data.direccion, 
                data.telefono, 
                data.mensaje, 
                data.logo_url || null, 
                data.moneda || '$', 
                data.zona_horaria || 'America/Lima',
                current.id
            ];
            const { rows } = await pool.query(query, values);
            return rows[0];
        } else {
            // Crear nuevo
            const query = `
                INSERT INTO configuracion (nombre_negocio, direccion, telefono, mensaje_ticket, logo_url, moneda, zona_horaria)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
            `;
            const values = [
                data.nombre, 
                data.direccion, 
                data.telefono, 
                data.mensaje, 
                data.logo_url,
                data.moneda || '$',
                data.zona_horaria || 'America/Lima'
            ];
            const { rows } = await pool.query(query, values);
            return rows[0];
        }
    }
};

module.exports = Settings;