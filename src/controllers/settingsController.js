// src/controllers/settingsController.js
const Settings = require('../models/Settings');

const controller = {
    // Mostrar formulario
    index: async (req, res) => {
        try {
            const config = await Settings.get() || {
                nombre_negocio: '',
                direccion: '',
                telefono: '',
                mensaje_ticket: '',
                moneda: '$',
                zona_horaria: 'America/Lima',
                logo_url: null
            };
            res.render('settings/index', { config });
        } catch (error) {
            console.error(error);
            res.redirect('/');
        }
    },

    // Guardar cambios
    update: async (req, res) => {
        try {
            const { nombre, direccion, telefono, mensaje, moneda, zona_horaria } = req.body;
            
            let logo_url = null;
            if (req.file) {
                logo_url = '/uploads/' + req.file.filename;
            }

            await Settings.update({
                nombre,
                direccion,
                telefono,
                mensaje,
                logo_url,
                moneda,
                zona_horaria
            });

            req.flash('success', 'Configuración actualizada correctamente');
            res.redirect('/configuracion');
        } catch (error) {
            console.error(error);
            req.flash('error', 'Error al guardar configuración');
            res.redirect('/configuracion');
        }
    }
};

module.exports = controller;