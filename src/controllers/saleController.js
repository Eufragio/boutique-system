// src/controllers/saleController.js
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Client = require('../models/Client');
const ExcelJS = require('exceljs'); // <--- Importante: Librería nueva

const controller = {
    // 1. HISTORIAL DE VENTAS
    index: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const ventas = await Sale.findAll(fechaInicio, fechaFin);
            
            res.render('sales/index', { 
                ventas,
                filtros: { fechaInicio, fechaFin }
            });
        } catch (error) {
            console.error(error);
            req.flash('error', 'Error al cargar el historial');
            res.redirect('/');
        }
    },

    // 2. MOSTRAR POS
    create: async (req, res) => {
        try {
            if (!req.session.cajaId) {
                req.flash('error', '⚠️ Debes ABRIR CAJA antes de vender.');
                return res.redirect('/caja/apertura');
            }
            const productos = await Product.findAllActive();
            const clientes = await Client.findAll();
            res.render('sales/create', { productos, clientes });
        } catch (error) {
            console.error(error);
            res.redirect('/');
        }
    },

    // 3. GUARDAR VENTA
    store: async (req, res) => {
        try {
            const { cliente_id, total, items, metodo_pago } = req.body;

            if (!items || items.length === 0) {
                return res.json({ success: false, message: 'El carrito está vacío' });
            }

            const ventaId = await Sale.create({
                cliente_id,
                total,
                tipo_comprobante: 'boleta',
                metodo_pago: metodo_pago || 'Efectivo',
                items
            });

            res.json({ success: true, id: ventaId });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: 'Error al procesar la venta' });
        }
    },

    // 4. VER RECIBO
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const venta = await Sale.findById(id);

            if (!venta) {
                req.flash('error', 'Venta no encontrada');
                return res.redirect('/ventas');
            }

            res.render('sales/receipt', { venta });
        } catch (error) {
            console.error(error);
            res.redirect('/ventas');
        }
    },

    // 5. ANULAR VENTA
    cancel: async (req, res) => {
        try {
            const { id } = req.params;
            await Sale.cancel(id);
            req.flash('success', '✅ Venta anulada. El stock ha sido restaurado.');
            res.redirect('/ventas');
        } catch (error) {
            console.error(error);
            req.flash('error', 'Error al anular: ' + error.message);
            res.redirect('/ventas');
        }
    },

    // 6. EXPORTAR A EXCEL (NUEVO)
    export: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            
            // Reutilizamos la búsqueda del historial para exportar LO MISMO que se ve en pantalla
            const ventas = await Sale.findAll(fechaInicio, fechaFin);

            // Crear Libro de Excel
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte de Ventas');

            // Definir Columnas
            worksheet.columns = [
                { header: 'ID Venta', key: 'id', width: 10 },
                { header: 'Fecha y Hora', key: 'fecha', width: 20 },
                { header: 'Cliente', key: 'cliente', width: 30 },
                { header: 'Comprobante', key: 'tipo', width: 15 },
                { header: 'Método Pago', key: 'metodo', width: 15 },
                { header: 'Estado', key: 'estado', width: 15 },
                { header: 'Total ($)', key: 'total', width: 15 },
            ];

            // Estilo para el encabezado (Negrita y Fondo Gris)
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Agregar Filas
            let totalPeriodo = 0;

            ventas.forEach(v => {
                const fila = worksheet.addRow({
                    id: v.id,
                    fecha: new Date(v.fecha).toLocaleString('es-PE'),
                    cliente: v.cliente_nombre,
                    tipo: v.tipo_comprobante.toUpperCase(),
                    metodo: v.metodo_pago,
                    estado: v.estado.toUpperCase(),
                    total: parseFloat(v.total)
                });

                // Si está anulada, pintamos la letra de rojo
                if (v.estado === 'anulado') {
                    fila.font = { color: { argb: 'FFFF0000' }, italic: true };
                } else {
                    totalPeriodo += parseFloat(v.total);
                }
            });

            // Agregar Fila de Total Final
            worksheet.addRow({}); // Espacio vacío
            const filaTotal = worksheet.addRow({
                estado: 'TOTAL:',
                total: totalPeriodo
            });
            filaTotal.font = { bold: true, size: 12 };

            // Configurar respuesta para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Reporte_Ventas_${Date.now()}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Error exportando excel:', error);
            req.flash('error', 'No se pudo generar el reporte Excel');
            res.redirect('/ventas');
        }
    }
};

module.exports = controller;