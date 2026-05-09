// public/js/pos.js — Boutique POS Engine

'use strict';

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let carrito = [];
let totalVenta = 0;

/* ============================================================
   SONIDO DE CONFIRMACIÓN (beep)
   ============================================================ */
function beep(frequency = 880, duration = 80) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration / 1000);
    } catch(e) { /* silencioso si no hay audio */ }
}

function beepError() { beep(300, 200); }

/* ============================================================
   TOAST BOUTIQUE (reemplaza alert nativo)
   ============================================================ */
function mostrarToast(mensaje, tipo = 'success', duracion = 2800) {
    const container = document.getElementById('posToastContainer');
    if (!container) return;

    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill' };
    const toast = document.createElement('div');
    toast.className = `pos-toast ${tipo}`;
    toast.innerHTML = `<i class="bi ${icons[tipo] || icons.success}"></i><span>${mensaje}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}

/* ============================================================
   BUSCADOR DE TEXTO (filtra la cuadrícula)
   ============================================================ */
function filtrarProductos() {
    const texto = document.getElementById('buscadorProducto').value.toLowerCase().trim();
    document.querySelectorAll('.producto-card-container').forEach(card => {
        const nombre = card.getAttribute('data-nombre') || '';
        const codigo = card.getAttribute('data-codigo') || '';
        card.style.display = (nombre.includes(texto) || codigo.includes(texto)) ? '' : 'none';
    });
}

/* ============================================================
   ESCÁNER DE CÓDIGO DE BARRAS
   Detecta entrada ultra-rápida (pistola lectora) o Enter manual
   ============================================================ */
(function initScanner() {
    const scannerInput = document.getElementById('scannerInput');
    if (!scannerInput) return;

    let buffer = '';
    let lastKeyTime = 0;
    const MAX_INTERVAL = 80; // ms entre teclas → si es menor, es pistola

    scannerInput.addEventListener('keydown', function(e) {
        const now = Date.now();

        if (e.key === 'Enter') {
            e.preventDefault();
            if (buffer.trim().length > 0) {
                procesarCodigoBarras(buffer.trim());
                buffer = '';
                scannerInput.value = '';
            }
            return;
        }

        // Acumula si es entrada rápida (pistola)
        if (e.key.length === 1) {
            if (now - lastKeyTime > MAX_INTERVAL && buffer.length > 0) {
                // Pausa larga → era entrada manual, resetear buffer
                buffer = '';
            }
            buffer += e.key;
            lastKeyTime = now;
        }
    });

    // Para lectores que simulan pegar texto (Ctrl+V o clipboard)
    scannerInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const texto = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (texto) procesarCodigoBarras(texto);
        scannerInput.value = '';
    });
})();

function procesarCodigoBarras(codigo) {
    const codigoLower = codigo.toLowerCase();
    const producto = listaGlobalProductos.find(p =>
        p.codigo_barras && p.codigo_barras.toLowerCase() === codigoLower
    );

    const scannerInput = document.getElementById('scannerInput');

    if (producto) {
        if (producto.stock_actual <= 0) {
            mostrarToast(`Sin stock: ${producto.nombre}`, 'warning');
            beepError();
            return;
        }
        agregarAlCarrito(
            producto.id, producto.nombre,
            producto.precio_venta, producto.stock_actual,
            producto.imagen_url || ''
        );
        beep();
        // Efecto visual en el input
        if (scannerInput) {
            scannerInput.classList.add('scanned');
            setTimeout(() => scannerInput.classList.remove('scanned'), 700);
        }
    } else {
        mostrarToast(`Código no encontrado: <strong>${codigo}</strong>`, 'error', 3000);
        beepError();
    }

    if (scannerInput) scannerInput.value = '';
}

/* ============================================================
   CARRITO — AGREGAR PRODUCTO
   ============================================================ */
function agregarAlCarrito(id, nombre, precio, stock, imagen) {
    const itemExistente = carrito.find(i => i.producto_id == id);
    const cantidadActual = itemExistente ? itemExistente.cantidad : 0;

    if (cantidadActual + 1 > stock) {
        mostrarToast(`¡Stock insuficiente! Solo quedan ${stock} unidades.`, 'warning');
        beepError();
        return;
    }

    if (itemExistente) {
        itemExistente.cantidad++;
        itemExistente.subtotal = (itemExistente.cantidad * itemExistente.precio) - itemExistente.descuento;
    } else {
        carrito.push({
            producto_id: id,
            nombre,
            cantidad: 1,
            precio: parseFloat(precio),
            descuento: 0,
            subtotal: parseFloat(precio),
            imagen: imagen || ''
        });
    }
    actualizarCarrito();
}

/* ============================================================
   CARRITO — ACTUALIZAR CANTIDAD
   ============================================================ */
function actualizarCantidad(index, delta) {
    const item = carrito[index];
    if (!item) return;
    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad <= 0) { eliminarItem(index); return; }

    // Verificar stock
    const prod = listaGlobalProductos.find(p => p.id == item.producto_id);
    if (prod && nuevaCantidad > prod.stock_actual) {
        mostrarToast(`Stock máximo: ${prod.stock_actual}`, 'warning');
        return;
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = (item.precio * item.cantidad) - item.descuento;
    if (item.subtotal < 0) item.subtotal = 0;
    actualizarCarrito();
}

/* ============================================================
   CARRITO — ACTUALIZAR DESCUENTO
   ============================================================ */
function actualizarDescuento(index, valor) {
    const item = carrito[index];
    if (!item) return;
    let desc = parseFloat(valor) || 0;
    const max = item.precio * item.cantidad;
    if (desc < 0) desc = 0;
    if (desc > max) { mostrarToast('Descuento no puede superar el precio', 'warning'); desc = 0; }
    item.descuento = desc;
    item.subtotal = max - desc;
    actualizarCarrito();
}

/* ============================================================
   CARRITO — ELIMINAR ÍTEM
   ============================================================ */
function eliminarItem(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

/* ============================================================
   CARRITO — RENDERIZAR
   ============================================================ */
function actualizarCarrito() {
    const contenedor = document.getElementById('tablaProductos');
    const emptyMsg   = document.getElementById('emptyCartMsg');
    const totalSpan  = document.getElementById('totalVenta');
    const btnFinalizar = document.getElementById('btnFinalizar');
    const btnTotal   = document.getElementById('btnTotal');
    const countPill  = document.getElementById('cartCountPill');
    const navBadge   = document.getElementById('navBadge');

    contenedor.innerHTML = '';
    totalVenta = 0;

    const moneda = (typeof SHOP_MONEDA !== 'undefined') ? SHOP_MONEDA : '$';
    const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

    if (carrito.length === 0) {
        emptyMsg.style.display = 'flex';
        if (navBadge) navBadge.style.display = 'none';
    } else {
        emptyMsg.style.display = 'none';
        if (navBadge) { navBadge.style.display = 'flex'; navBadge.textContent = totalItems; }
    }

    if (countPill) countPill.textContent = `${totalItems} ítem${totalItems !== 1 ? 's' : ''}`;

    carrito.forEach((item, idx) => {
        totalVenta += item.subtotal;

        const thumb = item.imagen
            ? `<img src="${item.imagen}" class="cart-item-thumb" alt="">`
            : `<div class="cart-item-thumb-placeholder"><i class="bi bi-bag-heart"></i></div>`;

        const html = `
            <div class="cart-item-row">
                ${thumb}
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nombre}</div>
                    <div class="cart-item-price">${moneda} ${item.precio.toFixed(2)} c/u</div>
                    <div class="d-flex align-items-center gap-1 mt-1">
                        <span style="font-size:0.65rem;color:var(--text-muted);">Desc:</span>
                        <input type="number" class="discount-input" value="${item.descuento}"
                               min="0" step="0.50"
                               onchange="actualizarDescuento(${idx}, this.value)">
                    </div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="actualizarCantidad(${idx}, -1)">−</button>
                    <span class="qty-value">${item.cantidad}</span>
                    <button class="qty-btn" onclick="actualizarCantidad(${idx}, 1)">+</button>
                </div>
                <div class="cart-item-subtotal">${moneda} ${item.subtotal.toFixed(2)}</div>
                <i class="bi bi-x-circle cart-item-remove" onclick="eliminarItem(${idx})"></i>
            </div>`;
        contenedor.innerHTML += html;
    });

    totalSpan.textContent = totalVenta.toFixed(2);
    btnFinalizar.disabled = carrito.length === 0;
    if (btnTotal) {
        btnTotal.textContent = carrito.length > 0
            ? `${moneda} ${totalVenta.toFixed(2)} · ${document.querySelector('input[name="metodoPago"]:checked')?.value || 'Efectivo'}`
            : '';
    }
}

/* ============================================================
   PROCESAR VENTA
   ============================================================ */
async function procesarVenta() {
    const clienteId  = document.getElementById('selectCliente').value;
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value || 'Efectivo';
    const moneda     = (typeof SHOP_MONEDA !== 'undefined') ? SHOP_MONEDA : '$';

    if (!clienteId) {
        mostrarToast('⚠️ Selecciona un cliente antes de cobrar', 'warning');
        document.getElementById('selectCliente').focus();
        return;
    }
    if (carrito.length === 0) return;

    if (!confirm(`¿Confirmar venta por ${moneda} ${totalVenta.toFixed(2)} usando ${metodoPago}?`)) return;

    const btnFinalizar = document.getElementById('btnFinalizar');
    btnFinalizar.disabled = true;
    btnFinalizar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

    try {
        const resp = await fetch('/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_id: clienteId,
                tipo_comprobante: 'boleta',
                metodo_pago: metodoPago,
                total: totalVenta,
                items: carrito
            })
        });

        const resultado = await resp.json();

        if (resultado.success) {
            beep(1000, 150);
            mostrarToast('✅ Venta registrada exitosamente', 'success', 1500);
            setTimeout(() => { window.location.href = '/ventas/' + resultado.id; }, 1200);
        } else {
            mostrarToast('Error: ' + resultado.message, 'error');
            beepError();
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = '<i class="bi bi-bag-check-fill me-2"></i>Cobrar Pedido';
        }
    } catch (e) {
        console.error(e);
        mostrarToast('Error de conexión. Inténtalo de nuevo.', 'error');
        beepError();
        btnFinalizar.disabled = false;
        btnFinalizar.innerHTML = '<i class="bi bi-bag-check-fill me-2"></i>Cobrar Pedido';
    }
}

/* ============================================================
   ATAJOS DE TECLADO GLOBALES
   ============================================================ */
document.addEventListener('keydown', function(e) {
    // F9 → Cobrar
    if (e.key === 'F9') {
        e.preventDefault();
        const btn = document.getElementById('btnFinalizar');
        if (!btn.disabled) procesarVenta();
    }
    // F2 → Foco en buscador
    if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('buscadorProducto')?.focus();
    }
    // F3 → Foco en escáner
    if (e.key === 'F3') {
        e.preventDefault();
        document.getElementById('scannerInput')?.focus();
    }
});

/* ============================================================
   ACTUALIZAR SUBTOTAL EN BOTÓN AL CAMBIAR MÉTODO DE PAGO
   ============================================================ */
document.querySelectorAll('input[name="metodoPago"]').forEach(r => {
    r.addEventListener('change', actualizarCarrito);
});

/* ============================================================
   INIT
   ============================================================ */
actualizarCarrito();
// Auto-enfocar escáner si está disponible
document.addEventListener('DOMContentLoaded', () => {
    const scanner = document.getElementById('scannerInput');
    if (scanner) scanner.focus();
});